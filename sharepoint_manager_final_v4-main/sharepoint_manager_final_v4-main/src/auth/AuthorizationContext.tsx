import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { UserRole } from '../types';
import { Permission, ROLE_PERMISSIONS } from '../security/permissions';
import { configService } from '../services/configService';

export interface AuthorizationState {
  loading: boolean;
  resolved: boolean;
  userEmail: string | null;
  role: UserRole | null;
  permissions: Permission[];
  isAdministrator: boolean;
  error?: string | null;
}

export interface AuthorizationContextValue extends AuthorizationState {
  hasPermission: (permission: Permission) => boolean;
  canRead: () => boolean;
  canCreate: () => boolean;
  canUpdate: () => boolean;
  canDelete: () => boolean;
  canBulkEdit: () => boolean;
  canConfigure: () => boolean;
}

const AuthorizationContext = createContext<AuthorizationContextValue | null>(null);

export const AuthorizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accounts } = useMsal();
  const [authState, setAuthState] = useState<AuthorizationState>({
    loading: true,
    resolved: false,
    userEmail: null,
    role: null,
    permissions: [],
    isAdministrator: false,
    error: null,
  });

  const activeAccount = accounts[0];
  const userEmail = activeAccount?.username || null;

  useEffect(() => {
    let isMounted = true;

    async function resolveUserAuthorization() {
      if (!userEmail) {
        if (isMounted) {
          setAuthState({
            loading: false,
            resolved: true,
            userEmail: null,
            role: null,
            permissions: [],
            isAdministrator: false,
            error: null,
          });
        }
        return;
      }

      setAuthState((prev) => ({ ...prev, loading: true }));

      try {
        const permResult = await configService.fetchUserPermissionFromSharePoint(userEmail);

        if (!isMounted) return;

        if (permResult && permResult.role) {
          const role = permResult.role;
          const permissions = ROLE_PERMISSIONS[role] || [];
          setAuthState({
            loading: false,
            resolved: true,
            userEmail,
            role,
            permissions,
            isAdministrator: role === 'Administrator',
            error: null,
          });
        } else {
          // UNKNOWN USER -> Restricted state (NO ELEVATED PERMISSIONS)
          setAuthState({
            loading: false,
            resolved: true,
            userEmail,
            role: null,
            permissions: [],
            isAdministrator: false,
            error: 'User account is not registered in App_Permissions.',
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        setAuthState({
          loading: false,
          resolved: true,
          userEmail,
          role: null,
          permissions: [],
          isAdministrator: false,
          error: `Authorization resolution error: ${err?.message || 'Unknown error'}`,
        });
      }
    }

    resolveUserAuthorization();

    return () => {
      isMounted = false;
    };
  }, [userEmail]);

  const hasPermission = (permission: Permission) => {
    return authState.permissions.includes(permission);
  };

  const contextValue: AuthorizationContextValue = {
    ...authState,
    hasPermission,
    canRead: () => hasPermission('item.read'),
    canCreate: () => hasPermission('item.create'),
    canUpdate: () => hasPermission('item.update'),
    canDelete: () => hasPermission('item.delete'),
    canBulkEdit: () => hasPermission('item.bulkUpdate'),
    canConfigure: () => authState.isAdministrator || hasPermission('workspace.manage'),
  };

  return <AuthorizationContext.Provider value={contextValue}>{children}</AuthorizationContext.Provider>;
};

export function useAuthorization(): AuthorizationContextValue {
  const ctx = useContext(AuthorizationContext);
  if (!ctx) {
    return {
      loading: false,
      resolved: false,
      userEmail: null,
      role: null,
      permissions: [],
      isAdministrator: false,
      error: 'AuthorizationContext not found',
      hasPermission: () => false,
      canRead: () => false,
      canCreate: () => false,
      canUpdate: () => false,
      canDelete: () => false,
      canBulkEdit: () => false,
      canConfigure: () => false,
    };
  }
  return ctx;
}
