// ==============================================================================
// SHAREPOINT-BACKED APPLICATION CONFIGURATION SERVICE
// ==============================================================================
// Manages authoritative application configuration (Workspaces, Menus, Permissions,
// and Fields) stored directly in SharePoint Lists via Microsoft Graph API.
// Eliminates reliance on browser localStorage for authoritative configuration state.
// ==============================================================================

import { graphService } from './graphService';
import { MenuConfig, WorkspaceConfig, CrudPermissions, UserRole } from '../types';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  alreadyMigratedCount?: number;
  failedCount: number;
  errors: string[];
}

let isMigrationInProgress = false;

export const CONFIG_SITE_ID = 'root';
export const LIST_APP_WORKSPACES = 'App_Workspaces';
export const LIST_APP_MENUS = 'App_Menus';
export const LIST_APP_PERMISSIONS = 'App_Permissions';
export const LIST_APP_FIELDS = 'App_Fields';

const DEFAULT_PERMISSIONS: Record<UserRole, CrudPermissions> = {
  Administrator: { create: true, read: true, update: true, delete: true, export: true },
  Manager: { create: true, read: true, update: true, delete: false, export: true },
  Employee: { create: false, read: true, update: false, delete: false, export: true },
};

function parseJsonField<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    if (typeof value === 'string' && typeof fallback === 'object' && Array.isArray(fallback)) {
      return value.split(',').map((s) => s.trim()).filter(Boolean) as unknown as T;
    }
    return fallback;
  }
}

/**
 * Maps a SharePoint List item from App_Workspaces to WorkspaceConfig
 */
export function mapItemToWorkspace(item: { id: string; fields: Record<string, any> }): WorkspaceConfig {
  const f = item.fields || {};
  return {
    id: String(f.Title || f.WorkspaceId || item.id),
    name: String(f.Name || f.Title || 'Unnamed Workspace'),
    description: String(f.Description || ''),
    iconName: String(f.IconName || f.Icon || 'FolderKanban'),
    color: String(f.Color || '#0284c7'),
    displayOrder: Number(f.DisplayOrder || f.SortOrder || 1),
    visible: f.Visible !== false && f.IsActive !== false && String(f.Visible) !== 'false',
    createdAt: String(f.CreatedAt || new Date().toISOString()),
    updatedAt: String(f.UpdatedAt || new Date().toISOString()),
  };
}

/**
 * Maps WorkspaceConfig to SharePoint List fields payload
 */
export function mapWorkspaceToFields(ws: Partial<WorkspaceConfig> & { name: string }): Record<string, any> {
  return {
    Title: ws.id || `ws-${Date.now()}`,
    Name: ws.name,
    Description: ws.description || '',
    IconName: ws.iconName || 'FolderKanban',
    Color: ws.color || '#0284c7',
    DisplayOrder: ws.displayOrder ?? 1,
    Visible: ws.visible !== false,
    CreatedAt: ws.createdAt || new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
  };
}

/**
 * Maps a SharePoint List item from App_Menus to MenuConfig
 */
export function mapItemToMenu(item: { id: string; fields: Record<string, any> }): MenuConfig {
  const f = item.fields || {};
  const visibleCols = parseJsonField<string[]>(f.VisibleColumns, ['Title']);
  const searchCols = parseJsonField<string[]>(f.SearchColumns, ['Title']);
  const perms = parseJsonField<Record<UserRole, CrudPermissions>>(f.Permissions, DEFAULT_PERMISSIONS);

  return {
    id: String(f.Title || f.MenuId || item.id),
    name: String(f.Name || f.Title || 'Unnamed Menu'),
    workspaceId: String(f.WorkspaceId || ''),
    iconName: String(f.IconName || f.Icon || 'ListFilter'),
    displayOrder: Number(f.DisplayOrder || f.SortOrder || 1),
    visible: f.Visible !== false && f.IsActive !== false && String(f.Visible) !== 'false',
    sharePointSiteId: String(f.SharePointSiteId || 'root'),
    sharePointListId: String(f.SharePointListId || f.DataSource || ''),
    sharePointListName: String(f.SharePointListName || f.Name || ''),
    primaryColumn: String(f.PrimaryColumn || 'Title'),
    descriptionColumn: f.DescriptionColumn ? String(f.DescriptionColumn) : undefined,
    visibleColumns: Array.isArray(visibleCols) && visibleCols.length > 0 ? visibleCols : ['Title'],
    defaultSortColumn: String(f.DefaultSortColumn || 'Title'),
    defaultSortDirection: f.DefaultSortDirection === 'desc' ? 'desc' : 'asc',
    searchColumns: Array.isArray(searchCols) && searchCols.length > 0 ? searchCols : ['Title'],
    allowSearch: f.AllowSearch !== false,
    allowFilter: f.AllowFilter !== false,
    allowExport: f.AllowExport !== false,
    allowFileUpload: Boolean(f.AllowFileUpload),
    permissions: perms,
    pageSize: Number(f.PageSize || 10),
  };
}

