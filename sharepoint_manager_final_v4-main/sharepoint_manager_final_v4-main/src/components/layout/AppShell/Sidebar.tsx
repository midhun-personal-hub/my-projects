import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../../stores/useAppStore';
import { useWorkspaces, useMenus } from '../../../hooks/useConfiguration';
import { useAuthorization } from '../../../auth/AuthorizationContext';
import { IconResolver } from '../../common/IconResolver';
import {
  LayoutDashboard,
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  ListFilter,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Settings,
} from 'lucide-react';

export const LOCAL_STORAGE_SIDEBAR_KEY = 'app_sidebar_collapsed';

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenCreateWorkspace?: () => void;
  onOpenCreateMenu?: () => void;
  onOpenAdmin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
  onOpenCreateWorkspace,
  onOpenCreateMenu,
  onOpenAdmin,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Manage internal collapse state with localStorage persistence if not fully controlled externally
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SIDEBAR_KEY);
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const isCollapsed = externalIsCollapsed ?? internalCollapsed;

  const toggleCollapse = () => {
    if (externalOnToggleCollapse) {
      externalOnToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(LOCAL_STORAGE_SIDEBAR_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to persist sidebar collapse state', e);
        }
        return next;
      });
    }
  };

  const [isWorkspaceListOpen, setIsWorkspaceListOpen] = useState(true);

  const {
    activeWorkspaceId,
    activeMenuId,
    setActiveWorkspace,
    setActiveMenu,
    currentUser,
  } = useAppStore();

  const auth = useAuthorization();
  const { workspaces } = useWorkspaces();
  const { menus } = useMenus();

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeWsMenus = menus
    .filter((m) => m.workspaceId === activeWorkspaceId && m.visible)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const handleGoDashboard = () => {
    setActiveWorkspace(null);
    navigate('/dashboard');
  };

  const handleSelectWorkspace = (wsId: string) => {
    setActiveWorkspace(wsId);
    navigate(`/workspace/${wsId}`);
  };

  const handleSelectMenu = (menuId: string) => {
    setActiveMenu(menuId);
    navigate(`/lists/${menuId}`);
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out h-[calc(100vh-4rem)] sticky top-16 z-20 select-none`}
    >
      {/* Top Sidebar Header & Collapse Toggle */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={handleGoDashboard}
          title="Platform Dashboard"
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            isCollapsed ? 'justify-center w-full' : 'flex-1'
          } ${
            location.pathname === '/dashboard' && activeWorkspaceId === null
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Platform Dashboard</span>}
        </button>

        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Navigation Workspace Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
        {/* Workspaces Section */}
        <div>
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-2 mb-2">
              <button
                onClick={() => setIsWorkspaceListOpen(!isWorkspaceListOpen)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Workspaces ({workspaces.length})</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    isWorkspaceListOpen ? '' : '-rotate-90'
                  }`}
                />
              </button>

              {auth.isAdministrator && onOpenCreateWorkspace && (
                <button
                  onClick={onOpenCreateWorkspace}
                  className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                  title="Create Workspace"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 mb-2">
              <div
                title={`Workspaces (${workspaces.length})`}
                className="text-slate-400 p-1"
              >
                <Layers className="w-4 h-4" />
              </div>
            </div>
          )}

          {(!isCollapsed ? isWorkspaceListOpen : true) && (
            <div className="space-y-1">
              {workspaces
                .filter((w) => w.visible)
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((ws) => {
                  const isActive = ws.id === activeWorkspaceId;
                  const wsMenuCount = menus.filter(
                    (m) => m.workspaceId === ws.id && m.visible
                  ).length;

                  if (isCollapsed) {
                    return (
                      <button
                        key={ws.id}
                        onClick={() => handleSelectWorkspace(ws.id)}
                        title={`${ws.name} (${wsMenuCount} menus)`}
                        className={`w-full flex items-center justify-center p-2.5 rounded-lg transition-all ${
                          isActive
                            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold border border-brand-200 dark:border-brand-800'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: ws.color || '#3b82f6' }}
                        />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-brand-50/80 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 shadow-xs border border-brand-200/60 dark:border-brand-800/60 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color || '#3b82f6' }}
                        />
                        <span className="truncate">{ws.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500 font-medium">
                        {wsMenuCount}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Active Workspace Menus (SharePoint Lists) */}
        {activeWs && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            {!isCollapsed ? (
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5" />
                  <span className="truncate">{activeWs.name} Menus</span>
                </span>

                {auth.isAdministrator && onOpenCreateMenu && (
                  <button
                    onClick={onOpenCreateMenu}
                    className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Add SharePoint List Menu"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 mb-2">
                <div
                  title={`${activeWs.name} Menus`}
                  className="text-slate-400 p-1"
                >
                  <ListFilter className="w-4 h-4" />
                </div>
              </div>
            )}

            {activeWsMenus.length === 0 ? (
              !isCollapsed && (
                <div className="px-3 py-3 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 my-1">
                  <FolderOpen className="w-5 h-5 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">
                    No menus added yet
                  </p>
                  {auth.isAdministrator && onOpenCreateMenu && (
                    <button
                      onClick={onOpenCreateMenu}
                      className="mt-1.5 text-[10px] font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Connect List
                    </button>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-1">
                {activeWsMenus.map((menu) => {
                  const isMenuSelected = menu.id === activeMenuId;

                  if (isCollapsed) {
                    return (
                      <button
                        key={menu.id}
                        onClick={() => handleSelectMenu(menu.id)}
                        title={menu.name}
                        className={`w-full flex items-center justify-center p-2.5 rounded-lg transition-all ${
                          isMenuSelected
                            ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300 font-semibold border-l-2 border-brand-600'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <IconResolver
                          name={menu.iconName}
                          className="w-4 h-4 shrink-0"
                        />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={menu.id}
                      onClick={() => handleSelectMenu(menu.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isMenuSelected
                          ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold border-l-2 border-brand-600'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <IconResolver
                          name={menu.iconName}
                          className="w-4 h-4 shrink-0 text-slate-500"
                        />
                        <span className="truncate">{menu.name}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isMenuSelected
                            ? 'text-brand-600 opacity-100'
                            : 'opacity-0'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Panel Quick Action (if Administrator) */}
      {auth.isAdministrator && onOpenAdmin && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onOpenAdmin}
            title="System Settings & Admin Panel"
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <Settings className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
            {!isCollapsed && <span>Admin Settings</span>}
          </button>
        </div>
      )}

      {/* Footer Info Box */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] text-slate-500 dark:text-slate-400">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Graph API Direct
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
              OAuth 2.0
            </span>
          </div>
        ) : (
          <div className="flex justify-center" title="Microsoft Graph API Connected">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
