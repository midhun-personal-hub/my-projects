import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { useWorkspaces, useMenus, useMenuMutations } from '../../hooks/useConfiguration';
import { WorkspaceView } from '../../components/workspace/WorkspaceView';
import { MenuConfigModal } from '../../components/admin/MenuConfigModal';

export const ListPage: React.FC = () => {
  const { listKey } = useParams<{ listKey: string }>();
  const { setActiveMenu, setActiveWorkspace, activeWorkspaceId } = useAppStore();
  const { workspaces } = useWorkspaces();
  const { menus } = useMenus();
  const { createMenu } = useMenuMutations();
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  useEffect(() => {
    if (listKey && menus.length > 0) {
      // Find menu by id or sharePointListId
      const targetMenu = menus.find((m) => m.id === listKey || m.sharePointListId === listKey);
      if (targetMenu) {
        setActiveWorkspace(targetMenu.workspaceId);
        setActiveMenu(targetMenu.id);
      }
    }
  }, [listKey, menus, setActiveMenu, setActiveWorkspace]);

  return (
    <>
      <WorkspaceView onOpenCreateMenu={() => setIsMenuModalOpen(true)} />

      <MenuConfigModal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        onSubmit={(m) => createMenu.mutate(m)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />
    </>
  );
};

export default ListPage;
