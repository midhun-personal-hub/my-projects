import { UserProfile } from '../types';
import { Permission, ROLE_PERMISSIONS } from './permissions';

/**
 * Evaluates whether a user's RBAC role contains the requested permission claim
 */
export function hasPermission(user: UserProfile | null, permission: Permission): boolean {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
}

/**
 * Evaluates whether a user context holds any of the target role types
 */
export function hasRole(user: UserProfile | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
