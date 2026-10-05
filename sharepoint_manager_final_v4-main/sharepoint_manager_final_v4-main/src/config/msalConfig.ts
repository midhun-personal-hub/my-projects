// ==============================================================================
// MICROSOFT ENTRA ID (AZURE AD) MSAL AUTHENTICATION CONFIGURATION
// ==============================================================================
// Strict Security Notice:
// - Uses OAuth 2.0 Authorization Code Flow with PKCE.
// - Tokens are cached securely using MSAL's built-in memory/session mechanics.
// - No client secrets exist in client code.
// ==============================================================================

import { Configuration, PopupRequest, PublicClientApplication } from '@azure/msal-browser';

export interface MsalConfigValidation {
  isValid: boolean;
  errorMessage?: string;
  clientId: string;
  tenantId: string;
  redirectUri: string;
}

export function validateMsalConfiguration(): MsalConfigValidation {
  const isProd = Boolean(import.meta.env?.PROD || import.meta.env?.MODE === 'production');
  const rawClientId = (import.meta as any).env?.VITE_ENTRA_CLIENT_ID;
  const rawTenantId = (import.meta as any).env?.VITE_ENTRA_TENANT_ID;
  const rawRedirectUri = (import.meta as any).env?.VITE_ENTRA_REDIRECT_URI;

  const isDummyClientId = !rawClientId || rawClientId === '00000000-0000-0000-0000-000000000000';
  const isMissingTenant = !rawTenantId;
  const isMissingRedirect = !rawRedirectUri;

  if (isProd) {
    if (isDummyClientId) {
      return {
        isValid: false,
        errorMessage: 'Application configuration error: VITE_ENTRA_CLIENT_ID is missing or set to placeholder in production.',
        clientId: '',
        tenantId: '',
        redirectUri: '',
      };
    }
    if (isMissingTenant) {
      return {
        isValid: false,
        errorMessage: 'Application configuration error: VITE_ENTRA_TENANT_ID is missing in production.',
        clientId: rawClientId,
        tenantId: '',
        redirectUri: '',
      };
    }
    if (isMissingRedirect) {
      return {
        isValid: false,
        errorMessage: 'Application configuration error: VITE_ENTRA_REDIRECT_URI is missing in production.',
        clientId: rawClientId,
        tenantId: rawTenantId,
        redirectUri: '',
      };
    }
    return {
      isValid: true,
      clientId: rawClientId,
      tenantId: rawTenantId,
      redirectUri: rawRedirectUri,
    };
  }

  // Development environment fallback
  const clientId = rawClientId || '00000000-0000-0000-0000-000000000000';
  const tenantId = rawTenantId || 'common';
  const redirectUri = rawRedirectUri || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  const isValid = !isDummyClientId;

  return {
    isValid,
    errorMessage: isValid ? undefined : 'Application configuration error: VITE_ENTRA_CLIENT_ID environment variable is missing.',
    clientId,
    tenantId,
    redirectUri,
  };
}

export const msalValidation = validateMsalConfiguration();

export const msalConfig: Configuration = {
  auth: {
    clientId: msalValidation.clientId,
    authority: `https://login.microsoftonline.com/${msalValidation.tenantId || 'common'}`,
    redirectUri: msalValidation.redirectUri,
    postLogoutRedirectUri: msalValidation.redirectUri,
  },
  cache: {
    cacheLocation: 'memoryStorage',
  },
};

export const graphScopes = {
  scopes: [
    'User.Read',
    'Sites.Read.All',
    'Sites.ReadWrite.All',
    'Directory.Read.All',
  ],
};

export const loginRequest: PopupRequest = {
  scopes: graphScopes.scopes,
};

export const msalInstance = new PublicClientApplication(msalConfig);
