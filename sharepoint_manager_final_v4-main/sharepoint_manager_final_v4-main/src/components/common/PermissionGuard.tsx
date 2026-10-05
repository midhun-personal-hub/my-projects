import React from 'react';
import { Outlet } from 'react-router-dom';
import { UserRole } from '../../types';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { Permission } from '../../security/permissions';
import { useAuthorization } from '../../auth/AuthorizationContext';

interface PermissionGuardProps {
  requiredRole?: UserRole;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Role & Permission Authorization Gate Wrapper
 * Evaluates active user context against required roles or granular permission matrices.
 * NOTE: Frontend permission checks improve UX and are not a substitute for SharePoint authorization.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredRole,
  requiredPermission,
  fallback,
  children,
}) => {
  const auth = useAuthorization();

  if (auth.loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/40 min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mb-2" />
        <p className="text-xs text-slate-500">Resolving user authorization...</p>
      </div>
    );
  }

  const userRole = auth.role || 'Unassigned Role';

  let isAuthorized = true;

  if (requiredRole) {
    if (requiredRole === 'Administrator') {
      isAuthorized = auth.isAdministrator;
    } else if (requiredRole === 'Manager') {
      isAuthorized = auth.isAdministrator || auth.role === 'Manager';
    } else if (requiredRole === 'Employee') {
      isAuthorized = Boolean(auth.role);
    }
  }

  if (isAuthorized && requiredPermission) {
    isAuthorized = auth.hasPermission(requiredPermission);
  }

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/40 min-h-[400px]">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-enterprise space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-center justify-center mx-auto text-red-600 dark:text-red-400 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Access Restricted
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your assigned role (<strong className="text-slate-700 dark:text-slate-300">{userRole}</strong>) does not have authorization to view or manage this route.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

