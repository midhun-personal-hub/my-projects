import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { msalInstance, graphScopes } from './config/msalConfig';

msalInstance.initialize().then(async () => {
  try {
    await msalInstance.handleRedirectPromise();
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    } else {
      // In memory mode, attempt silent session recovery via Entra ID SSO iframe
      try {
        const ssoResult = await msalInstance.ssoSilent({
          scopes: graphScopes.scopes,
        });
        if (ssoResult?.account) {
          msalInstance.setActiveAccount(ssoResult.account);
        }
      } catch (ssoErr) {
        console.warn("Silent SSO session recovery failed on reload:", ssoErr);
      }
    }
  } catch (err) {
    console.error("MSAL Redirect/State handling error:", err);
  } finally {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}).catch((err) => {
  console.error("MSAL Initialization failed:", err);
});
