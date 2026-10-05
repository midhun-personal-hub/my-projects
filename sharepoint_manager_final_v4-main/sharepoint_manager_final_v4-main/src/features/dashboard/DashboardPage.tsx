import React, { useState } from 'react';
import { Dashboard } from '../../components/dashboard/Dashboard';
import { WorkspaceModal } from '../../components/admin/WorkspaceModal';
import { MenuConfigModal } from '../../components/admin/MenuConfigModal';
import { useAppStore } from '../../stores/useAppStore';
import { useWorkspaces, useWorkspaceMutations, useMenuMutations } from '../../hooks/useConfiguration';

export const DashboardPage: React.FC = () => {
  const { activeWorkspaceId } = useAppStore();
  const { workspaces } = useWorkspaces();
  const { createWorkspace } = useWorkspaceMutations();
  const { createMenu } = useMenuMutations();

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  return (
    <>
      <Dashboard
        onOpenCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
        onOpenCreateMenu={() => setIsMenuModalOpen(true)}
      />

      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSubmit={(ws) => createWorkspace.mutate(ws)}
      />

      <MenuConfigModal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        onSubmit={(menu) => createMenu.mutate(menu)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />
    </>
  );
};

export default DashboardPage;
