import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { useWorkspaces, useMenus } from '../../hooks/useConfiguration';
import { useAuthorization } from '../../auth/AuthorizationContext';
import { IconResolver } from '../common/IconResolver';
import {
  Building2,
  ListFilter,
  Plus,
  ArrowRight,
  Shield,
  Search,
  FolderCheck,
  Activity,
  Layers,
  Database,
  Users,
} from 'lucide-react';

interface DashboardProps {
  onOpenCreateWorkspace: () => void;
  onOpenCreateMenu: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenCreateWorkspace,
  onOpenCreateMenu,
}) => {
  const navigate = useNavigate();
  const {
    setActiveWorkspace,
    setActiveMenu,
    currentUser,
  } = useAppStore();

  const auth = useAuthorization();
  const { workspaces } = useWorkspaces();
  const { menus } = useMenus();

  const [searchQuery, setSearchQuery] = useState('');

  const handleWorkspaceClick = (wsId: string) => {
    setActiveWorkspace(wsId);
    const wsMenus = menus.filter((m) => m.workspaceId === wsId && m.visible);
    if (wsMenus.length > 0) {
      setActiveMenu(wsMenus[0].id);
    }
    navigate(`/workspace/${wsId}`);
  };

  const filteredWorkspaces = workspaces
    .filter((w) => w.visible)
    .filter(
      (w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50 dark:bg-slate-950/40">
      {/* Hero Banner Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 md:p-8 text-white shadow-xl overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold backdrop-blur-xs">
            <Building2 className="w-3.5 h-3.5" />
            <span>Enterprise SharePoint Platform</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            SharePoint Management Portal
          </h1>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Manage corporate SharePoint Lists across department workspaces without directly modifying site schemas. Features dynamic forms, flexible data tables, and direct Microsoft Graph integration.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            {auth.isAdministrator && (
              <button
                onClick={onOpenCreateWorkspace}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 font-bold shadow-md flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Workspace
              </button>
            )}

            <button
              onClick={onOpenCreateMenu}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 font-semibold flex items-center gap-2 backdrop-blur-xs transition-all"
            >
              <ListFilter className="w-4 h-4" /> Link SharePoint List
            </button>
          </div>
        </div>
      </div>

      {/* Platform Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-enterprise flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Active Workspaces</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{workspaces.length}</h3>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-enterprise flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <FolderCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Connected Lists</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{menus.length}</h3>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-enterprise flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Active Role</p>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{auth.role || 'Unassigned'}</h3>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-enterprise flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">API Connection</p>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Microsoft Graph API
            </h3>
          </div>
        </div>
      </div>

      {/* Workspace Directory Header & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Department Workspaces</h2>
            <p className="text-xs text-slate-500">Select a workspace card to view linked SharePoint lists and CRUD tools</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </div>

        {/* Workspace Cards Grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              No workspaces configured.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Connect a SharePoint list or add a workspace to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkspaces.map((ws) => {
            const wsMenus = menus.filter((m) => m.workspaceId === ws.id && m.visible);

            return (
              <div
                key={ws.id}
                onClick={() => handleWorkspaceClick(ws.id)}
                className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-enterprise hover:shadow-enterprise-lg hover:border-brand-500/50 dark:hover:border-brand-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                      style={{ backgroundColor: ws.color }}
                    >
                      <IconResolver name={ws.iconName} className="w-5 h-5" />
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {wsMenus.length} {wsMenus.length === 1 ? 'List' : 'Lists'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {ws.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {ws.description}
                    </p>
                  </div>
                </div>

                {/* Card Footer Menu Previews */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                  <span className="flex items-center gap-1">
                    Open Workspace <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {ws.id}</span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
