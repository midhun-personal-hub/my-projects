import React, { useState } from 'react';
import { WorkspaceConfig, MenuConfig, UserRole } from '../../types';
import { useWorkspaces, useMenus, useWorkspaceMutations, useMenuMutations, useControlledMigration } from '../../hooks/useConfiguration';
import {
  X,
  Settings,
  Layers,
  ListFilter,
  Shield,
  Plus,
  Trash2,
  Edit2,
  Check,
  Building2,
  Lock,
  ArrowUpRight,
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateWorkspace: () => void;
  onOpenCreateMenu: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  onOpenCreateWorkspace,
  onOpenCreateMenu,
}) => {
  const { workspaces } = useWorkspaces();
  const { menus } = useMenus();
  const { deleteWorkspace } = useWorkspaceMutations();
  const { deleteMenu } = useMenuMutations();
  const migrateMutation = useControlledMigration();

  const [activeTab, setActiveTab] = useState<'workspaces' | 'menus' | 'permissions'>('workspaces');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-600 text-white shadow-md">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                SharePoint Platform Administration
              </h2>
              <p className="text-xs text-slate-500">Configure Workspaces, Menus, Graph API links & Role CRUD permissions</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('workspaces')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'workspaces'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" /> Workspaces ({workspaces.length})
            </button>

            <button
              onClick={() => setActiveTab('menus')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'menus'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="w-4 h-4" /> SharePoint Menus ({menus.length})
            </button>

            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" /> Role Permissions Matrix
            </button>
          </div>

          <button
            onClick={() => migrateMutation.mutate()}
            disabled={migrateMutation.isPending}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 transition-colors"
            title="Explicitly migrate local configuration to SharePoint if available"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-brand-500" />
            {migrateMutation.isPending ? 'Migrating...' : 'Migrate Local Config'}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {/* Workspaces Tab */}
          {activeTab === 'workspaces' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">Configured Department Workspaces</span>
                <button
                  onClick={onOpenCreateWorkspace}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Workspace
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {workspaces.map((ws) => {
                  const wsMenus = menus.filter((m) => m.workspaceId === ws.id);

                  return (
                    <div
                      key={ws.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: ws.color }}
                          />
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{ws.name}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{ws.description}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteWorkspace.mutate(ws.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded cursor-pointer"
                          title="Delete Workspace"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Order: {ws.displayOrder}</span>
                        <span className="font-semibold text-brand-600">{wsMenus.length} Connected Menus</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menus Tab */}
          {activeTab === 'menus' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">SharePoint List Menus</span>
                <button
                  onClick={onOpenCreateMenu}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Connect SharePoint List
                </button>
              </div>

              <div className="space-y-2">
                {menus.map((menu) => {
                  const ws = workspaces.find((w) => w.id === menu.workspaceId);

                  return (
                    <div
                      key={menu.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{menu.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600">
                            Workspace: {ws?.name || 'Unassigned'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          Site: {menu.sharePointSiteId} | List: {menu.sharePointListId}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteMenu.mutate(menu.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded cursor-pointer"
                        title="Delete Menu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Permissions Matrix Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <p className="text-slate-500">
                Configure default CRUD operation permissions mapped to Microsoft Entra ID security roles.
              </p>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-center">Create Item</th>
                      <th className="p-3 text-center">Read Item</th>
                      <th className="p-3 text-center">Update Item</th>
                      <th className="p-3 text-center">Delete Item</th>
                      <th className="p-3 text-center">Export CSV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(['Administrator', 'Manager', 'Employee'] as UserRole[]).map((role) => (
                      <tr key={role} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{role}</td>
                        <td className="p-3 text-center">
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        </td>
                        <td className="p-3 text-center">
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        </td>
                        <td className="p-3 text-center">
                          {role !== 'Employee' ? (
                            <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {role === 'Administrator' ? (
                            <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
