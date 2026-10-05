import React, { useState, useEffect, useRef } from 'react';
import { ColumnConfig } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Search,
  X,
  Plus,
  Edit,
  Trash2,
  RotateCw,
  Columns,
  Download,
  Filter,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface TableToolbarProps {
  /** Table title or active list context header */
  title?: string;
  /** Callback fired when debounced search query updates */
  onSearchChange: (value: string) => void;
  /** Manual data refresh callback trigger */
  onRefresh: () => void;
  /** Primary record creation action trigger */
  onCreateClick: () => void;
  /** Bulk edit callback trigger for multi-selected rows */
  onBulkEditClick?: () => void;
  /** Bulk delete callback trigger for multi-selected rows */
  onBulkDeleteClick?: () => void;
  /** Total count of currently checked row checkboxes */
  selectedCount?: number;
  /** Master column configuration definitions */
  columns: ColumnConfig[];
  /** Array of column keys that are currently visible in the grid */
  visibleColumns: string[];
  /** Callback fired to toggle individual column visibility */
  onToggleColumn: (columnKey: string) => void;
  /** Optional export handler trigger (CSV / Excel) */
  onExport?: () => void;
  /** Optional search input placeholder string */
  searchPlaceholder?: string;
  /** Controlled initial search string */
  searchValue?: string;
}

/**
 * Enterprise TableToolbar Component
 *
 * Serves as the command center for the dynamic DataTable engine:
 * 1. Implements search input debouncing (400ms buffer) to prevent SharePoint REST throttling.
 * 2. Dynamically activates/deactivates contextual bulk action triggers (Edit, Delete) based on selection state.
 * 3. Provides an interactive Column Visibility Manager popover for custom layout preferences.
 */
export const TableToolbar: React.FC<TableToolbarProps> = ({
  title,
  onSearchChange,
  onRefresh,
  onCreateClick,
  onBulkEditClick,
  onBulkDeleteClick,
  selectedCount = 0,
  columns,
  visibleColumns,
  onToggleColumn,
  onExport,
  searchPlaceholder = 'Search records...',
  searchValue = '',
}) => {
  // Local immediate search input state
  const [searchTerm, setSearchTerm] = useState(searchValue);

  // Debounce input value by 400ms to throttle upstream API queries
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Column Visibility Popover menu state
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [columnFilterQuery, setColumnFilterQuery] = useState('');
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Sync debounced search value to parent handler
  useEffect(() => {
    onSearchChange(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearchChange]);

  // Sync external search value reset if parent changes it
  useEffect(() => {
    if (searchValue !== undefined && searchValue !== searchTerm) {
      setSearchTerm(searchValue);
    }
  }, [searchValue]);

  // Close column picker popover when clicking outside container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnPickerRef.current &&
        !columnPickerRef.current.contains(event.target as Node)
      ) {
        setIsColumnPickerOpen(false);
      }
    };

    if (isColumnPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnPickerOpen]);

  // Handle immediate search clear button
  const handleClearSearch = () => {
    setSearchTerm('');
    onSearchChange('');
  };

  // Filter column list inside popover menu
  const filteredColumns = columns.filter((col) =>
    col.label.toLowerCase().includes(columnFilterQuery.toLowerCase())
  );

  const visibleSet = new Set(visibleColumns);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 transition-colors">
      {/* Top Header Row: Optional Title & Main Quick Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Title & Active Selection Pill Indicator */}
        <div className="flex items-center gap-3">
          {title && (
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h2>
          )}
          {selectedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {/* Right Action Group: Bulk Edit, Bulk Delete, Create Item */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Bulk Edit Button - Contextually enabled when selectedCount > 0 */}
          {onBulkEditClick && (
            <button
              type="button"
              onClick={onBulkEditClick}
              disabled={selectedCount === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedCount > 0
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 shadow-xs cursor-pointer'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedCount === 0
                  ? 'Select one or more items to bulk edit'
                  : `Bulk edit ${selectedCount} selected item(s)`
              }
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Bulk Edit</span>
              {selectedCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-200/60 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-mono text-[10px]">
                  {selectedCount}
                </span>
              )}
            </button>
          )}

          {/* Bulk Delete Button - Contextually enabled when selectedCount > 0 */}
          {onBulkDeleteClick && (
            <button
              type="button"
              onClick={onBulkDeleteClick}
              disabled={selectedCount === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedCount > 0
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800 shadow-xs cursor-pointer'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedCount === 0
                  ? 'Select one or more items to delete'
                  : `Delete ${selectedCount} selected item(s)`
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete</span>
              {selectedCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-200/60 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-mono text-[10px]">
                  {selectedCount}
                </span>
              )}
            </button>
          )}

          {/* Primary Record Creation Button */}
          <button
            type="button"
            onClick={onCreateClick}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Search Box, Refresh, Column Picker, Export */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {/* Debounced Search Input Container */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls Toolbar Group */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Refresh Data Trigger */}
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Refresh list items"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Refresh</span>
          </button>

          {/* Export Handler Trigger */}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Export list items"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export</span>
            </button>
          )}

          {/* Interactive Column Visibility Manager Popover Trigger */}
          <div className="relative" ref={columnPickerRef}>
            <button
              type="button"
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isColumnPickerOpen
                  ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950 dark:border-brand-800 dark:text-brand-300'
                  : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Customize displayed table columns"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Columns</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono">
                {visibleColumns.length}/{columns.length}
              </span>
            </button>

            {/* Column Visibility Popover Menu */}
            {isColumnPickerOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-xs animate-fade-in space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Display Columns
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {visibleColumns.length} visible
                  </span>
                </div>

                {/* Column Search Filter */}
                {columns.length > 5 && (
                  <div className="relative">
                    <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={columnFilterQuery}
                      onChange={(e) => setColumnFilterQuery(e.target.value)}
                      placeholder="Filter column fields..."
                      className="w-full pl-7 pr-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                )}

                {/* Checkbox List */}
                <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {filteredColumns.map((col) => {
                    const isVisible = visibleSet.has(col.key);
                    return (
                      <label
                        key={col.key}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => onToggleColumn(col.key)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500/30 accent-brand-600 cursor-pointer"
                          />
                          <span className="truncate text-xs">{col.label}</span>
                        </div>
                        {isVisible ? (
                          <Eye className="w-3 h-3 text-brand-600 dark:text-brand-400 shrink-0" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