/**
 * Maps MenuConfig to SharePoint List fields payload
 */
export function mapMenuToFields(menu: Partial<MenuConfig> & { name: string; workspaceId: string }): Record<string, any> {
  return {
    Title: menu.id || `menu-${Date.now()}`,
    Name: menu.name,
    WorkspaceId: menu.workspaceId,
    IconName: menu.iconName || 'ListFilter',
    DisplayOrder: menu.displayOrder ?? 1,
    Visible: menu.visible !== false,
    SharePointSiteId: menu.sharePointSiteId || 'root',
    SharePointListId: menu.sharePointListId || '',
    SharePointListName: menu.sharePointListName || menu.name,
    PrimaryColumn: menu.primaryColumn || 'Title',
    DescriptionColumn: menu.descriptionColumn || '',
    VisibleColumns: JSON.stringify(menu.visibleColumns || ['Title']),
    DefaultSortColumn: menu.defaultSortColumn || 'Title',
    DefaultSortDirection: menu.defaultSortDirection || 'asc',
    SearchColumns: JSON.stringify(menu.searchColumns || ['Title']),
    AllowSearch: menu.allowSearch !== false,
    AllowFilter: menu.allowFilter !== false,
    AllowExport: menu.allowExport !== false,
    AllowFileUpload: Boolean(menu.allowFileUpload),
    Permissions: JSON.stringify(menu.permissions || DEFAULT_PERMISSIONS),
    PageSize: menu.pageSize || 10,
  };
}

/**
 * Configuration Service for fetching and persisting application configuration to SharePoint
 */
