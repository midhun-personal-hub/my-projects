import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, LOCAL_STORAGE_SIDEBAR_KEY } from './Sidebar';

export interface AppShellProps {
  children?: React.ReactNode;
  onOpenAdmin?: () => void;
  onOpenAudit?: () => void;
  onOpenCreateWorkspace?: () => void;
  onOpenCreateMenu?: () => void;
  globalSearch?: string;
  onGlobalSearchChange?: (value: string) => void;
}

/**
 * Master AppShell Component
 * Coordinates top Header with dynamic breadcrumbs, responsive collapsible Sidebar,
 * and main workspace content layout area maximizing horizontal space.
 */
export const AppShell: React.FC<AppShellProps> = ({
  children,
  onOpenAdmin,
  onOpenAudit,
  onOpenCreateWorkspace,
  onOpenCreateMenu,
  globalSearch,
  onGlobalSearchChange,
}) => {
  // Read initial collapsed state from localStorage ('app_sidebar_collapsed')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SIDEBAR_KEY);
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LOCAL_STORAGE_SIDEBAR_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist sidebar collapse state', e);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-brand-500 selection:text-white">
      {/* Top Header Navigation */}
      <Header
        onOpenAdmin={onOpenAdmin}
        onOpenAudit={onOpenAudit}
        globalSearch={globalSearch}
        onGlobalSearchChange={onGlobalSearchChange}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Collapsible Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onOpenCreateWorkspace={onOpenCreateWorkspace}
          onOpenCreateMenu={onOpenCreateMenu}
          onOpenAdmin={onOpenAdmin}
        />

        {/* Dynamic Content Workspace View - Fills maximum available screen width */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};
