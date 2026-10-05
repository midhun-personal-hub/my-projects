import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { PageSkeleton } from '../ui/SkeletonLoader';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Enterprise Protected Route Authentication Gate
 * Wraps protected application routes to ensure they are strictly inaccessible to unauthenticated users.
 * Utilizes @azure/msal-react to verify Microsoft Entra ID claims in Live mode,
 * or verifies active user session profile in Demo mode.
 *
 * Renders a full PageSkeleton screen while MSAL is silently determining the login state,
 * preventing flash of unauthenticated content (FOUC).
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
}) => {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, accounts } = useMsal();

  // If MSAL is currently handling redirect/login/token interaction
  if (inProgress !== InteractionStatus.None) {
    return <PageSkeleton />;
  }

  // Authentication comes EXCLUSIVELY from MSAL account session
  const isAllowed = isAuthenticated || accounts.length > 0;

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
