// ==============================================================================
// SHAREPOINT-BACKED AUDIT LOGGING SERVICE
// ==============================================================================
// Persists system and CRUD audit logs directly to SharePoint App_AuditLogs list
// via Microsoft Graph API. Ensures non-repudiation, real user identity tracking,
// bulk operation aggregation, and sensitive credential sanitization.
// ==============================================================================

import { graphService } from './graphService';
import { AuditLog, UserProfile } from '../types';
import { msalInstance } from '../config/msalConfig';

export const LIST_APP_AUDIT_LOGS = 'App_AuditLogs';
export const AUDIT_SITE_ID = 'root';

export interface AuditRecordPayload {
  timestamp?: string;
  userId?: string;
  userDisplayName?: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'CONFIG_CHANGE' | 'BULK_CREATE' | 'BULK_UPDATE' | 'BULK_DELETE';
  workspaceId?: string;
  workspaceName?: string;
  menuId?: string;
  menuName?: string;
  listId?: string;
  itemId?: string;
  result: 'SUCCESS' | 'FAILED';
  errorCode?: string;
  correlationId?: string;
  itemCount?: number;
  successCount?: number;
  failureCount?: number;
  changedFields?: Record<string, any> | string;
  details: string;
}

/**
 * Sanitizes payloads to ensure sensitive tokens, passwords, and secrets are NEVER logged.
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return '';
  if (typeof data === 'string') {
    // Redact tokens or authorization headers in raw strings
    return data
      .replace(/(bearer|token|password|secret|authorization|auth|credential)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
      .substring(0, 3000);
  }
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.slice(0, 50).map(sanitizeLogData);
    }
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (/token|password|secret|authorization|auth|credential|access_token|refresh_token/i.test(key)) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = sanitizeLogData(value);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Resolves real authenticated user identity from active MSAL session or current store state
 */
export function resolveAuthenticatedUser(currentUser?: UserProfile): { id: string; name: string; email: string } {
  // Check MSAL active account first for authentic Entra ID identity
  try {
    const activeAccount = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (activeAccount) {
      return {
        id: activeAccount.homeAccountId || activeAccount.localAccountId || currentUser?.id || 'entra-user',
        name: activeAccount.name || currentUser?.displayName || activeAccount.username || 'Authenticated User',
        email: activeAccount.username || currentUser?.email || '',
      };
    }
  } catch (err) {
    console.warn('Could not read MSAL active account for audit log identity:', err);
  }

  // Fallback to store currentUser if valid
  if (currentUser && currentUser.id !== 'anonymous' && currentUser.displayName) {
    return {
      id: currentUser.id,
      name: currentUser.displayName,
      email: currentUser.email || '',
    };
  }

  return {
    id: currentUser?.id || 'anonymous-user',
    name: currentUser?.displayName || 'Anonymous User',
    email: currentUser?.email || '',
  };
}

/**
 * Maps AuditRecordPayload to SharePoint List fields payload
 */
