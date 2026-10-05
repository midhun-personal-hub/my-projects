import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../../stores/useAppStore';
import { useWorkspaces, useMenus } from '../../../hooks/useConfiguration';
import { useAuthorization } from '../../../auth/AuthorizationContext';
import {
  Home,
  ChevronRight,
  Layers,
  Search,
  Sun,
  Moon,
  Shield,
  Activity,
  Database,
  X,
  History,
  ChevronDown,
} from 'lucide-react';

export interface HeaderProps {
  onOpenAdmin?: () => void;
  onOpenAudit?: () => void;
  globalSearch?: string;
  onGlobalSearchChange?: (value: string) => void;
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAdmin,
  onOpenAudit,
  globalSearch = '',
  onGlobalSearchChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    isDarkMode,
    toggleDarkMode,
    currentUser,
    setActiveWorkspace,
    logout,
  } = useAppStore();

  const auth = useAuthorization();
  const { workspaces } = useWorkspaces();
  const { menus } = useMenus();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const { instance } = useMsal();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    queryClient.clear();
    logout();
    setIsProfileMenuOpen(false);
    try {
      await instance.logoutPopup();
    } catch (e) {
      console.warn('MSAL logoutPopup failed, attempting redirect logout:', e);
      try {
        await instance.logoutRedirect();
      } catch (err) {
        console.warn('MSAL logoutRedirect failed:', err);
      }
    }
    navigate('/login');
  };

  // Parse location path to dynamically construct Breadcrumb navigation trail
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/dashboard', icon: Home },
    ];

    const pathSegments = location.pathname.split('/').filter(Boolean);

    if (pathSegments.length === 0 || pathSegments[0] === 'dashboard') {
      items.push({ label: 'Dashboard', path: '/dashboard' });
      return items;
    }

    if (pathSegments[0] === 'workspace' && pathSegments[1]) {
      const wsId = pathSegments[1];
      const ws = workspaces.find((w) => w.id === wsId);
      items.push({ label: 'Workspaces', path: '/dashboard' });
      items.push({
        label: ws ? ws.name : 'Workspace',
        path: `/workspace/${wsId}`,
      });
    } else if (pathSegments[0] === 'lists' && pathSegments[1]) {
      const menuId = pathSegments[1];
      const menu = menus.find((m) => m.id === menuId);
      const ws = menu ? workspaces.find((w) => w.id === menu.workspaceId) : null;

      if (ws) {
        items.push({ label: ws.name, path: `/workspace/${ws.id}` });
      } else {
        items.push({ label: 'Lists', path: '/dashboard' });
      }

      items.push({
        label: menu ? menu.name : 'List View',
        path: `/lists/${menuId}`,
      });

      if (pathSegments[2]) {
        items.push({
          label: `Item #${pathSegments[2]}`,
          path: `/lists/${menuId}/${pathSegments[2]}`,
        });
      }
    } else if (pathSegments[0] === 'admin') {
      items.push({ label: 'Administration', path: '/admin' });
      items.push({ label: 'System Settings', path: '/admin' });
    } else {
      pathSegments.forEach((segment, idx) => {
        const url = `/${pathSegments.slice(0, idx + 1).join('/')}`;
        const formattedLabel =
          segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        items.push({ label: formattedLabel, path: url });
      });
    }

    return items;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 transition-colors">
      {/* Left Section: Brand Logo & Dynamic Breadcrumb Trail */}
      <div className="flex items-center gap-3 md:gap-5 min-w-0">
        <button
          onClick={() => {
            setActiveWorkspace(null);
            navigate('/dashboard');
          }}
          className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 font-bold text-base hover:opacity-90 transition-opacity shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="leading-tight text-sm font-semibold tracking-tight">SharePoint Platform</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">Enterprise Portal</span>
          </div>
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-200 dark:border-slate-800 min-w-0 text-xs font-medium text-slate-500 dark:text-slate-400">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const IconComp = item.icon;

            return (
              <React.Fragment key={item.path + index}>
                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                {isLast ? (
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px] bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.path}
                    className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1 shrink-0"
                  >
                    {IconComp && <IconComp className="w-3.5 h-3.5" />}
                    <span className="truncate max-w-[120px]">{item.label}</span>
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Middle Section: Global Search */}
      {onGlobalSearchChange && (
        <div className="flex-1 max-w-xs xl:max-w-md hidden lg:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder="Global search lists, columns, items..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            {globalSearch && (
              <button
                onClick={() => onGlobalSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Right Section: System Controls & User Profile Block */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Entra ID Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span>Microsoft Graph API</span>
        </div>

        {/* Audit Log Trigger */}
        {onOpenAudit && (
          <button
            onClick={onOpenAudit}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Audit Logs"
          >
            <History className="w-4 h-4" />
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Admin Configuration Button */}
        {auth.isAdministrator && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Admin</span>
          </button>
        )}

        {/* User Profile Block */}
        <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={currentUser.displayName}
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-brand-500/30 overflow-hidden">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser.displayName.charAt(0)
              )}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {currentUser.displayName}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {currentUser.jobTitle || auth.role || 'User'}
              </span>
            </div>
          </button>

          {/* Profile Claims Popup Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-xs animate-fade-in">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {currentUser.displayName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="py-2.5 space-y-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">UPN:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                    {currentUser.userPrincipalName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">
                    {auth.role || 'Unassigned'}
                  </span>
                </div>
                {currentUser.department && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {currentUser.department}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Microsoft Entra ID Claims</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              </div>
              <button
                onClick={handleLogout}
                className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-center border border-red-500/20 transition-all cursor-pointer text-xs"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
