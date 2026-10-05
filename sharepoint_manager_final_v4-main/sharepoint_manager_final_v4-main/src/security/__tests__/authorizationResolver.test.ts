import { describe, it, expect } from 'vitest';
import { hasPermission, hasRole } from '../authorizationResolver';
import { UserProfile } from '../../types';

describe('Authorization Resolver Suite', () => {
  const adminUser: UserProfile = {
    id: 'user-admin',
    displayName: 'Admin User',
    email: 'admin@contoso.com',
    userPrincipalName: 'admin@contoso.com',
    role: 'Administrator',
  };

  const managerUser: UserProfile = {
    id: 'user-manager',
    displayName: 'Manager User',
    email: 'manager@contoso.com',
    userPrincipalName: 'manager@contoso.com',
    role: 'Manager',
  };

  const employeeUser: UserProfile = {
    id: 'user-emp',
    displayName: 'Employee User',
    email: 'emp@contoso.com',
    userPrincipalName: 'emp@contoso.com',
    role: 'Employee',
  };

  it('verifies Administrator role has ALL permissions', () => {
    expect(hasPermission(adminUser, 'workspace.manage')).toBe(true);
    expect(hasPermission(adminUser, 'menu.manage')).toBe(true);
    expect(hasPermission(adminUser, 'item.delete')).toBe(true);
  });

  it('verifies Manager role has restricted admin permissions', () => {
    expect(hasPermission(managerUser, 'workspace.manage')).toBe(false);
    expect(hasPermission(managerUser, 'item.create')).toBe(true);
    expect(hasPermission(managerUser, 'item.update')).toBe(true);
  });

  it('verifies Employee role has read-only/limited permissions', () => {
    expect(hasPermission(employeeUser, 'workspace.manage')).toBe(false);
    expect(hasPermission(employeeUser, 'item.create')).toBe(false);
    expect(hasPermission(employeeUser, 'item.read')).toBe(true);
  });

  it('evaluates hasRole checks correctly', () => {
    expect(hasRole(adminUser, ['Administrator', 'Manager'])).toBe(true);
    expect(hasRole(employeeUser, ['Administrator', 'Manager'])).toBe(false);
    expect(hasRole(null, ['Employee'])).toBe(false);
  });
});
