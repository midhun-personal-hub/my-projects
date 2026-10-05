// ==============================================================================
// REACT QUERY HOOKS FOR PERSISTENT SHAREPOINT CONFIGURATION
// ==============================================================================

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '../services/configService';
import { MenuConfig, WorkspaceConfig } from '../types';
import { useAppStore } from '../stores/useAppStore';

export const WORKSPACES_QUERY_KEY = ['sharepoint-config-workspaces'];
export const MENUS_QUERY_KEY = ['sharepoint-config-menus'];

/**
 * React Query Hook fetching authoritative Workspaces from SharePoint App_Workspaces list
 */
export function useWorkspaces(siteId = 'root') {
  const query = useQuery({
    queryKey: [...WORKSPACES_QUERY_KEY, siteId],
    queryFn: () => configService.fetchWorkspaces(siteId),
    staleTime: 60000, // 1 minute
  });

  return {
    workspaces: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query Hook fetching authoritative Menus from SharePoint App_Menus list
 */
export function useMenus(siteId = 'root') {
  const query = useQuery({
    queryKey: [...MENUS_QUERY_KEY, siteId],
    queryFn: () => configService.fetchMenus(siteId),
    staleTime: 60000, // 1 minute
  });

  return {
    menus: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// Retain legacy aliases for backwards compatibility
export const useWorkspacesQuery = useWorkspaces;
export const useMenusQuery = useMenus;

/**
 * Mutation Hook for Workspace CRUD operations on SharePoint
 */
export function useWorkspaceMutations(siteId = 'root') {
  const queryClient = useQueryClient();
  const { addToast, logAction } = useAppStore();

  const createWorkspace = useMutation({
    mutationFn: (wsData: Omit<WorkspaceConfig, 'id' | 'createdAt' | 'updatedAt'>) =>
      configService.createWorkspace(wsData, siteId),
    onSuccess: (newWs) => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
      logAction('CONFIG_CHANGE', `Created new workspace: "${newWs.name}"`);
      addToast('success', 'Workspace Saved', `Workspace "${newWs.name}" saved to SharePoint App_Workspaces list.`);
    },
    onError: (error: any) => {
      addToast(
        'error',
        'SharePoint Config Error',
        error?.message || 'Failed to save workspace configuration to SharePoint.'
      );
    },
  });

  const updateWorkspace = useMutation({
    mutationFn: ({ id, wsData }: { id: string; wsData: Partial<WorkspaceConfig> }) =>
      configService.updateWorkspace(id, wsData, siteId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
      logAction('CONFIG_CHANGE', `Updated workspace settings for ID: ${id}`);
      addToast('info', 'Workspace Updated', 'Workspace configuration updated in SharePoint.');
    },
    onError: (error: any) => {
      addToast('error', 'Update Error', error?.message || 'Failed to update workspace in SharePoint.');
    },
  });

  const deleteWorkspace = useMutation({
    mutationFn: (id: string) => configService.deleteWorkspace(id, siteId),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MENUS_QUERY_KEY });
      logAction('CONFIG_CHANGE', `Deleted workspace ID: "${id}"`);
      addToast('warning', 'Workspace Removed', 'Workspace deleted from SharePoint configuration.');
    },
    onError: (error: any) => {
      addToast('error', 'Delete Error', error?.message || 'Failed to delete workspace from SharePoint.');
    },
  });

  return { createWorkspace, updateWorkspace, deleteWorkspace };
}

/**
 * Mutation Hook for Menu CRUD operations on SharePoint
 */
export function useMenuMutations(siteId = 'root') {
  const queryClient = useQueryClient();
  const { addToast, logAction } = useAppStore();

  const createMenu = useMutation({
    mutationFn: (menuData: Omit<MenuConfig, 'id'>) => configService.createMenu(menuData, siteId),
    onSuccess: (newMenu) => {
      queryClient.invalidateQueries({ queryKey: MENUS_QUERY_KEY });
      logAction('CONFIG_CHANGE', `Created menu: "${newMenu.name}"`, undefined, newMenu.name);
      addToast('success', 'Menu Saved', `Menu "${newMenu.name}" saved to SharePoint App_Menus list.`);
    },
    onError: (error: any) => {
      addToast('error', 'SharePoint Config Error', error?.message || 'Failed to save menu configuration to SharePoint.');
    },
  });

  const updateMenu = useMutation({
    mutationFn: ({ id, menuData }: { id: string; menuData: Partial<MenuConfig> }) =>
      configService.updateMenu(id, menuData, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENUS_QUERY_KEY });
      addToast('info', 'Menu Updated', 'Menu configuration updated in SharePoint.');
    },
    onError: (error: any) => {
      addToast('error', 'Update Error', error?.message || 'Failed to update menu in SharePoint.');
    },
  });

  const deleteMenu = useMutation({
    mutationFn: (id: string) => configService.deleteMenu(id, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENUS_QUERY_KEY });
      addToast('warning', 'Menu Removed', 'Menu deleted from SharePoint configuration.');
    },
    onError: (error: any) => {
      addToast('error', 'Delete Error', error?.message || 'Failed to delete menu from SharePoint.');
    },
  });

  return { createMenu, updateMenu, deleteMenu };
}

/**
 * Hook for explicit, controlled migration of legacy localStorage configuration to SharePoint
 */
export function useControlledMigration(siteId = 'root') {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: () => configService.migrateLocalStorageToSharePoint(siteId),
    onSuccess: (result) => {
      if (result.success && result.migratedCount > 0) {
        queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: MENUS_QUERY_KEY });
        addToast('success', 'Migration Complete', `Migrated ${result.migratedCount} item(s) to SharePoint.`);
      } else if (!result.success) {
        queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: MENUS_QUERY_KEY });
        addToast(
          'error',
          'Migration Partial Failure',
          `Migrated ${result.migratedCount} item(s), but ${result.failedCount} failed. Your local storage configuration has NOT been removed.`
        );
      } else {
        addToast('info', 'No Items Migrated', 'No local storage configuration was found to migrate.');
      }
    },
    onError: (error: any) => {
      addToast('error', 'Migration Failed', error?.message || 'Failed to migrate local storage to SharePoint.');
    },
  });
}