export function mapAuditToFields(payload: AuditRecordPayload, realUser: { id: string; name: string }): Record<string, any> {
  const sanitizedChangedFields = typeof payload.changedFields === 'object'
    ? JSON.stringify(sanitizeLogData(payload.changedFields))
    : sanitizeLogData(payload.changedFields || '');

  const sanitizedDetails = sanitizeLogData(payload.details || '');

  return {
    Title: `${payload.operation} - ${payload.correlationId || Date.now()}`,
    Timestamp: payload.timestamp || new Date().toISOString(),
    UserId: realUser.id,
    UserDisplayName: realUser.name,
    Operation: payload.operation,
    WorkspaceId: payload.workspaceId || payload.workspaceName || '',
    MenuId: payload.menuId || payload.menuName || '',
    ListId: payload.listId || '',
    ItemId: payload.itemId || '',
    Result: payload.result,
    ErrorCode: sanitizeLogData(payload.errorCode || ''),
    CorrelationId: payload.correlationId || `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ItemCount: payload.itemCount || 1,
    SuccessCount: payload.successCount ?? (payload.result === 'SUCCESS' ? 1 : 0),
    FailureCount: payload.failureCount ?? (payload.result === 'FAILED' ? 1 : 0),
    ChangedFields: sanitizedChangedFields,
    Details: sanitizedDetails,
  };
}

/**
 * Maps SharePoint list item back to AuditLog model for UI
 */
export function mapItemToAuditLog(item: { id: string; created?: string; fields: Record<string, any> }): AuditLog {
  const f = item.fields || {};
  const actionRaw = String(f.Operation || 'UPDATE').toUpperCase();
  const validAction: AuditLog['action'] = [
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'CONFIG_CHANGE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE'
  ].includes(actionRaw)
    ? (actionRaw as AuditLog['action'])
    : 'UPDATE';

  return {
    id: item.id || String(f.Title || Date.now()),
    timestamp: String(f.Timestamp || item.created || new Date().toISOString()),
    userId: String(f.UserId || 'unknown'),
    userName: String(f.UserDisplayName || 'Unknown User'),
    action: validAction,
    workspaceName: String(f.WorkspaceId || ''),
    menuName: String(f.MenuId || ''),
    listId: String(f.ListId || ''),
    itemId: String(f.ItemId || ''),
    result: f.Result === 'FAILED' ? 'FAILED' : 'SUCCESS',
    errorCode: f.ErrorCode ? String(f.ErrorCode) : undefined,
    correlationId: String(f.CorrelationId || ''),
    itemCount: Number(f.ItemCount || 1),
    successCount: Number(f.SuccessCount || 1),
    failureCount: Number(f.FailureCount || 0),
    changedFields: f.ChangedFields ? String(f.ChangedFields) : undefined,
    details: String(f.Details || f.Title || 'Audit Log Record'),
    auditPersisted: true,
  };
}

export const auditService = {
  /**
   * Persists an audit log record directly to SharePoint App_AuditLogs list.
   * If writing to SharePoint fails, returns { success: false, error } without throwing,
   * preserving main CRUD operation success behavior.
   */
  async logAuditRecord(
    payload: AuditRecordPayload,
    currentUser?: UserProfile,
    siteId: string = AUDIT_SITE_ID
  ): Promise<{ success: boolean; error?: string; auditLog: AuditLog }> {
    const realUser = resolveAuthenticatedUser(currentUser);
    const correlationId = payload.correlationId || `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullPayload = { ...payload, correlationId };
    const fields = mapAuditToFields(fullPayload, realUser);

    const localAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: fields.Timestamp,
      userId: realUser.id,
      userName: realUser.name,
      action: payload.operation,
      workspaceId: payload.workspaceId,
      workspaceName: payload.workspaceName,
      menuId: payload.menuId,
      menuName: payload.menuName,
      listId: payload.listId,
      itemId: payload.itemId,
      result: payload.result,
      errorCode: payload.errorCode,
      correlationId: correlationId,
      itemCount: payload.itemCount || 1,
      successCount: payload.successCount ?? (payload.result === 'SUCCESS' ? 1 : 0),
      failureCount: payload.failureCount ?? (payload.result === 'FAILED' ? 1 : 0),
      changedFields: typeof payload.changedFields === 'object' ? JSON.stringify(payload.changedFields) : payload.changedFields,
      details: payload.details,
      auditPersisted: false,
    };

    try {
      const createdItem = await graphService.createListItem(siteId, LIST_APP_AUDIT_LOGS, fields);
      localAuditLog.id = createdItem.id;
      localAuditLog.auditPersisted = true;
      return { success: true, auditLog: localAuditLog };
    } catch (err: any) {
      console.warn(`[Audit Log Persistence Failure] Could not write to SharePoint list "${LIST_APP_AUDIT_LOGS}":`, err);
      return {
        success: false,
        error: err.message || 'SharePoint audit list creation failed',
        auditLog: localAuditLog,
      };
    }
  },

  /**
   * Fetches persistent audit logs directly from SharePoint App_AuditLogs list
   */
  async fetchAuditLogs(siteId: string = AUDIT_SITE_ID): Promise<AuditLog[]> {
    try {
      const res = await graphService.getListItems(siteId, LIST_APP_AUDIT_LOGS, { top: 100 });
      if (res.items && res.items.length > 0) {
        return res.items.map(mapItemToAuditLog);
      }
    } catch (err: any) {
      console.warn('Could not fetch audit logs from SharePoint App_AuditLogs:', err);
    }
    return [];
  },
};
