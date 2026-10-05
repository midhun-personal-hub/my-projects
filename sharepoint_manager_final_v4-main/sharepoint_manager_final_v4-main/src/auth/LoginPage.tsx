import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/msalConfig';
import { Building2, Shield, Lock, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleMsalLogin = async () => {
    setErrorMsg(null);
    setIsLoggingIn(true);
    try {
      const result = await instance.loginPopup(loginRequest);
      if (result?.account) {
        instance.setActiveAccount(result.account);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('MSAL Login Failed:', err);
      setErrorMsg(err?.message || 'Authentication with Microsoft Entra ID failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400 shadow-md">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              SharePoint Management Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Enterprise Control Plane for Corporate SharePoint Lists & Microsoft Graph Services
            </p>
          </div>
        </div>

        {/* Auth Mode Selection */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Microsoft Entra ID (Single Sign-On)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                OAuth 2.0 PKCE
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleMsalLogin}
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              {isLoggingIn ? 'Authenticating with Entra ID...' : 'Sign In with Microsoft Account'}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center border-t border-slate-900">
          <p className="text-[10px] text-slate-500 font-mono">
            Security Mode: Microsoft Graph API OAuth 2.0 PKCE
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
