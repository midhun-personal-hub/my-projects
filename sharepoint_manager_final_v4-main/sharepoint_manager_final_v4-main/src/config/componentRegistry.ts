import React from 'react';
import { DataTable } from '../components/tables/DataTable';
import { DynamicForm } from '../components/forms/DynamicForm';
import { Dashboard } from '../components/dashboard/Dashboard';
import { AdminPanel } from '../components/admin/AdminPanel';
import { WorkspaceView } from '../components/workspace/WorkspaceView';

export const componentRegistry = {
  table: DataTable,
  form: DynamicForm,
  dashboard: Dashboard,
  admin: AdminPanel,
  workspace: WorkspaceView,
} as const;

export type ComponentRegistryKey = keyof typeof componentRegistry;

export function getRegisteredComponent(key: string): React.ComponentType<any> | null {
  if (Object.prototype.hasOwnProperty.call(componentRegistry, key)) {
    return componentRegistry[key as ComponentRegistryKey];
  }
  console.warn(`[ComponentRegistry] Unregistered or unsafe component key attempted: "${key}"`);
  return null;
}