export const configService = {
  /**
   * Fetches authoritative Workspaces from SharePoint App_Workspaces list
   */
  async fetchWorkspaces(siteId: string = CONFIG_SITE_ID): Promise<WorkspaceConfig[]> {
    try {
      const res = await graphService.getListItems(siteId, LIST_APP_WORKSPACES, { top: 100 });
      if (res.items) {
        return res.items.map(mapItemToWorkspace);
      }
      return [];
    } catch (err: any) {
      throw new Error(`SharePoint configuration error: Failed to retrieve workspaces list (${err?.message || 'Network/Permission Error'}).`);
    }
  },

  /**
   * Fetches authoritative Menus from SharePoint App_Menus list
   */
  async fetchMenus(siteId: string = CONFIG_SITE_ID): Promise<MenuConfig[]> {
    try {
      const res = await graphService.getListItems(siteId, LIST_APP_MENUS, { top: 200 });
      if (res.items) {
        return res.items.map(mapItemToMenu);
      }
      return [];
    } catch (err: any) {
      throw new Error(`SharePoint configuration error: Failed to retrieve menus list (${err?.message || 'Network/Permission Error'}).`);
    }
  },

  /**
   * Creates a new Workspace in SharePoint App_Workspaces list
   */
  async createWorkspace(
    ws: Omit<WorkspaceConfig, 'id' | 'createdAt' | 'updatedAt'>,
    siteId: string = CONFIG_SITE_ID
  ): Promise<WorkspaceConfig> {
    const id = `ws-${Date.now()}`;
    const fullWs: WorkspaceConfig = {
      ...ws,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const fields = mapWorkspaceToFields(fullWs);
    try {
      await graphService.createListItem(siteId, LIST_APP_WORKSPACES, fields);
    } catch (err: any) {
      throw new Error(`Failed to create workspace "${ws.name}" in SharePoint: ${err?.message || 'Unknown error'}`);
    }
    return fullWs;
  },

  /**
   * Updates an existing Workspace in SharePoint App_Workspaces list
   */
  async updateWorkspace(
    id: string,
    ws: Partial<WorkspaceConfig>,
    siteId: string = CONFIG_SITE_ID
  ): Promise<void> {
    const fields = mapWorkspaceToFields({ ...ws, id, name: ws.name || '' });
    try {
      // Find list item ID matching Title == id
      const res = await graphService.getListItems(siteId, LIST_APP_WORKSPACES, {
        filter: `fields/Title eq '${id}'`,
        top: 1,
      });
      if (res.items && res.items.length > 0) {
        await graphService.updateListItem(siteId, LIST_APP_WORKSPACES, res.items[0].id, fields);
      } else {
        await graphService.createListItem(siteId, LIST_APP_WORKSPACES, fields);
      }
    } catch (err: any) {
      throw new Error(`Failed to update workspace "${id}" in SharePoint: ${err?.message || 'Unknown error'}`);
    }
  },

  /**
   * Deletes a Workspace from SharePoint App_Workspaces list
   */
  async deleteWorkspace(id: string, siteId: string = CONFIG_SITE_ID): Promise<void> {
    try {
      const res = await graphService.getListItems(siteId, LIST_APP_WORKSPACES, {
        filter: `fields/Title eq '${id}'`,
        top: 1,
      });
      if (res.items && res.items.length > 0) {
        await graphService.deleteListItem(siteId, LIST_APP_WORKSPACES, res.items[0].id);
      }
    } catch (err: any) {
      throw new Error(`Failed to delete workspace "${id}" from SharePoint: ${err?.message || 'Unknown error'}`);
    }
  },

  /**
   * Creates a new Menu in SharePoint App_Menus list
   */
  async createMenu(
    menuData: Omit<MenuConfig, 'id'>,
    siteId: string = CONFIG_SITE_ID
  ): Promise<MenuConfig> {
    const id = `menu-${Date.now()}`;
    const fullMenu: MenuConfig = {
      ...menuData,
      id,
    };

    const fields = mapMenuToFields(fullMenu);
    try {
      await graphService.createListItem(siteId, LIST_APP_MENUS, fields);
    } catch (err: any) {
      throw new Error(`Failed to create menu "${menuData.name}" in SharePoint: ${err?.message || 'Unknown error'}`);
    }
    return fullMenu;
  },

  /**
   * Updates an existing Menu in SharePoint App_Menus list
   */
  async updateMenu(
    id: string,
    menu: Partial<MenuConfig>,
    siteId: string = CONFIG_SITE_ID
  ): Promise<void> {
    const fields = mapMenuToFields({ ...menu, id, name: menu.name || '', workspaceId: menu.workspaceId || '' });
    try {
      const res = await graphService.getListItems(siteId, LIST_APP_MENUS, {
        filter: `fields/Title eq '${id}'`,
        top: 1,
      });
      if (res.items && res.items.length > 0) {
        await graphService.updateListItem(siteId, LIST_APP_MENUS, res.items[0].id, fields);
      } else {
        await graphService.createListItem(siteId, LIST_APP_MENUS, fields);
      }
    } catch (err: any) {
      throw new Error(`Failed to update menu "${id}" in SharePoint: ${err?.message || 'Unknown error'}`);
    }
  },

  /**
   * Fetches user permission record from SharePoint App_Permissions list
   */
  async fetchUserPermissionFromSharePoint(userEmail: string, siteId: string = CONFIG_SITE_ID): Promise<{ role: UserRole } | null> {
    if (!userEmail) return null;
    try {
      const escaped = userEmail.replace(/'/g, "''");
      const res = await graphService.getListItems(siteId, LIST_APP_PERMISSIONS, {
        filter: `fields/Title eq '${escaped}' or fields/UserEmail eq '${escaped}' or fields/UserPrincipalName eq '${escaped}'`,
        top: 1,
      });
      if (res.items && res.items.length > 0) {
        const f = res.items[0].fields || {};
        const rawRole = String(f.Role || f.Title || '').trim();
        if (['Administrator', 'Manager', 'Employee'].includes(rawRole)) {
          return { role: rawRole as UserRole };
        }
      }
    } catch (err) {
      console.warn('Could not fetch user permissions from SharePoint App_Permissions:', err);
    }
    return null;
  },

  /**
   * Deletes a Menu from SharePoint App_Menus list
   */
  async deleteMenu(id: string, siteId: string = CONFIG_SITE_ID): Promise<void> {
    try {
      const res = await graphService.getListItems(siteId, LIST_APP_MENUS, {
        filter: `fields/Title eq '${id}'`,
        top: 1,
      });
      if (res.items && res.items.length > 0) {
        await graphService.deleteListItem(siteId, LIST_APP_MENUS, res.items[0].id);
      }
    } catch (err: any) {
      throw new Error(`Failed to delete menu "${id}" from SharePoint: ${err?.message || 'Unknown error'}`);
    }
  },

  /**
   * Controlled migration helper: Checks if legacy localStorage configuration exists.
   * When explicitly invoked by an Administrator, migrates custom local configuration to SharePoint,
   * skips records already present in SharePoint (idempotent retry), and purges local keys ONLY if
   * all required operations succeed or were already confirmed migrated.
   */
  async migrateLocalStorageToSharePoint(siteId: string = CONFIG_SITE_ID): Promise<MigrationResult> {
    if (isMigrationInProgress) {
      throw new Error('Migration is already in progress.');
    }
    isMigrationInProgress = true;

    try {
      const savedWorkspacesRaw = localStorage.getItem('sp_workspaces');
      const savedMenusRaw = localStorage.getItem('sp_menus');

      if (!savedWorkspacesRaw && !savedMenusRaw) {
        return { success: true, migratedCount: 0, alreadyMigratedCount: 0, failedCount: 0, errors: [] };
      }

      let localWorkspaces: WorkspaceConfig[] = [];
      let localMenus: MenuConfig[] = [];
      try {
        if (savedWorkspacesRaw) localWorkspaces = JSON.parse(savedWorkspacesRaw);
        if (savedMenusRaw) localMenus = JSON.parse(savedMenusRaw);
      } catch {
        throw new Error('Local storage configuration contains invalid JSON. Migration aborted.');
      }

      if (localWorkspaces.length === 0 && localMenus.length === 0) {
        return { success: true, migratedCount: 0, alreadyMigratedCount: 0, failedCount: 0, errors: [] };
      }

      const localWsIds = new Set(localWorkspaces.map((w) => w.id));
      const localMenuIds = new Set(localMenus.map((m) => m.id));

      // Check existing SharePoint configuration in App_Workspaces
      let existingSpWorkspaces: WorkspaceConfig[] = [];
      try {
        const res = await graphService.getListItems(siteId, LIST_APP_WORKSPACES, { top: 999 });
        if (res.items) {
          existingSpWorkspaces = res.items.map(mapItemToWorkspace);
        }
      } catch (err: any) {
        throw new Error(`Failed to check SharePoint workspaces configuration (${err?.message || 'Lookup Error'}). Migration aborted.`);
      }

      // Check existing SharePoint configuration in App_Menus
      let existingSpMenus: MenuConfig[] = [];
      try {
        const res = await graphService.getListItems(siteId, LIST_APP_MENUS, { top: 999 });
        if (res.items) {
          existingSpMenus = res.items.map(mapItemToMenu);
        }
      } catch (err: any) {
        throw new Error(`Failed to check SharePoint menus configuration (${err?.message || 'Lookup Error'}). Migration aborted.`);
      }

      // Safety rule: If SharePoint contains items that do NOT match the local configuration being migrated,
      // an independent authoritative configuration exists. Abort to prevent overwriting.
      const externalWorkspaces = existingSpWorkspaces.filter((spWs) => !localWsIds.has(spWs.id));
      const externalMenus = existingSpMenus.filter((spM) => !localMenuIds.has(spM.id));

      if (externalWorkspaces.length > 0 || externalMenus.length > 0) {
        throw new Error('SharePoint configuration already exists. Controlled migration aborted to prevent overwriting.');
      }

      const existingSpWsIdSet = new Set(existingSpWorkspaces.map((w) => w.id));
      const existingSpMenuIdSet = new Set(existingSpMenus.map((m) => m.id));

      let newlyMigratedCount = 0;
      let alreadyMigratedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const ws of localWorkspaces) {
        if (existingSpWsIdSet.has(ws.id)) {
          alreadyMigratedCount++;
          continue;
        }
        try {
          await graphService.createListItem(siteId, LIST_APP_WORKSPACES, mapWorkspaceToFields(ws));
          newlyMigratedCount++;
          existingSpWsIdSet.add(ws.id);
        } catch (err: any) {
          failedCount++;
          errors.push(`Workspace '${ws.name || ws.id}': ${err?.message || 'Create failed'}`);
        }
      }

      for (const menu of localMenus) {
        if (existingSpMenuIdSet.has(menu.id)) {
          alreadyMigratedCount++;
          continue;
        }
        try {
          await graphService.createListItem(siteId, LIST_APP_MENUS, mapMenuToFields(menu));
          newlyMigratedCount++;
          existingSpMenuIdSet.add(menu.id);
        } catch (err: any) {
          failedCount++;
          errors.push(`Menu '${menu.name || menu.id}': ${err?.message || 'Create failed'}`);
        }
      }

      const totalLocalItems = localWorkspaces.length + localMenus.length;
      const totalAccountedFor = alreadyMigratedCount + newlyMigratedCount;

      // LOCALSTORAGE DELETION RULE:
      // Only remove migration keys if ALL local items are successfully accounted for (migrated or already migrated)
      // and there were zero failures during this attempt.
      if (failedCount === 0 && totalAccountedFor === totalLocalItems) {
        localStorage.removeItem('sp_workspaces');
        localStorage.removeItem('sp_menus');
        localStorage.setItem('sp_config_migrated', 'true');
        return {
          success: true,
          migratedCount: newlyMigratedCount,
          alreadyMigratedCount,
          failedCount: 0,
          errors: [],
        };
      }

      return {
        success: false,
        migratedCount: newlyMigratedCount,
        alreadyMigratedCount,
        failedCount,
        errors,
      };
    } finally {
      isMigrationInProgress = false;
    }
  },
};
