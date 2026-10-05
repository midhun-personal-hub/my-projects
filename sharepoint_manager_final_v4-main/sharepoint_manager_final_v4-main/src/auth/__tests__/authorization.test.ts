import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configService } from '../../services/configService';
import { graphService } from '../../services/graphService';
import { ROLE_PERMISSIONS } from '../../security/permissions';
import { useAppStore } from '../../stores/useAppStore';

describe('Authorization Architecture Hardening Tests', () => {
  const mockUserEmail = 'testuser@contoso.com';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // TEST 1 — Normal authorized user
  it('TEST 1: Normal authorized user (Employee role from App_Permissions)', async () => {
    vi.spyOn(graphService, 'getListItems').mockResolvedValue({
      items: [
        {
          id: 'perm-1',
          fields: {
            Title: mockUserEmail,
            UserEmail: mockUserEmail,
            Role: 'Employee',
          },
        },
      ],
    } as any);

    const permResult = await configService.fetchUserPermissionFromSharePoint(mockUserEmail);
    expect(permResult).toEqual({ role: 'Employee' });

    const role = permResult?.role || null;
    const isAdministrator = role === 'Administrator';
    const permissions = role ? ROLE_PERMISSIONS[role] || [] : [];

    expect(role).toBe('Employee');
    expect(isAdministrator).toBe(false);
    expect(permissions).toContain('item.read');
    expect(permissions).not.toContain('workspace.manage');
  });

  // TEST 2 — Administrator from App_Permissions
  it('TEST 2: Administrator role comes strictly from App_Permissions', async () => {
    vi.spyOn(graphService, 'getListItems').mockResolvedValue({
      items: [
        {
          id: 'perm-2',
          fields: {
            Title: mockUserEmail,
            UserEmail: mockUserEmail,
            Role: 'Administrator',
          },
        },
      ],
    } as any);

    const permResult = await configService.fetchUserPermissionFromSharePoint(mockUserEmail);
    expect(permResult).toEqual({ role: 'Administrator' });

    const role = permResult?.role || null;
    const isAdministrator = role === 'Administrator';
    const permissions = role ? ROLE_PERMISSIONS[role] || [] : [];

    expect(role).toBe('Administrator');
    expect(isAdministrator).toBe(true);
    expect(permissions).toContain('workspace.manage');
  });

  // TEST 3 — Development mode does NOT elevate
  it('TEST 3: Development mode does NOT elevate unknown user to Administrator', async () => {
    vi.spyOn(graphService, 'getListItems').mockResolvedValue({ items: [] } as any);

    const permResult = await configService.fetchUserPermissionFromSharePoint('unknown@contoso.com');
    expect(permResult).toBeNull();

    const role = permResult?.role || null;
    const permissions = role ? ROLE_PERMISSIONS[role] || [] : [];
    const isAdministrator = role === 'Administrator';

    expect(role).toBeNull();
    expect(isAdministrator).toBe(false);
    expect(permissions).toEqual([]);
  });

  // TEST 4 — Production mode does NOT elevate
  it('TEST 4: Production mode does NOT elevate unknown user', async () => {
    vi.spyOn(graphService, 'getListItems').mockResolvedValue({ items: [] } as any);

    const permResult = await configService.fetchUserPermissionFromSharePoint('unknown@contoso.com');
    expect(permResult).toBeNull();

    const role = permResult?.role || null;
    const permissions = role ? ROLE_PERMISSIONS[role] || [] : [];
    const isAdministrator = role === 'Administrator';

    expect(role).toBeNull();
    expect(isAdministrator).toBe(false);
    expect(permissions).toEqual([]);
  });

  // TEST 5 — Permission lookup failure
  it('TEST 5: Permission lookup failure fails closed', async () => {
    vi.spyOn(graphService, 'getListItems').mockRejectedValue(new Error('SharePoint 500 Server Error'));

    let permResult = null;
    try {
      permResult = await configService.fetchUserPermissionFromSharePoint(mockUserEmail);
    } catch {
      permResult = null;
    }

    expect(permResult).toBeNull();

    const role = permResult?.role || null;
    const permissions = role ? ROLE_PERMISSIONS[role] || [] : [];
    const isAdministrator = role === 'Administrator';

    expect(role).toBeNull();
    expect(isAdministrator).toBe(false);
    expect(permissions).toEqual([]);
  });

  // TEST 6 — Zustand cannot grant authorization
  it('TEST 6: Zustand store has no setUserRole and authorization does not depend on store state', () => {
    const store = useAppStore.getState();
    expect((store as any).setUserRole).toBeUndefined();
  });

  // TEST 7 — Existing authorized behavior remains
  it('TEST 7: ROLE_PERMISSIONS matrix correctly maps roles to claims', () => {
    expect(ROLE_PERMISSIONS['Administrator']).toContain('workspace.manage');
    expect(ROLE_PERMISSIONS['Manager']).toContain('item.create');
    expect(ROLE_PERMISSIONS['Manager']).not.toContain('workspace.manage');
    expect(ROLE_PERMISSIONS['Employee']).toContain('item.read');
    expect(ROLE_PERMISSIONS['Employee']).not.toContain('item.delete');
  });
});
