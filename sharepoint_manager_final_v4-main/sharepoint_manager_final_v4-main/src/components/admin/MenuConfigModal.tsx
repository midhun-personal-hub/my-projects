import React, { useState } from 'react';
import { MenuConfig, WorkspaceConfig } from '../../types';
import { X, Link2, Database, Shield } from 'lucide-react';
import { IconPicker } from '../common/IconPicker';

interface MenuConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (menu: Omit<MenuConfig, 'id'>) => void;
  workspaces: WorkspaceConfig[];
  activeWorkspaceId?: string | null;
  initialData?: MenuConfig;
}

export const MenuConfigModal: React.FC<MenuConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  workspaces,
  activeWorkspaceId,
  initialData,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(initialData?.name || '');
  const [workspaceId, setWorkspaceId] = useState(
    initialData?.workspaceId || activeWorkspaceId || workspaces[0]?.id || ''
  );
  const [iconName, setIconName] = useState(initialData?.iconName || 'ListFilter');
  const [sharePointSiteId, setSharePointSiteId] = useState(
    initialData?.sharePointSiteId || 'contoso.sharepoint.com,site-guid-101'
  );
  const [sharePointListId, setSharePointListId] = useState(
    initialData?.sharePointListId || 'list-active-projects-id'
  );
  const [sharePointListName, setSharePointListName] = useState(
    initialData?.sharePointListName || 'SharePoint List'
  );
  const [primaryColumn, setPrimaryColumn] = useState(initialData?.primaryColumn || 'Title');
  const [visibleColumnsInput, setVisibleColumnsInput] = useState(
    initialData?.visibleColumns.join(', ') || 'Title, Description, Status, Priority, Budget'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;

    const parsedColumns = visibleColumnsInput
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    onSubmit({
      name,
      workspaceId,
      iconName,
      displayOrder: initialData?.displayOrder || 1,
      visible: true,
      sharePointSiteId,
      sharePointListId,
      sharePointListName,
      primaryColumn,
      visibleColumns: parsedColumns.length > 0 ? parsedColumns : ['Title'],
      defaultSortColumn: primaryColumn,
      defaultSortDirection: 'asc',
      searchColumns: [primaryColumn],
      allowSearch: true,
      allowFilter: true,
      allowExport: true,
      allowFileUpload: true,
      permissions: initialData?.permissions || {
        Administrator: { create: true, read: true, update: true, delete: true, export: true },
        Manager: { create: true, read: true, update: true, delete: false, export: true },
        Employee: { create: false, read: true, update: false, delete: false, export: true },
      },
      pageSize: 10,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {initialData ? 'Edit Menu Configuration' : 'Connect New SharePoint List Menu'}
              </h3>
              <p className="text-[11px] text-slate-400">Map Graph API list endpoint to dynamic navigation menu</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Menu Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Active Purchase Orders"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Parent Workspace <span className="text-red-500">*</span>
              </label>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Menu Icon
            </label>
            <IconPicker value={iconName} onChange={setIconName} />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-brand-600" />
              <span>SharePoint & Graph API Link</span>
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                SharePoint Site ID / Graph Scope
              </label>
              <input
                type="text"
                required
                value={sharePointSiteId}
                onChange={(e) => setSharePointSiteId(e.target.value)}
                placeholder="contoso.sharepoint.com,guid1,guid2"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                SharePoint List GUID / ID
              </label>
              <input
                type="text"
                required
                value={sharePointListId}
                onChange={(e) => setSharePointListId(e.target.value)}
                placeholder="list-active-projects-id"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Primary Display Column</label>
            <input
              type="text"
              value={primaryColumn}
              onChange={(e) => setPrimaryColumn(e.target.value)}
              placeholder="Title"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Visible Columns (Comma separated internal names)
            </label>
            <input
              type="text"
              value={visibleColumnsInput}
              onChange={(e) => setVisibleColumnsInput(e.target.value)}
              placeholder="Title, Status, Priority, Budget"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none font-mono text-[11px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
            >
              Save Menu Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
