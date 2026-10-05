import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { useWorkspaces, useMenus } from '../../hooks/useConfiguration';
import { useAuthorization } from '../../auth/AuthorizationContext';
import { IconResolver } from '../common/IconResolver';
import {
  LayoutDashboard,
  Plus,
  ChevronRight,
  FolderOpen,
  ChevronDown,
  Layers,
  ListFilter,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  onOpenCreateMenu: () => void;
  onOpenCreateWorkspace: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenCreateMenu,
  onOpenCreateWorkspace,
}) => {
  const navigate = useNavigate();
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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWorkspaceListOpen, setIsWorkspaceListOpen] = useState(true);
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
      } bg-slate-50 dark:bg-slate-900/70 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300 h-[calc(100vh-4rem)] sticky top-16 relative group`}
    >
      {/* Collapse Toggle Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          onClick={handleGoDashboard}
          title="Platform Dashboard"
          className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            isCollapsed ? 'justify-center w-full' : 'flex-1'
          } ${
            activeWorkspaceId === null
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Platform Dashboard</span>}
        </button>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={`p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors ${
            isCollapsed ? 'hidden group-hover:flex absolute -right-3 top-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md z-20 rounded-full p-1' : ''
          }`}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Workspace Context Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
        {/* Workspaces List / Selector */}
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

              {auth.isAdministrator && (
                <button
                  onClick={onOpenCreateWorkspace}
                  className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
                  title="Create Workspace"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 mb-2">
              <div
                title={`Workspaces (${workspaces.length})`}
                className="text-slate-400 p-1"
              >
                <Layers className="w-4 h-4" />
              </div>
              {auth.isAdministrator && (
                <button
                  onClick={onOpenCreateWorkspace}
                  className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Create Workspace"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
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
                        className={`w-full flex items-center justify-center p-2 rounded-lg transition-all ${
                          isActive
                            ? 'bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-300 shadow-sm border border-slate-200/80 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: ws.color }}
                        />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-300 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color }}
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
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            {!isCollapsed ? (
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>{activeWs.name} Menus</span>
                </span>

                {auth.isAdministrator && (
                  <button
                    onClick={onOpenCreateMenu}
                    className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Add SharePoint List Menu"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 mb-2">
                <div
                  title={`${activeWs.name} Menus`}
                  className="text-slate-400 p-1"
                >
                  <ListFilter className="w-4 h-4" />
                </div>
                {auth.isAdministrator && (
                  <button
                    onClick={onOpenCreateMenu}
                    className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Add SharePoint List Menu"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {activeWsMenus.length === 0 ? (
              !isCollapsed && (
                <div className="px-3 py-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 my-2">
                  <FolderOpen className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="text-xs text-slate-500 font-medium">
                    No menus added yet
                  </p>
                  {auth.isAdministrator && (
                    <button
                      onClick={onOpenCreateMenu}
                      className="mt-2 text-[11px] font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Connect SharePoint List
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
                        className={`w-full flex items-center justify-center p-2 rounded-lg transition-all ${
                          isMenuSelected
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300 font-semibold border-l-2 border-brand-600'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        isMenuSelected
                          ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold border-l-2 border-brand-600'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
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

      {/* Footer Info Box */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 text-[11px] text-slate-500 dark:text-slate-400">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Graph API Direct
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
              OAuth 2.0 PKCE
            </span>
          </div>
        ) : (
          <div className="flex justify-center" title="Graph API Direct - OAuth 2.0 PKCE">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};


