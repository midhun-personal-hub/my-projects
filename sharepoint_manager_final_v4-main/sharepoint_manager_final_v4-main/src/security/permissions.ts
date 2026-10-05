import { UserRole } from '../types';

export type Permission =
  | 'workspace.read'
  | 'workspace.manage'
  | 'menu.read'
  | 'menu.manage'
  | 'item.create'
  | 'item.read'
  | 'item.update'
  | 'item.delete'
  | 'item.bulkUpdate'
  | 'item.bulkDelete';

// Central Role-Permission Mapping Matrix
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Administrator: [
    'workspace.read',
    'workspace.manage',
    'menu.read',
    'menu.manage',
    'item.create',
    'item.read',
    'item.update',
    'item.delete',
    'item.bulkUpdate',
    'item.bulkDelete',
  ],
  Manager: [
    'workspace.read',
    'menu.read',
    'item.create',
    'item.read',
    'item.update',
    'item.delete',
    'item.bulkUpdate',
  ],
  Employee: [
    'workspace.read',
    'menu.read',
    'item.read',
    'item.update',
  ],
};
