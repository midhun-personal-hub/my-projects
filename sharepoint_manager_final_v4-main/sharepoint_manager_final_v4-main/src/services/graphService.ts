// ==============================================================================
// DIRECT-TO-GRAPH SHAREPOINT SERVICE LAYER
// ==============================================================================
// Interacts directly with Microsoft Graph API using delegated OAuth tokens.
// Features: Resilient 429 rate limit parsing, exponential backoff retries,
// 401 auto token refresh, client-request-id header tracking, and strict
// production error propagation (no silent mock fallbacks).
// ==============================================================================

import { graphScopes, msalInstance } from '../config/msalConfig';
import { PersonUser, SharePointColumnDefinition, SharePointListItem } from '../types';
import { DataProvider, DataQueryOptions } from './dataProvider';

/**
 * Custom Error classes for Graph API resilience
 */
export class GraphAPIError extends Error {
  public status: number;
  public code?: string;
  public details?: string;

  constructor(status: number, message: string, code?: string, details?: string) {
    super(message);
    this.name = 'GraphAPIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class GraphAuthError extends GraphAPIError {
  constructor(message: string = 'Authentication failed (401)', details?: string) {
    super(401, message, 'AUTHENTICATION_FAILED', details);
    this.name = 'GraphAuthError';
  }
}

export class GraphPermissionError extends GraphAPIError {
  constructor(message: string = 'Access denied / Insufficient permissions (403)', details?: string) {
    super(403, message, 'PERMISSION_DENIED', details);
    this.name = 'GraphPermissionError';
  }
}

export class GraphNotFoundError extends GraphAPIError {
  constructor(message: string = 'Resource not found (404)', details?: string) {
    super(404, message, 'NOT_FOUND', details);
    this.name = 'GraphNotFoundError';
  }
}

export class GraphConflictError extends GraphAPIError {
  constructor(message: string = 'Resource conflict (409)', details?: string) {
    super(409, message, 'CONFLICT', details);
    this.name = 'GraphConflictError';
  }
}

export class GraphThrottleError extends GraphAPIError {
  public retryAfterSeconds?: number;
  constructor(message: string = 'Request throttled (429)', retryAfterSeconds?: number, details?: string) {
    super(429, message, 'THROTTLED', details);
    this.name = 'GraphThrottleError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class GraphNetworkError extends Error {
  public originalError?: Error;
  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'GraphNetworkError';
    this.originalError = originalError;
  }
}

/**
 * Escapes OData single quotes in string literals to prevent OData syntax errors or injection.
 * Example: "O'Connor" -> "O''Connor"
 */
export function escapeODataString(input: string): string {
  if (!input) return '';
  return input.replace(/'/g, "''").replace(/[\x00-\x1F\x7F]/g, '');
}

export interface GraphDataProviderOptions {
  tokenProvider?: (forceRefresh?: boolean) => Promise<string | null>;
  fetchFn?: typeof fetch;
}

export class GraphDataProvider implements DataProvider {
  private tokenProvider?: (forceRefresh?: boolean) => Promise<string | null>;
  private fetchFn: typeof fetch;

  constructor(options?: GraphDataProviderOptions) {
    this.tokenProvider = options?.tokenProvider;
    this.fetchFn = options?.fetchFn || globalThis.fetch.bind(globalThis);
  }

  private async getAccessToken(forceRefresh = false): Promise<string | null> {
    if (this.tokenProvider) {
      return this.tokenProvider(forceRefresh);
    }

    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!account) return null;

    try {
      const response = await msalInstance.acquireTokenSilent({
        account,
        scopes: graphScopes.scopes,
        forceRefresh,
      });
      return response.accessToken;
    } catch (error) {
      console.warn('Silent token acquisition failed in GraphDataProvider:', error);
      return null;
    }
  }

  private async safeExtractErrorText(res: Response): Promise<string> {
    try {
      const text = await res.text();
      if (!text) return `HTTP ${res.status} ${res.statusText}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed.error && parsed.error.message) {
          return parsed.error.message;
        }
      } catch {
        // Not JSON
      }
      return text.substring(0, 300);
    } catch {
      return `HTTP ${res.status} ${res.statusText}`;
    }
  }

  /**
   * Resilient HTTP Fetcher with bounded exponential backoff, 429 Retry-After parsing,
   * single 401 token auto-refresh, and structured error handling for 403, 404, 409, 5xx, and network drops.
   */
  public async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries = 3
  ): Promise<Response> {
    let token = await this.getAccessToken();
    if (!token) {
      throw new GraphAuthError('Authentication required. No valid Microsoft Entra ID access token available.');
    }

    let attempt = 0;
    let tokenRefreshed = false;

    while (attempt < maxRetries) {
      attempt++;
      const reqHeaders = new Headers(options.headers || {});
      reqHeaders.set('Authorization', `Bearer ${token}`);
      if (!reqHeaders.has('client-request-id')) {
        reqHeaders.set('client-request-id', `spm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
      }

      let response: Response;
      try {
        response = await this.fetchFn(url, { ...options, headers: reqHeaders });
      } catch (err: any) {
        // Network failure (e.g. fetch throws TypeError/offline)
        if (attempt < maxRetries) {
          const backoffMs = Math.min(Math.pow(2, attempt) * 100, 2000);
          console.warn(`[Graph API Network Failure] Retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries}):`, err);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        throw new GraphNetworkError(
          `Microsoft Graph API network failure after ${maxRetries} attempt(s): ${err.message || String(err)}`,
          err
        );
      }

      if (response.ok) {
        return response;
      }

      const status = response.status;

      // 1. 401 Unauthorized
      if (status === 401) {
        if (!tokenRefreshed && attempt < maxRetries) {
          tokenRefreshed = true;
          const newToken = await this.getAccessToken(true);
          if (newToken) {
            token = newToken;
            continue;
          }
        }
        const errorText = await this.safeExtractErrorText(response);
        throw new GraphAuthError(`Microsoft Graph API Authentication Error (401): ${errorText}`, errorText);
      }

      // 2. 403 Forbidden
      if (status === 403) {
        const errorText = await this.safeExtractErrorText(response);
        throw new GraphPermissionError(`Microsoft Graph API Permission Denied (403): ${errorText}`, errorText);
      }

      // 3. 404 Not Found
      if (status === 404) {
        const errorText = await this.safeExtractErrorText(response);
        throw new GraphNotFoundError(`Microsoft Graph API Resource Not Found (404): ${errorText}`, errorText);
      }

      // 4. 409 Conflict
      if (status === 409) {
        const errorText = await this.safeExtractErrorText(response);
        throw new GraphConflictError(`Microsoft Graph API Resource Conflict (409): ${errorText}`, errorText);
      }

      // 5. 429 Throttle / Rate Limit
      if (status === 429) {
        const retryAfterHeader = response.headers ? response.headers.get('Retry-After') : null;
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1;
        const validRetrySec = !isNaN(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec : 1;

        if (attempt < maxRetries) {
          const delayMs = Math.min(validRetrySec * 1000, 5000);
          console.warn(`[Graph API 429 Throttle] Retrying after ${validRetrySec}s (attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        const errorText = await this.safeExtractErrorText(response);
        throw new GraphThrottleError(
          `Microsoft Graph API Rate Limit Exceeded (429) after ${maxRetries} attempt(s): ${errorText}`,
          validRetrySec,
          errorText
        );
      }

      // 6. 5xx Server Errors (500, 502, 503, 504, etc.)
      if (status >= 500 && status <= 599) {
        if (attempt < maxRetries) {
          const backoffMs = Math.min(Math.pow(2, attempt) * 100, 2000);
          console.warn(`[Graph API ${status} Server Error] Retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        const errorText = await this.safeExtractErrorText(response);
        throw new GraphAPIError(
          status,
          `Microsoft Graph API Server Error (${status}) after ${maxRetries} attempt(s): ${errorText}`,
          'SERVER_ERROR',
          errorText
        );
      }

      // 7. Other client errors (400, etc.)
      const errorText = await this.safeExtractErrorText(response);
      throw new GraphAPIError(status, `Microsoft Graph API Error (${status}): ${errorText}`, 'CLIENT_ERROR', errorText);
    }

    throw new GraphAPIError(500, `Microsoft Graph API request failed after maximum ${maxRetries} retry attempt(s).`);
  }

  /**
   * Reads SharePoint List Column Schema Metadata
   */
  async getListColumns(siteId: string, listId: string): Promise<SharePointColumnDefinition[]> {
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/columns`;
    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API Column Schema error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return (data.value || []).map((col: any) => ({
      id: col.id,
      name: col.name,
      displayName: col.displayName,
      type: this.mapGraphTypeToColumnType(col),
      required: col.required || false,
      readOnly: col.readOnly || false,
      choices: col.choice ? col.choice.choices : undefined,
    }));
  }

  /**
   * Fetches List Items with expanded fields, supporting server-side pagination, sorting, search, and filtering
   */
  async getListItems(
    siteId: string,
    listId: string,
    options?: DataQueryOptions
  ): Promise<{ items: SharePointListItem[]; nextLink?: string; totalItems?: number }> {
    const top = options?.top ?? 10;
    const skipToken = options?.skipToken;
    const filter = options?.filter;
    const searchTerm = options?.searchTerm;
    const searchColumns = options?.searchColumns;
    const selectColumns = options?.selectColumns;
    const sortColumn = options?.sortColumn;
    const sortDirection = options?.sortDirection || 'asc';

    // If skipToken is a full URL (@odata.nextLink), fetch it directly
    if (skipToken && skipToken.startsWith('http')) {
      const response = await this.fetchWithRetry(skipToken, {
        headers: {
          'Prefer': 'honor-nonindexed-queries-if-retry-or-fallback',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Graph API List Items error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const items = (data.value || []).map((item: any) => ({
        id: item.id,
        created: item.createdDateTime,
        createdBy: item.createdBy?.user
          ? {
              displayName: item.createdBy.user.displayName,
              email: item.createdBy.user.email || item.createdBy.user.userPrincipalName,
            }
          : undefined,
        modified: item.lastModifiedDateTime,
        fields: item.fields || {},
      }));

      return {
        items,
        nextLink: data['@odata.nextLink'] || undefined,
        totalItems: data['@odata.count'] !== undefined ? data['@odata.count'] : undefined,
      };
    }

    // Build query string parameters
    const queryParams: string[] = [];

    // 1. $top
    queryParams.push(`$top=${top}`);

    // 2. $select and $expand
    queryParams.push(`$select=id,createdDateTime,lastModifiedDateTime,createdBy,fields`);
    if (selectColumns && selectColumns.length > 0) {
      const fieldsSelect = selectColumns.filter((c) => c && c !== 'id' && c !== 'ID').join(',');
      queryParams.push(`$expand=fields($select=${fieldsSelect})`);
    } else {
      queryParams.push(`$expand=fields`);
    }

    // 3. $filter and searchTerm escaping
    let combinedFilter: string | undefined = undefined;

    if (filter && filter.trim()) {
      combinedFilter = filter.trim();
    }

    if (searchTerm && searchTerm.trim()) {
      const sanitized = escapeODataString(searchTerm.trim());
      if (sanitized) {
        const colsToSearch =
          searchColumns && searchColumns.length > 0
            ? searchColumns.filter((c) => c && c !== 'id' && c !== 'ID' && !c.startsWith('_'))
            : ['Title'];

        const clauses = colsToSearch.slice(0, 5).map((col) => `startswith(fields/${col}, '${sanitized}')`);
        const searchExpr = clauses.length === 1 ? clauses[0] : `(${clauses.join(' or ')})`;

        if (combinedFilter) {
          combinedFilter = `(${combinedFilter}) and (${searchExpr})`;
        } else {
          combinedFilter = searchExpr;
        }
      }
    }

    if (combinedFilter) {
      queryParams.push(`$filter=${encodeURIComponent(combinedFilter)}`);
    }

    // 4. $orderby
    if (sortColumn) {
      let sortField = `fields/${sortColumn}`;
      if (sortColumn === 'id' || sortColumn === 'ID') sortField = 'id';
      else if (sortColumn === 'created' || sortColumn === 'createdDateTime') sortField = 'createdDateTime';
      else if (sortColumn === 'modified' || sortColumn === 'lastModifiedDateTime') sortField = 'lastModifiedDateTime';

      queryParams.push(`$orderby=${encodeURIComponent(`${sortField} ${sortDirection}`)}`);
    }

    // 5. $skiptoken
    if (skipToken && !skipToken.startsWith('http')) {
      queryParams.push(`$skiptoken=${encodeURIComponent(skipToken)}`);
    }

    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?${queryParams.join('&')}`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        Prefer: 'honor-nonindexed-queries-if-retry-or-fallback',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API List Items error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const items = (data.value || []).map((item: any) => ({
      id: item.id,
      created: item.createdDateTime,
      createdBy: item.createdBy?.user
        ? {
            displayName: item.createdBy.user.displayName,
            email: item.createdBy.user.email || item.createdBy.user.userPrincipalName,
          }
        : undefined,
      modified: item.lastModifiedDateTime,
      fields: item.fields || {},
    }));

    return {
      items,
      nextLink: data['@odata.nextLink'] || undefined,
      totalItems: data['@odata.count'] !== undefined ? data['@odata.count'] : undefined,
    };
  }

  /**
   * Fetches a single SharePoint List Item by ID
   */
  async getListItem(siteId: string, listId: string, itemId: string): Promise<SharePointListItem> {
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}?expand=fields`;
    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API Fetch Item error (${response.status}): ${errorText}`);
    }

    const item = await response.json();
    return {
      id: item.id,
      created: item.createdDateTime,
      createdBy: item.createdBy?.user
        ? {
            displayName: item.createdBy.user.displayName,
            email: item.createdBy.user.email || item.createdBy.user.userPrincipalName,
          }
        : undefined,
      modified: item.lastModifiedDateTime,
      fields: item.fields || {},
    };
  }

  /**
   * Creates a new SharePoint List Item
   */
  async createListItem(siteId: string, listId: string, fields: Record<string, any>): Promise<SharePointListItem> {
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API Create Item error (${response.status}): ${errorText}`);
    }

    const item = await response.json();
    return {
      id: item.id,
      created: item.createdDateTime,
      fields: item.fields || fields,
    };
  }

  /**
   * Updates an existing SharePoint List Item
   */
  async updateListItem(
    siteId: string,
    listId: string,
    itemId: string,
    fields: Record<string, any>
  ): Promise<SharePointListItem> {
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`;
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fields),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API Update Item error (${response.status}): ${errorText}`);
    }

    const updatedFields = await response.json();
    return {
      id: itemId,
      modified: new Date().toISOString(),
      fields: updatedFields,
    };
  }

  /**
   * Deletes a SharePoint List Item
   */
  async deleteListItem(siteId: string, listId: string, itemId: string): Promise<boolean> {
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}`;
    const response = await this.fetchWithRetry(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API Delete Item error (${response.status}): ${errorText}`);
    }

    return true;
  }

  /**
   * Dedicated lookup options query utilizing server-side OData filtering.
   * Eliminates arbitrary un-filtered client-side top-N fallback.
   */
  async getLookupOptions(
    siteId: string,
    listId: string,
    displayField: string = 'Title',
    query?: string
  ): Promise<{ id: string; value: string }[]> {
    const cleanField = encodeURIComponent(displayField);
    const trimmedQuery = query?.trim() || '';

    let filterParam = '';
    if (trimmedQuery) {
      const escapedQuery = escapeODataString(trimmedQuery);
      filterParam = `&$filter=startswith(fields/${cleanField},'${escapedQuery}') or startswith(fields/Title,'${escapedQuery}')`;
    }

    const topLimit = trimmedQuery ? 25 : 50;
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$select=id,fields&$expand=fields($select=Id,${cleanField},Title)${filterParam}&$top=${topLimit}`;

    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      const errorText = await response.text();
      if (trimmedQuery) {
        throw new Error(`Server-side lookup filtering on field "${displayField}" failed (${response.status}). Ensure column is indexed in SharePoint list settings.`);
      }
      throw new Error(`Graph API Lookup Options error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const items = (data.value || []).map((item: any) => {
      const fields = item.fields || {};
      const val = fields[displayField] || fields.Title || item.id;
      return {
        id: String(item.id),
        value: String(val),
      };
    });

    return items;
  }

  /**
   * Searches Microsoft Entra ID users using Microsoft Graph API /v1.0/users.
   * Limits results to small result set ($top=10) and selects only required fields:
   * id, displayName, userPrincipalName, mail.
   */
  async searchUsers(query: string): Promise<PersonUser[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const cleanTerm = escapeODataString(query.trim());
    const url = `https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'${cleanTerm}') or startswith(mail,'${cleanTerm}') or startswith(userPrincipalName,'${cleanTerm}')&$select=id,displayName,userPrincipalName,mail&$top=10`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        ConsistencyLevel: 'eventual',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API User Search error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return (data.value || []).map((u: any) => {
      const email = u.mail || u.userPrincipalName || '';
      return {
        id: u.id,
        displayName: u.displayName || email || u.id,
        email: email,
        userPrincipalName: u.userPrincipalName || email,
        Claims: `i:0#.f|membership|${email.toLowerCase()}`,
      };
    });
  }

  private mapGraphTypeToColumnType(col: any): any {
    if (col.choice) return 'Choice';
    if (col.number) return 'Number';
    if (col.currency) return 'Currency';
    if (col.dateTime) return 'DateTime';
    if (col.boolean) return 'Boolean';
    if (col.personOrGroup) return 'Person';
    if (col.lookup) return 'Lookup';
    if (col.text && col.text.allowMultipleLines) return 'Note';
    return 'Text';
  }
}

export const graphService: DataProvider = new GraphDataProvider();
