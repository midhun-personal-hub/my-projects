import { useCallback } from 'react';
import { msalInstance, graphScopes } from '../config/msalConfig';

/**
 * Enterprise Authentication Hook
 *
 * Provides silent token acquisition for Microsoft Graph API requests.
 */
export function useAuth() {
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];

    if (!account) {
      return null;
    }

    try {
      const response = await msalInstance.acquireTokenSilent({
        account,
        scopes: graphScopes.scopes,
      });
      return response.accessToken;
    } catch (error) {
      console.warn('Silent token acquisition failed in useAuth:', error);
      return null;
    }
  }, []);

  const activeAccount = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];

  return {
    getAccessToken,
    account: activeAccount,
    isAuthenticated: Boolean(activeAccount),
  };
}
