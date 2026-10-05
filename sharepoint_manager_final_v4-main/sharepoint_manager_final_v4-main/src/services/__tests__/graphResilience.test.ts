import { describe, it, expect } from 'vitest';
import {
  GraphDataProvider,
  GraphAuthError,
  GraphPermissionError,
  GraphNotFoundError,
  GraphConflictError,
  GraphThrottleError,
  GraphAPIError,
  GraphNetworkError,
} from '../graphService';

// Helper mock response builder
function createMockResponse(status: number, body: any = {}, headers: Record<string, string> = {}): Response {
  const headerMap = new Headers(headers);
  const textBody = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status <= 299,
    status,
    statusText: `Status ${status}`,
    headers: headerMap,
    text: async () => textBody,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  } as unknown as Response;
}

describe('Graph Client Resilience Verification Suite', () => {
  it('401 Unauthorized - Refreshes token ONCE and retries successfully', async () => {
    let tokenRefreshCalls = 0;
    let fetchCalls = 0;

    const tokenProvider = async (forceRefresh?: boolean) => {
      if (forceRefresh) tokenRefreshCalls++;
      return forceRefresh ? 'new-refreshed-token' : 'initial-expired-token';
    };

    const fetchFn = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      fetchCalls++;
      const authHeader = (init?.headers as Headers)?.get('Authorization');
      if (authHeader === 'Bearer initial-expired-token') {
        return createMockResponse(401, { error: { message: 'Token expired' } });
      }
      if (authHeader === 'Bearer new-refreshed-token') {
        return createMockResponse(200, { value: [{ id: '1', Title: 'Success' }] });
      }
      return createMockResponse(400);
    };

    const provider = new GraphDataProvider({ tokenProvider, fetchFn });
    const res = await provider.fetchWithRetry('https://graph.microsoft.com/v1.0/me');
    const data = await res.json();

    expect(fetchCalls).toBe(2);
    expect(tokenRefreshCalls).toBe(1);
    expect(data.value[0].Title).toBe('Success');
  });

  it('401 Unauthorized - Throws GraphAuthError without infinite looping when refresh fails', async () => {
    let tokenRefreshCalls = 0;
    let fetchCalls = 0;

    const tokenProvider = async (forceRefresh?: boolean) => {
      if (forceRefresh) tokenRefreshCalls++;
      return 'static-invalid-token';
    };

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      return createMockResponse(401, { error: { message: 'Invalid credentials' } });
    };

    const provider = new GraphDataProvider({ tokenProvider, fetchFn });

    await expect(provider.fetchWithRetry('https://graph.microsoft.com/v1.0/me', {}, 3)).rejects.toThrow(GraphAuthError);
    expect(tokenRefreshCalls).toBe(1);
    expect(fetchCalls).toBe(2);
  });

  it('403 Forbidden - Throws GraphPermissionError immediately without retrying', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      return createMockResponse(403, { error: { message: 'Access Denied to SharePoint List' } });
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });

    await expect(provider.fetchWithRetry('https://graph.microsoft.com/v1.0/sites/123', {}, 3)).rejects.toThrow(GraphPermissionError);
    expect(fetchCalls).toBe(1);
  });

  it('404 Not Found - Throws GraphNotFoundError immediately without retrying', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      return createMockResponse(404, { error: { message: 'List item not found' } });
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });

    await expect(provider.fetchWithRetry('https://graph.microsoft.com/v1.0/items/999', {}, 3)).rejects.toThrow(GraphNotFoundError);
    expect(fetchCalls).toBe(1);
  });

  it('409 Conflict - Throws GraphConflictError immediately without retrying', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      return createMockResponse(409, { error: { message: 'ETag concurrency conflict' } });
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });

    await expect(provider.fetchWithRetry('https://graph.microsoft.com/v1.0/items/1', {}, 3)).rejects.toThrow(GraphConflictError);
    expect(fetchCalls).toBe(1);
  });

  it('429 Throttle - Respects Retry-After header and retries successfully', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      if (fetchCalls === 1) {
        return createMockResponse(429, { error: { message: 'Rate limit exceeded' } }, { 'Retry-After': '1' });
      }
      return createMockResponse(200, { success: true });
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });
    const res = await provider.fetchWithRetry('https://graph.microsoft.com/v1.0/lists', {}, 3);
    const data = await res.json();

    expect(fetchCalls).toBe(2);
    expect(data.success).toBe(true);
  });

  it('429 Throttle - Throws GraphThrottleError after maxRetries exhausted', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      return createMockResponse(429, { error: { message: 'Too Many Requests' } }, { 'Retry-After': '1' });
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });

    await expect(provider.fetchWithRetry('https://graph.microsoft.com/v1.0/lists', {}, 3)).rejects.toThrow(GraphThrottleError);
    expect(fetchCalls).toBe(3);
  });

  it('5xx Server Error - Retries 502/503 with bounded backoff and succeeds', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      if (fetchCalls === 1) return createMockResponse(502, { error: { message: 'Bad Gateway' } });
      if (fetchCalls === 2) return createMockResponse(503, { error: { message: 'Service Unavailable' } });
      return createMockResponse(200, { ok: true });
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });
    const res = await provider.fetchWithRetry('https://graph.microsoft.com/v1.0/lists', {}, 3);
    const data = await res.json();

    expect(fetchCalls).toBe(3);
    expect(data.ok).toBe(true);
  });

  it('5xx Server Error - Throws GraphAPIError after maxRetries reached', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      return createMockResponse(500, { error: { message: 'Internal Server Error' } });
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });

    await expect(provider.fetchWithRetry('https://graph.microsoft.com/v1.0/lists', {}, 3)).rejects.toThrow(GraphAPIError);
    expect(fetchCalls).toBe(3);
  });

  it('Network Failure - Retries fetch exceptions and recovers on 2nd attempt', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      if (fetchCalls === 1) {
        throw new TypeError('Failed to fetch (net::ERR_INTERNET_DISCONNECTED)');
      }
      return createMockResponse(200, { networkRecovered: true });
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });
    const res = await provider.fetchWithRetry('https://graph.microsoft.com/v1.0/lists', {}, 3);
    const data = await res.json();

    expect(fetchCalls).toBe(2);
    expect(data.networkRecovered).toBe(true);
  });

  it('Network Failure - Throws GraphNetworkError when network stays offline', async () => {
    let fetchCalls = 0;

    const fetchFn = async (): Promise<Response> => {
      fetchCalls++;
      throw new TypeError('Network error');
    };

    const provider = new GraphDataProvider({ tokenProvider: async () => 'valid-token', fetchFn });

    await expect(provider.fetchWithRetry('https://graph.microsoft.com/v1.0/lists', {}, 3)).rejects.toThrow(GraphNetworkError);
    expect(fetchCalls).toBe(3);
  });
});
