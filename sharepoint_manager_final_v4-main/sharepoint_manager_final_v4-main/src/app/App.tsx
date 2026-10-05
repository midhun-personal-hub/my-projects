/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance, msalValidation } from '../config/msalConfig';
import { AuthorizationProvider } from '../auth/AuthorizationContext';
import { router } from './router';
import { ShieldAlert } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  const isProd = Boolean(import.meta.env?.PROD || import.meta.env?.MODE === 'production');

  if (isProd && !msalValidation.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-2xl p-8 shadow-enterprise space-y-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-red-400">Application configuration error</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            {msalValidation.errorMessage || 'Required Microsoft Entra ID environment variables are missing or invalid.'}
          </p>
          <div className="text-left text-[11px] font-mono bg-slate-950 border border-slate-800 p-3 rounded-lg text-slate-400 space-y-1">
            <div>VITE_ENTRA_CLIENT_ID</div>
            <div>VITE_ENTRA_TENANT_ID</div>
            <div>VITE_ENTRA_REDIRECT_URI</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <AuthorizationProvider>
          <RouterProvider router={router} />
        </AuthorizationProvider>
      </QueryClientProvider>
    </MsalProvider>
  );
}

export default App;
