import { useState, useMemo, useEffect } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  RotateCcw,
  Layers,
  Database,
  Globe,
  SlidersHorizontal,
  TableProperties,
} from 'lucide-react';
import { useConnectionsStore } from '../../state/connectionsStore';
import { useDemoDataStore } from '../../state/demoDataStore';
import { SharePointIcon } from './SharePointIcon';
import type { SharePointListConnection } from '../../types/connections';

export function SharePointSidebar() {
  const {
    connections,
    activeConnectionId,
    setActiveConnectionId,
    sidebarCollapsed,
    toggleSidebar,
    collapsedSites,
    toggleSiteGroup,
    multiViewsCollapsed,
    singleViewsCollapsed,
    toggleMultiViews,
    toggleSingleViews,
    searchQuery,
    setSearchQuery,
    openCreateModal,
    openEditModal,
    deleteConnection,
    moveConnection,
    reorderConnections,
    resetToDefaults,
  } = useConnectionsStore();

  const [hoveredMenuId, setHoveredMenuId] = useState<string | null>(null);
  const [openMenuDropdownId, setOpenMenuDropdownId] = useState<string | null>(null);
  const [draggedMenuId, setDraggedMenuId] = useState<string | null>(null);
  const [dragOverMenuId, setDragOverMenuId] = useState<string | null>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuDropdownId && !(e.target as HTMLElement).closest('.menu-dropdown-container')) {
        setOpenMenuDropdownId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuDropdownId]);

  // When searching, auto-expand sections to show matched results
  const isSearching = searchQuery.trim().length > 0;

  // Filter connections by search query
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const q = searchQuery.toLowerCase();
    return connections.filter((c) => {
      const matchName = c.displayName.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchSources = (c.sources || []).some(
        (s) =>
          s.siteName.toLowerCase().includes(q) ||
          s.listName.toLowerCase().includes(q) ||
          s.selectedColumnNames.some((col) => col.toLowerCase().includes(q))
      );
      return matchName || matchDesc || matchSources;
    });
  }, [connections, searchQuery]);

  // Split into Multi-Source Views (2+ SharePoint lists) and Single-List Views
  const { multiSourceMenus, singleSourceMenus } = useMemo(() => {
    const sorted = [...filteredConnections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const multi: SharePointListConnection[] = [];
    const single: SharePointListConnection[] = [];

    sorted.forEach((c) => {
      if (c.sources && c.sources.length > 1) {
        multi.push(c);
      } else {
        single.push(c);
      }
    });

    return { multiSourceMenus: multi, singleSourceMenus: single };
  }, [filteredConnections]);

  const isMultiActive = useMemo(() => {
    return multiSourceMenus.some((c) => c.id === activeConnectionId);
  }, [multiSourceMenus, activeConnectionId]);

  const isSingleActive = useMemo(() => {
    return singleSourceMenus.some((c) => c.id === activeConnectionId);
  }, [singleSourceMenus, activeConnectionId]);

  const isMultiCollapsed = isSearching ? false : multiViewsCollapsed;
  const isSingleCollapsed = isSearching ? false : singleViewsCollapsed;

  const renderConnectionItem = (conn: SharePointListConnection, itemIndex: number, totalInGroup: number) => {
    const isActive = conn.id === activeConnectionId;
    const isHovered = hoveredMenuId === conn.id;
    const sourceCount = conn.sources?.length || 1;
    const totalFields = (conn.sources || []).reduce(
      (sum, s) => sum + (s.selectedColumnNames?.length || 0),
      0
    );

    if (sidebarCollapsed) {
      // Collapsed Item: Icon-only with rich hover tooltip
      return (
        <div key={conn.id} className="relative flex justify-center group py-1">
          <button
            type="button"
            onClick={() => setActiveConnectionId(conn.id)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-950/60 ring-2 ring-blue-500 shadow-xs'
                : 'hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-600 dark:text-slate-300'
            }`}
            aria-label={conn.displayName}
          >
            <SharePointIcon
              name={conn.icon}
              color={conn.color}
              isActive={isActive}
              className="w-4 h-4"
            />

            {/* Active indicator bar */}
            {isActive && (
              <span className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
            )}

            {/* Multi-source pill badge indicator on collapsed icon */}
            {sourceCount > 1 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {sourceCount}
              </span>
            )}
          </button>

          {/* Floating Tooltip */}
          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-2 bg-neutral-900 dark:bg-slate-900 text-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 min-w-[240px] border border-neutral-800 dark:border-white/15">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white leading-tight">{conn.displayName}</span>
              {sourceCount > 1 && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500 text-white">
                  {sourceCount} SharePoint Lists
                </span>
              )}
            </div>

            <p className="text-[10px] text-neutral-400 dark:text-slate-400 mt-1">
              Connected SharePoint sources:
            </p>
            <div className="mt-1 space-y-1 pt-1 border-t border-neutral-800 dark:border-white/10 text-[10px] text-neutral-300 dark:text-slate-300">
              {(conn.sources || []).map((s, idx) => (
                <div key={s.id || idx} className="flex items-center justify-between">
                  <span className="truncate max-w-[150px]">{s.listName}</span>
                  <span className="text-blue-300 font-mono">{s.selectedColumnNames?.length || 0} fields</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-300 font-mono mt-1.5 pt-1 border-t border-neutral-800 dark:border-white/10">
              Total {totalFields} fields in single table
            </p>
          </div>
        </div>
      );
    }

    const isDragging = draggedMenuId === conn.id;
    const isDragOver = dragOverMenuId === conn.id && draggedMenuId !== conn.id;
    const isDropdownOpen = openMenuDropdownId === conn.id;

    // Expanded Item
    return (
      <div
        key={conn.id}
        draggable={!isDropdownOpen}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', conn.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggedMenuId(conn.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverMenuId !== conn.id) {
            setDragOverMenuId(conn.id);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (dragOverMenuId === conn.id) {
            setDragOverMenuId(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedMenuId && draggedMenuId !== conn.id) {
            reorderConnections(draggedMenuId, conn.id);
          }
          setDraggedMenuId(null);
          setDragOverMenuId(null);
        }}
        onDragEnd={() => {
          setDraggedMenuId(null);
          setDragOverMenuId(null);
        }}
        onMouseEnter={() => setHoveredMenuId(conn.id)}
        onMouseLeave={() => setHoveredMenuId(null)}
        className={`group/item relative flex items-center justify-between rounded-xl px-2 py-2 transition-all cursor-pointer select-none ${
          isDragging
            ? 'opacity-30 scale-[0.98] border-dashed border-neutral-400 dark:border-slate-500 bg-neutral-100 dark:bg-slate-800'
            : isDragOver
            ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm'
            : isActive
            ? 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/80 shadow-xs'
            : 'hover:bg-neutral-100/70 dark:hover:bg-white/5 text-neutral-700 dark:text-slate-300 border border-transparent'
        }`}
        onClick={() => setActiveConnectionId(conn.id)}
      >
        {/* Active indicator bar */}
        {isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
        )}

        {/* Drag Handle */}
        <div
          className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-300 dark:text-slate-600 hover:text-neutral-600 dark:hover:text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0"
          title="Drag to reorder menu position"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Menu Icon and Labels */}
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
          <SharePointIcon
            name={conn.icon}
            color={conn.color}
            isActive={isActive}
            className="w-4 h-4 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className={`text-xs truncate ${
                  isActive ? 'font-semibold text-neutral-900 dark:text-slate-100' : 'font-medium text-neutral-800 dark:text-slate-200'
                }`}
                title={conn.displayName}
              >
                {conn.displayName}
              </p>
              {sourceCount > 1 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 flex-shrink-0">
                  {sourceCount} SP Lists
                </span>
              )}
            </div>

            {/* Connected Lists summary */}
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5">
              <span className="truncate max-w-[125px] text-[10px] text-neutral-500 dark:text-slate-400">
                {(conn.sources || []).map((s) => s.listName.slice(0, 10)).join(' + ')}
              </span>
              <span>•</span>
              <span className="text-[10px] font-mono text-neutral-600 dark:text-slate-300 bg-neutral-100/90 dark:bg-white/10 px-1 rounded">
                {totalFields} fields
              </span>
            </div>
          </div>
        </div>

        {/* Three-Dot Button & Options Dropdown */}
        <div
          className={`menu-dropdown-container relative flex items-center flex-shrink-0 transition-opacity ${
            isHovered || isDropdownOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            id={`btn-menu-more-${conn.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuDropdownId(isDropdownOpen ? null : conn.id);
            }}
            className={`p-1 rounded-lg text-neutral-400 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-100 hover:bg-neutral-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer ${
              isDropdownOpen ? 'bg-neutral-200 dark:bg-white/15 text-neutral-900 dark:text-white shadow-2xs' : ''
            }`}
            title="Menu Options"
            aria-expanded={isDropdownOpen}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {/* Floating Dropdown Menu */}
          {isDropdownOpen && (
            <div
              id={`dropdown-menu-${conn.id}`}
              className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1a2436] rounded-xl shadow-xl border border-neutral-200/90 dark:border-white/15 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-neutral-800 dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Option 1: Edit Menu */}
              <button
                type="button"
                id={`btn-menu-edit-${conn.id}`}
                onClick={() => {
                  setOpenMenuDropdownId(null);
                  openEditModal(conn.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-white/5 transition-colors cursor-pointer text-left font-medium"
              >
                <Pencil className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-400" />
                <span>Edit Menu</span>
              </button>

              {/* Option 2: Move Up (click alternative to drag) */}
              <button
                type="button"
                id={`btn-menu-move-up-${conn.id}`}
                disabled={itemIndex === 0}
                onClick={() => {
                  moveConnection(conn.id, 'up');
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-left"
              >
                <ArrowUp className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-400" />
                <span>Move Up</span>
              </button>

              {/* Option 3: Move Down (click alternative to drag) */}
              <button
                type="button"
                id={`btn-menu-move-down-${conn.id}`}
                disabled={itemIndex === totalInGroup - 1}
                onClick={() => {
                  moveConnection(conn.id, 'down');
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-left"
              >
                <ArrowDown className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-400" />
                <span>Move Down</span>
              </button>

              <div className="my-1 border-t border-neutral-100 dark:border-white/10" />

              {/* Option 4: Delete Menu */}
              <button
                type="button"
                id={`btn-menu-delete-${conn.id}`}
                disabled={connections.length <= 1}
                onClick={() => {
                  setOpenMenuDropdownId(null);
                  deleteConnection(conn.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-left font-medium"
                title={connections.length <= 1 ? 'At least one menu must remain configured' : 'Delete menu'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Menu</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside
      id="sharepoint-sidebar"
      aria-label="SharePoint Multi-Source Menus Navigation"
      className={`relative h-screen bg-white dark:bg-[#131d2e] border-r border-neutral-200/90 dark:border-white/10 flex flex-col flex-shrink-0 transition-all duration-200 ease-in-out select-none z-30 ${
        sidebarCollapsed ? 'w-16' : 'w-72 lg:w-80'
      }`}
    >
      {/* 1. Header: Branding & Toggle */}
      <div className="flex items-center justify-between h-14 px-3.5 border-b border-neutral-200/80 dark:border-white/10 flex-shrink-0 bg-neutral-50/40 dark:bg-[#0f172a]/60">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white font-bold shadow-xs flex-shrink-0">
              <span className="text-sm tracking-tighter">SP</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-neutral-900 dark:text-slate-100 truncate tracking-tight uppercase">
                SharePoint Hub
              </h1>
              <p className="text-[11px] text-neutral-500 dark:text-slate-400 truncate">Multi-Source Menus</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div
              className="w-8 h-8 rounded-lg bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white font-bold shadow-xs cursor-pointer"
              title="SharePoint Hub"
              onClick={toggleSidebar}
            >
              <span className="text-xs font-bold">SP</span>
            </div>
          </div>
        )}

        <button
          id="btn-toggle-sidebar"
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100 hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 2. Top Action & Search (Expanded mode only) */}
      {!sidebarCollapsed ? (
        <div className="p-3 border-b border-neutral-200/60 dark:border-white/10 space-y-2.5 bg-neutral-50/20 dark:bg-transparent flex-shrink-0">
          <button
            id="btn-add-connection-expanded"
            type="button"
            onClick={openCreateModal}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Menu (Connect SP Lists)</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
            <input
              id="sidebar-connection-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menus or lists..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-100/70 hover:bg-neutral-100 focus:bg-white dark:bg-[#0b1120] dark:hover:bg-[#0f172a] dark:focus:bg-[#0f172a] text-neutral-900 dark:text-slate-100 border border-neutral-200/80 dark:border-white/15 focus:border-blue-500 rounded-lg outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      ) : (
        <div className="p-2 border-b border-neutral-200/60 dark:border-white/10 flex flex-col items-center flex-shrink-0">
          <button
            id="btn-add-connection-collapsed"
            type="button"
            onClick={openCreateModal}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer group relative"
            title="Create Menu (Connect SharePoint Lists)"
            aria-label="Create Menu"
          >
            <Plus className="w-4 h-4" />
            <span className="pointer-events-none absolute left-full ml-2 px-2.5 py-1 bg-neutral-900 dark:bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
              + Create Menu
            </span>
          </button>
        </div>
      )}

      {/* 3. Navigation Menus List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {filteredConnections.length === 0 ? (
          <div className="text-center py-8 px-3">
            <Database className="w-6 h-6 text-neutral-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-neutral-600 dark:text-slate-400">No menus match</p>
            <p className="text-[11px] text-neutral-400 dark:text-slate-500 mt-0.5">Try a different search query</p>
          </div>
        ) : (
          <>
            {/* Multi-Source Menus Section */}
            {multiSourceMenus.length > 0 && (
              <div className="space-y-1">
                {!sidebarCollapsed ? (
                  <button
                    id="btn-toggle-multi-views"
                    type="button"
                    onClick={toggleMultiViews}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-neutral-600 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-white/5 transition-all cursor-pointer group"
                    aria-expanded={!isMultiCollapsed}
                    aria-controls="multi-views-container"
                    title={isMultiCollapsed ? 'Click to expand Multi-SharePoint Views' : 'Click to collapse Multi-SharePoint Views'}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-neutral-400 dark:text-slate-500 group-hover:text-neutral-700 dark:group-hover:text-slate-300 transition-transform">
                        {isMultiCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-slate-300 truncate">
                        Multi-SharePoint Views
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isMultiCollapsed && isMultiActive && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Active
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                        {multiSourceMenus.length}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={toggleMultiViews}
                      className="w-10 h-7 mx-auto rounded-lg flex items-center justify-center text-neutral-400 dark:text-slate-500 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer group relative"
                      title={isMultiCollapsed ? `Expand Multi-SharePoint Views (${multiSourceMenus.length})` : `Collapse Multi-SharePoint Views (${multiSourceMenus.length})`}
                      aria-label="Toggle Multi-SharePoint Views"
                    >
                      <div className="flex items-center gap-0.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        {isMultiCollapsed ? (
                          <ChevronRight className="w-2.5 h-2.5 text-neutral-400 dark:text-slate-500" />
                        ) : (
                          <ChevronDown className="w-2.5 h-2.5 text-neutral-400 dark:text-slate-500" />
                        )}
                      </div>
                      <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 bg-neutral-900 dark:bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
                        {isMultiCollapsed ? `Expand Multi-SharePoint Views (${multiSourceMenus.length})` : `Collapse Multi-SharePoint Views (${multiSourceMenus.length})`}
                      </span>
                    </button>
                  </div>
                )}

                {!isMultiCollapsed && (
                  <div id="multi-views-container" className="space-y-1 animate-in fade-in duration-100">
                    {multiSourceMenus.map((conn, idx) =>
                      renderConnectionItem(conn, idx, multiSourceMenus.length)
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Single-List Menus Section */}
            {singleSourceMenus.length > 0 && (
              <div className="space-y-1 pt-2">
                {!sidebarCollapsed ? (
                  <button
                    id="btn-toggle-single-views"
                    type="button"
                    onClick={toggleSingleViews}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-neutral-600 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-white/5 transition-all cursor-pointer group"
                    aria-expanded={!isSingleCollapsed}
                    aria-controls="single-views-container"
                    title={isSingleCollapsed ? 'Click to expand Individual List Views' : 'Click to collapse Individual List Views'}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-neutral-400 dark:text-slate-500 group-hover:text-neutral-700 dark:group-hover:text-slate-300 transition-transform">
                        {isSingleCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <TableProperties className="w-3.5 h-3.5 text-neutral-500 dark:text-slate-400 flex-shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-slate-300 truncate">
                        Individual List Views
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isSingleCollapsed && isSingleActive && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-neutral-200 dark:bg-white/10 text-neutral-800 dark:text-slate-200 border border-neutral-300 dark:border-white/10">
                          Active
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-slate-400 font-medium border border-neutral-200 dark:border-white/10">
                        {singleSourceMenus.length}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="py-1">
                    <div className="w-6 h-px bg-neutral-200 dark:bg-white/10 mx-auto my-1" />
                    <button
                      type="button"
                      onClick={toggleSingleViews}
                      className="w-10 h-7 mx-auto rounded-lg flex items-center justify-center text-neutral-400 dark:text-slate-500 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer group relative"
                      title={isSingleCollapsed ? `Expand Individual List Views (${singleSourceMenus.length})` : `Collapse Individual List Views (${singleSourceMenus.length})`}
                      aria-label="Toggle Individual List Views"
                    >
                      <div className="flex items-center gap-0.5">
                        <TableProperties className="w-3.5 h-3.5 text-neutral-500 dark:text-slate-400" />
                        {isSingleCollapsed ? (
                          <ChevronRight className="w-2.5 h-2.5 text-neutral-400 dark:text-slate-500" />
                        ) : (
                          <ChevronDown className="w-2.5 h-2.5 text-neutral-400 dark:text-slate-500" />
                        )}
                      </div>
                      <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 bg-neutral-900 dark:bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
                        {isSingleCollapsed ? `Expand Individual List Views (${singleSourceMenus.length})` : `Collapse Individual List Views (${singleSourceMenus.length})`}
                      </span>
                    </button>
                  </div>
                )}

                {!isSingleCollapsed && (
                  <div id="single-views-container" className="space-y-1 animate-in fade-in duration-100">
                    {singleSourceMenus.map((conn, idx) =>
                      renderConnectionItem(conn, idx, singleSourceMenus.length)
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Footer: Reset Defaults & Version */}
      <div className="p-3 border-t border-neutral-200/80 dark:border-white/10 bg-neutral-50/50 dark:bg-[#0f172a]/60 flex-shrink-0 flex items-center justify-between">
        {!sidebarCollapsed ? (
          <>
            <button
              type="button"
              onClick={() => {
                resetToDefaults();
                useDemoDataStore.getState().resetConnectionRows();
              }}
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200 hover:bg-neutral-200/60 dark:hover:bg-white/10 px-2 py-1 rounded-md transition-colors cursor-pointer"
              title="Reset to default multi-source demo menus"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Presets</span>
            </button>
            <span className="text-[10px] text-neutral-400 dark:text-slate-500 font-mono">Multi-SP v2</span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              resetToDefaults();
              useDemoDataStore.getState().resetConnectionRows();
            }}
            className="mx-auto p-1.5 rounded-lg text-neutral-400 dark:text-slate-500 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Reset to default presets"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}
