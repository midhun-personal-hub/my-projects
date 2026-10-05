import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mapItemToWorkspace,
  mapWorkspaceToFields,
  mapItemToMenu,
  mapMenuToFields,
  configService,
} from '../../services/configService';
import { graphService } from '../../services/graphService';

// Ensure localStorage exists in test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    length: 0,
    key: () => null,
  };
}

describe('Configuration Service & Data Mapping Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('maps SharePoint item to WorkspaceConfig with defaults', () => {
    const item = {
      id: 'sp-1',
      fields: {
        Title: 'ws-finance',
        Name: 'Finance Department',
        Description: 'Financial records',
        IconName: 'Coins',
        Color: '#10b981',
        DisplayOrder: 2,
        Visible: true,
      },
    };

    const mapped = mapItemToWorkspace(item);
    expect(mapped.id).toBe('ws-finance');
    expect(mapped.name).toBe('Finance Department');
    expect(mapped.iconName).toBe('Coins');
    expect(mapped.color).toBe('#10b981');
    expect(mapped.displayOrder).toBe(2);
    expect(mapped.visible).toBe(true);
  });

  it('maps WorkspaceConfig to SharePoint fields payload', () => {
    const fields = mapWorkspaceToFields({
      id: 'ws-hr',
      name: 'Human Resources',
      description: 'Employee onboarding',
      iconName: 'Users',
      color: '#6366f1',
      displayOrder: 3,
      visible: true,
    });

    expect(fields.Title).toBe('ws-hr');
    expect(fields.Name).toBe('Human Resources');
    expect(fields.IconName).toBe('Users');
    expect(fields.Color).toBe('#6366f1');
    expect(fields.DisplayOrder).toBe(3);
    expect(fields.Visible).toBe(true);
  });

  it('maps SharePoint item to MenuConfig with parsed JSON permissions and columns', () => {
    const item = {
      id: 'menu-sp-1',
      fields: {
        Title: 'menu-contracts',
        Name: 'Active Contracts',
        WorkspaceId: 'ws-legal',
        IconName: 'FileText',
        SharePointSiteId: 'contoso.sharepoint.com,guid1',
        SharePointListId: 'list-guid-1',
        SharePointListName: 'ContractsList',
        PrimaryColumn: 'Title',
        VisibleColumns: JSON.stringify(['Title', 'Vendor', 'Amount']),
        Permissions: JSON.stringify({
          Administrator: { create: true, read: true, update: true, delete: true, export: true },
          Manager: { create: true, read: true, update: true, delete: false, export: true },
          Employee: { create: false, read: true, update: false, delete: false, export: true },
        }),
      },
    };

    const mapped = mapItemToMenu(item);
    expect(mapped.id).toBe('menu-contracts');
    expect(mapped.name).toBe('Active Contracts');
    expect(mapped.workspaceId).toBe('ws-legal');
    expect(mapped.visibleColumns).toEqual(['Title', 'Vendor', 'Amount']);
    expect(mapped.permissions.Administrator.delete).toBe(true);
    expect(mapped.permissions.Employee.create).toBe(false);
  });

  it('maps MenuConfig to SharePoint fields payload with serialized JSON strings', () => {
    const fields = mapMenuToFields({
      id: 'menu-po',
      name: 'Purchase Orders',
      workspaceId: 'ws-finance',
      visibleColumns: ['Title', 'Supplier', 'Cost'],
      searchColumns: ['Title', 'Supplier'],
    });

    expect(fields.Title).toBe('menu-po');
    expect(fields.Name).toBe('Purchase Orders');
    expect(fields.WorkspaceId).toBe('ws-finance');
    expect(JSON.parse(fields.VisibleColumns)).toEqual(['Title', 'Supplier', 'Cost']);
    expect(JSON.parse(fields.SearchColumns)).toEqual(['Title', 'Supplier']);
  });

  /* ==============================================================================
   * FIX 1 VERIFICATION TESTS - CONFIGURATION FALLBACK & ERROR BEHAVIOR
   * ============================================================================== */

  it('returns actual workspace records when SharePoint returns items', async () => {
    vi.spyOn(graphService, 'getListItems').mockResolvedValueOnce({
      items: [
        {
          id: '1',
          created: '2026-01-01',
          modified: '2026-01-01',
          fields: { Title: 'ws-custom', Name: 'Custom Workspace', DisplayOrder: 1 },
        },
      ],
      totalItems: 1,
    } as any);

    const res = await configService.fetchWorkspaces('root');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('ws-custom');
    expect(res[0].name).toBe('Custom Workspace');
  });

  it('returns empty [] when SharePoint returns empty []', async () => {
    vi.spyOn(graphService, 'getListItems').mockResolvedValueOnce({
      items: [],
      totalItems: 0,
    } as any);

    const res = await configService.fetchWorkspaces('root');
    expect(res).toEqual([]);
    expect(res).not.toBeNull();
  });

  it('throws an error when SharePoint fetchWorkspaces fails and does not return seed data', async () => {
    vi.spyOn(graphService, 'getListItems').mockRejectedValueOnce(new Error('403 Forbidden'));

    await expect(configService.fetchWorkspaces('root')).rejects.toThrow(
      'SharePoint configuration error: Failed to retrieve workspaces list (403 Forbidden).'
    );
  });

  it('returns empty [] for fetchMenus when SharePoint returns empty []', async () => {
    vi.spyOn(graphService, 'getListItems').mockResolvedValueOnce({
      items: [],
      totalItems: 0,
    } as any);

    const res = await configService.fetchMenus('root');
    expect(res).toEqual([]);
  });

  it('throws an error when SharePoint fetchMenus fails and does not return seed data', async () => {
    vi.spyOn(graphService, 'getListItems').mockRejectedValueOnce(new Error('500 Internal Error'));

    await expect(configService.fetchMenus('root')).rejects.toThrow(
      'SharePoint configuration error: Failed to retrieve menus list (500 Internal Error).'
    );
  });

  /* ==============================================================================
   * FIX 2 VERIFICATION TESTS - CONTROLLED LOCALSTORAGE MIGRATION
   * ============================================================================== */

  it('returns 0 migrated items when local storage is empty', async () => {
    const result = await configService.migrateLocalStorageToSharePoint('root');
    expect(result.migratedCount).toBe(0);
    expect(result.success).toBe(true);
  });

  it('succeeds and removes localStorage keys when all migration operations succeed', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([{ id: 'ws-local', name: 'Local WS' }]));
    localStorage.setItem('sp_menus', JSON.stringify([{ id: 'menu-local', name: 'Local Menu', workspaceId: 'ws-local' }]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any)
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any);

    const createSpy = vi.spyOn(graphService, 'createListItem').mockResolvedValue({ id: 'sp-new' } as any);

    const result = await configService.migrateLocalStorageToSharePoint('root');

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('sp_workspaces')).toBeNull();
    expect(localStorage.getItem('sp_menus')).toBeNull();
    expect(localStorage.getItem('sp_config_migrated')).toBe('true');
  });

  it('retains localStorage migration keys if any SharePoint create operation fails', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([{ id: 'ws-1', name: 'WS 1' }, { id: 'ws-2', name: 'WS 2' }]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any)
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any);

    vi.spyOn(graphService, 'createListItem')
      .mockResolvedValueOnce({ id: 'sp-1' } as any)
      .mockRejectedValueOnce(new Error('SharePoint write quota exceeded'));

    const result = await configService.migrateLocalStorageToSharePoint('root');

    expect(result.success).toBe(false);
    expect(result.migratedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(localStorage.getItem('sp_workspaces')).not.toBeNull();
  });

  it('aborts migration if workspace configuration already exists', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([{ id: 'ws-local', name: 'Local WS' }]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({
        items: [{ id: '1', fields: { Title: 'ws-existing', Name: 'Existing WS' } }],
        totalItems: 1,
      } as any)
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any);

    const createSpy = vi.spyOn(graphService, 'createListItem');

    await expect(configService.migrateLocalStorageToSharePoint('root')).rejects.toThrow(
      'SharePoint configuration already exists. Controlled migration aborted to prevent overwriting.'
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('sp_workspaces')).not.toBeNull();
  });

  it('aborts migration if menu configuration already exists', async () => {
    localStorage.setItem('sp_menus', JSON.stringify([{ id: 'm-local', name: 'Local Menu' }]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any)
      .mockResolvedValueOnce({ items: [{ id: 'menu-1' }], totalItems: 1 } as any);

    const createSpy = vi.spyOn(graphService, 'createListItem');

    await expect(configService.migrateLocalStorageToSharePoint('root')).rejects.toThrow(
      'SharePoint configuration already exists. Controlled migration aborted to prevent overwriting.'
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('sp_menus')).not.toBeNull();
  });

  it('aborts migration if workspace lookup fails', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([{ id: 'ws-local', name: 'Local WS' }]));

    vi.spyOn(graphService, 'getListItems').mockRejectedValueOnce(new Error('Network error on workspaces list'));

    const createSpy = vi.spyOn(graphService, 'createListItem');

    await expect(configService.migrateLocalStorageToSharePoint('root')).rejects.toThrow(
      'Failed to check SharePoint workspaces configuration'
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('sp_workspaces')).not.toBeNull();
  });

  it('aborts migration if menu lookup fails', async () => {
    localStorage.setItem('sp_menus', JSON.stringify([{ id: 'm-local', name: 'Local Menu' }]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any)
      .mockRejectedValueOnce(new Error('Network error on menus list'));

    const createSpy = vi.spyOn(graphService, 'createListItem');

    await expect(configService.migrateLocalStorageToSharePoint('root')).rejects.toThrow(
      'Failed to check SharePoint menus configuration'
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('sp_menus')).not.toBeNull();
  });

  it('proceeds with migration when both SharePoint lists are empty', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([{ id: 'ws-1', name: 'WS 1' }]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any)
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any);

    vi.spyOn(graphService, 'createListItem').mockResolvedValueOnce({ id: 'sp-1' } as any);

    const result = await configService.migrateLocalStorageToSharePoint('root');
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(localStorage.getItem('sp_workspaces')).toBeNull();
  });

  /* ==============================================================================
   * IDEMPOTENCY & RETRY TESTS
   * ============================================================================== */

  it('skips already migrated records on retry after partial migration without creating duplicates', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([
      { id: 'ws-a', name: 'WS A' },
      { id: 'ws-b', name: 'WS B' }
    ]));

    // Simulate state where ws-a was created in attempt 1, but ws-b failed
    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({
        items: [{ id: 'sp-ws-a', fields: { Title: 'ws-a', Name: 'WS A' } }],
        totalItems: 1
      } as any)
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any);

    const createSpy = vi.spyOn(graphService, 'createListItem').mockResolvedValueOnce({ id: 'sp-ws-b' } as any);

    const result = await configService.migrateLocalStorageToSharePoint('root');

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1); // Only ws-b newly created
    expect(result.alreadyMigratedCount).toBe(1); // ws-a skipped
    expect(result.failedCount).toBe(0);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith('root', 'App_Workspaces', expect.objectContaining({ Title: 'ws-b' }));
    expect(localStorage.getItem('sp_workspaces')).toBeNull();
  });

  it('skips record if identical SharePoint record already exists', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([{ id: 'ws-a', name: 'WS A' }]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({
        items: [{ id: 'sp-1', fields: { Title: 'ws-a', Name: 'WS A' } }],
        totalItems: 1
      } as any)
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any);

    const createSpy = vi.spyOn(graphService, 'createListItem');

    const result = await configService.migrateLocalStorageToSharePoint('root');

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
    expect(result.alreadyMigratedCount).toBe(1);
    expect(createSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('sp_workspaces')).toBeNull();
  });

  it('handles mixed retry with multiple already-migrated records and new record', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([
      { id: 'ws-a', name: 'WS A' },
      { id: 'ws-b', name: 'WS B' },
      { id: 'ws-c', name: 'WS C' }
    ]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({
        items: [
          { id: 'sp-a', fields: { Title: 'ws-a', Name: 'WS A' } },
          { id: 'sp-b', fields: { Title: 'ws-b', Name: 'WS B' } }
        ],
        totalItems: 2
      } as any)
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any);

    const createSpy = vi.spyOn(graphService, 'createListItem').mockResolvedValueOnce({ id: 'sp-c' } as any);

    const result = await configService.migrateLocalStorageToSharePoint('root');

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(result.alreadyMigratedCount).toBe(2);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith('root', 'App_Workspaces', expect.objectContaining({ Title: 'ws-c' }));
    expect(localStorage.getItem('sp_workspaces')).toBeNull();
  });

  it('preserves localStorage when retry encounters a creation error', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([
      { id: 'ws-a', name: 'WS A' },
      { id: 'ws-b', name: 'WS B' }
    ]));

    vi.spyOn(graphService, 'getListItems')
      .mockResolvedValueOnce({
        items: [{ id: 'sp-a', fields: { Title: 'ws-a', Name: 'WS A' } }],
        totalItems: 1
      } as any)
      .mockResolvedValueOnce({ items: [], totalItems: 0 } as any);

    vi.spyOn(graphService, 'createListItem').mockRejectedValueOnce(new Error('Network error on ws-b'));

    const result = await configService.migrateLocalStorageToSharePoint('root');

    expect(result.success).toBe(false);
    expect(result.alreadyMigratedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(localStorage.getItem('sp_workspaces')).not.toBeNull();
  });

  it('prevents concurrent migration invocations in the same session', async () => {
    localStorage.setItem('sp_workspaces', JSON.stringify([{ id: 'ws-1', name: 'WS 1' }]));

    let resolveListItems: any;
    const listPromise = new Promise((resolve) => { resolveListItems = resolve; });

    vi.spyOn(graphService, 'getListItems').mockReturnValue(listPromise as any);

    // First call starts and pauses on getListItems
    const migration1 = configService.migrateLocalStorageToSharePoint('root');

    // Second concurrent call should be blocked immediately
    await expect(configService.migrateLocalStorageToSharePoint('root')).rejects.toThrow(
      'Migration is already in progress.'
    );

    // Resolve first call
    resolveListItems({ items: [], totalItems: 0 });
    vi.spyOn(graphService, 'createListItem').mockResolvedValueOnce({ id: 'sp-1' } as any);

    const res1 = await migration1;
    expect(res1.success).toBe(true);
  });
});

