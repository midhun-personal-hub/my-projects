import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell/AppShell';
import { AdminPanel } from '../components/admin/AdminPanel';
import { WorkspaceModal } from '../components/admin/WorkspaceModal';
import { MenuConfigModal } from '../components/admin/MenuConfigModal';
import { AuditLogDrawer } from '../components/admin/AuditLogDrawer';
import { ToastContainer } from '../components/common/ToastContainer';
import { useAppStore } from '../stores/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { useWorkspaces, useWorkspaceMutations, useMenuMutations } from '../hooks/useConfiguration';
import { msalInstance } from '../config/msalConfig';

/**
 * Skeleton Loading Shell rendered during React.lazy page transitions
 */
const SkeletonShell: React.FC = () => (
  <div className="flex-1 p-6 md:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950/40 animate-pulse">
    <div className="h-24 bg-slate-200 dark:bg-slate-800/60 rounded-2xl w-full" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="h-20 bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
      <div className="h-20 bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
      <div className="h-20 bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
      <div className="h-20 bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
    </div>
    <div className="h-64 bg-slate-200 dark:bg-slate-800/60 rounded-2xl w-full" />
  </div>
);

/**
 * Main Enterprise Application Shell Layout
 */
export const AppLayout: React.FC = () => {
  const { activeWorkspaceId, currentUser, setCurrentUser } = useAppStore();
  const { getAccessToken, isAuthenticated } = useAuth();

  // Load authoritative configuration from SharePoint lists via React Query
  const { workspaces } = useWorkspaces('root');
  const { createWorkspace } = useWorkspaceMutations('root');
  const { createMenu } = useMenuMutations('root');

  const [globalSearch, setGlobalSearch] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
      if (account) {
        setCurrentUser({
          id: account.homeAccountId || account.localAccountId || 'msal-user',
          displayName: account.name || account.username || 'Entra User',
          email: account.username || '',
          userPrincipalName: account.username || '',
          role: currentUser.role || 'Employee',
          jobTitle: 'Enterprise User',
          department: 'Corporate IT',
        });
      }

      const fetchProfile = async () => {
        try {
          const token = await getAccessToken();
          if (!token) return;
          const res = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser({
              id: data.id,
              displayName: data.displayName || account?.name || 'Entra User',
              email: data.mail || data.userPrincipalName || account?.username || '',
              userPrincipalName: data.userPrincipalName || account?.username || '',
              role: currentUser.role || 'Employee',
              jobTitle: data.jobTitle || 'Business User',
              department: data.department || 'Operations',
            });
          }
        } catch (err) {
          console.error('Failed to fetch user profile from Graph:', err);
        }
      };
      fetchProfile();
    }
  }, [isAuthenticated]);

  return (
    <AppShell
      onOpenAdmin={() => setIsAdminOpen(true)}
      onOpenAudit={() => setIsAuditOpen(true)}
      onOpenCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
      onOpenCreateMenu={() => setIsMenuModalOpen(true)}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
    >
      <React.Suspense fallback={<SkeletonShell />}>
        <Outlet />
      </React.Suspense>

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onOpenCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
        onOpenCreateMenu={() => setIsMenuModalOpen(true)}
      />

      {/* Workspace Creation Modal */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSubmit={(ws) => createWorkspace.mutate(ws)}
      />

      {/* Menu Configuration Modal */}
      <MenuConfigModal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        onSubmit={(menu) => createMenu.mutate(menu)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />

      {/* System Audit Trail Drawer */}
      <AuditLogDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      {/* Accessible Toast Notifications */}
      <ToastContainer />
    </AppShell>
  );
};

