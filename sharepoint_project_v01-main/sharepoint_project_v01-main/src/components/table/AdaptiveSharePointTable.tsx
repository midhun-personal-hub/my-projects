import { useMemo, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  X,
  ExternalLink,
  Table as TableIcon,
  Layers,
  Pencil,
  SlidersHorizontal as SlidersIcon,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import type { SharePointColumnDefinition, SharePointList, SharePointListItem } from '../../types/sharepoint';
import type { SharePointListConnection } from '../../types/connections';
import { DEMO_SHAREPOINT_LISTS } from '../../data/demoSharePointLists';
import { SHAREPOINT_SITE_PRESETS } from '../../data/defaultConnections';
import { detectSharePointFieldType, SharePointFieldCell } from './fieldRenderers';
import { RowActionMenu } from './RowActionMenu';
import { EditRowModal } from './EditRowModal';
import { DeleteRowConfirmModal } from './DeleteRowConfirmModal';
import { NewRowModal } from './NewRowModal';
import { useDemoDataStore } from '../../state/demoDataStore';

interface AdaptiveSharePointTableProps {
  list: SharePointList;
  title?: string;
  subtitle?: string;
  availableLists?: SharePointList[];
  onSelectListId?: (id: string) => void;
  activeConnection?: SharePointListConnection;
  totalAvailableColumns?: number;
  onEditConnection?: () => void;
}

export function AdaptiveSharePointTable({
  list,
  title,
  subtitle,
  availableLists,
  onSelectListId,
  activeConnection,
  totalAvailableColumns,
  onEditConnection,
}: AdaptiveSharePointTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  // Modals state
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);
  const [expandedRichText, setExpandedRichText] = useState<{ title: string; html: string } | null>(null);
  const [editingRow, setEditingRow] = useState<SharePointListItem | null>(null);
  const [deletingRow, setDeletingRow] = useState<SharePointListItem | null>(null);
  const [isNewRowModalOpen, setIsNewRowModalOpen] = useState(false);

  const { addRow, updateRow, deleteRow, lastActionNotice, clearNotice } = useDemoDataStore();

  useEffect(() => {
    if (lastActionNotice) {
      const timer = setTimeout(() => {
        clearNotice();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [lastActionNotice, clearNotice]);

  const handleSaveNewRow = (newFields: Record<string, any>) => {
    if (activeConnection?.id) {
      addRow(activeConnection.id, newFields);
    }
  };

  const handleSaveEdit = (rowId: string, updatedFields: Record<string, any>) => {
    if (activeConnection?.id) {
      updateRow(activeConnection.id, rowId, updatedFields);
    }
  };

  const handleConfirmDelete = (row: SharePointListItem) => {
    if (activeConnection?.id) {
      deleteRow(activeConnection.id, row.id);
    }
  };

  // Full schema columns computation (visible view columns vs hidden schema columns)
  const { visibleColumns, hiddenColumns } = useMemo(() => {
    const visible = list.columns;
    const visibleKeys = new Set(visible.map((c) => c.uniqueKey || c.name));

    const allSchemaCols: SharePointColumnDefinition[] = [];
    const seenKeys = new Set<string>();

    if (activeConnection && activeConnection.sources && activeConnection.sources.length > 0) {
      activeConnection.sources.forEach((source) => {
        const rawList =
          DEMO_SHAREPOINT_LISTS.find((l) => l.id === source.listId) || DEMO_SHAREPOINT_LISTS[0];
        const preset = SHAREPOINT_SITE_PRESETS.find((s) => s.id === source.siteId);
        const badgeColor = preset?.badgeColor || 'blue';

        rawList.columns.forEach((col) => {
          const uniqueKey =
            activeConnection.sources.length > 1 ? `${source.id}__${col.name}` : col.name;
          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            allSchemaCols.push({
              ...col,
              uniqueKey,
              sourceId: source.id,
              sourceSiteName: source.siteName,
              sourceListName: source.listName,
              sourceBadgeColor: badgeColor,
            });
          }
        });
      });
    } else {
      const rawList = DEMO_SHAREPOINT_LISTS.find((l) => l.id === list.id);
      const sourceCols = rawList ? rawList.columns : list.columns;
      sourceCols.forEach((col) => {
        if (!seenKeys.has(col.name)) {
          seenKeys.add(col.name);
          allSchemaCols.push(col);
        }
      });
    }

    const hidden = allSchemaCols.filter(
      (col) => !visibleKeys.has(col.uniqueKey || col.name) && !visibleKeys.has(col.name)
    );

    return { visibleColumns: visible, hiddenColumns: hidden };
  }, [activeConnection, list]);

  // Compute adaptive column min-width by field type
  const getColumnMinWidth = (column: SharePointColumnDefinition, index: number, total: number): string => {
    if (index === 0) return 'min-w-[240px] max-w-[280px]'; // Sticky First
    if (index === total - 1) return 'min-w-[130px] max-w-[160px]'; // Sticky Last

    const fieldType = detectSharePointFieldType(column);
    switch (fieldType) {
      case 'note':
        return 'min-w-[280px] max-w-[340px]';
      case 'choice':
        return 'min-w-[130px]';
      case 'multichoice':
        return 'min-w-[180px]';
      case 'person':
      case 'multiperson':
        return 'min-w-[180px]';
      case 'datetime':
        return 'min-w-[160px]';
      case 'currency':
      case 'number':
        return 'min-w-[120px] text-right';
      case 'boolean':
        return 'min-w-[100px] text-center';
      case 'hyperlink':
        return 'min-w-[190px]';
      case 'image':
      case 'attachment':
        return 'min-w-[140px]';
      case 'lookup':
      case 'multilookup':
        return 'min-w-[170px]';
      case 'taxonomy':
        return 'min-w-[180px]';
      default:
        return 'min-w-[160px]';
    }
  };

  // Build dynamic TanStack Table columns from list.columns schema
  const columns = useMemo<ColumnDef<SharePointListItem>[]>(() => {
    const totalCols = list.columns.length;

    const baseColumns: ColumnDef<SharePointListItem>[] = list.columns.map((colDef, colIndex) => {
      const isFirst = colIndex === 0;
      const isLast = false;
      const fieldType = detectSharePointFieldType(colDef);
      const isNumeric = fieldType === 'currency' || fieldType === 'number';
      const colKey = colDef.uniqueKey || colDef.name;

      return {
        id: colKey,
        accessorFn: (row: SharePointListItem) =>
          row.fields[colKey] !== undefined ? row.fields[colKey] : row.fields[colDef.name],
        header: () => (
          <div
            className={`flex flex-col gap-0.5 ${
              isNumeric ? 'items-end' : 'items-start'
            }`}
          >
            {colDef.sourceListName && (
              <span
                className={`text-[9px] font-bold tracking-tight px-1.5 py-0.2 rounded-full border mb-0.5 ${
                  colDef.sourceBadgeColor === 'emerald'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                    : colDef.sourceBadgeColor === 'purple'
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/80'
                    : colDef.sourceBadgeColor === 'amber'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
                    : colDef.sourceBadgeColor === 'cyan'
                    ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80'
                }`}
                title={`From: ${colDef.sourceSiteName || ''} • ${colDef.sourceListName}`}
              >
                {colDef.sourceListName.length > 18
                  ? colDef.sourceListName.slice(0, 18) + '…'
                  : colDef.sourceListName}
              </span>
            )}
            <div
              className={`flex items-center gap-1.5 font-semibold text-xs tracking-wider uppercase text-neutral-600 dark:text-slate-300 ${
                isNumeric ? 'justify-end' : 'justify-start'
              }`}
            >
              <span className="truncate" title={colDef.description || colDef.displayName}>
                {colDef.displayName || colDef.name}
              </span>
              <span className="text-[10px] font-mono font-normal lowercase px-1 py-0.2 rounded bg-neutral-200/70 dark:bg-white/10 text-neutral-500 dark:text-slate-400">
                {fieldType}
              </span>
            </div>
          </div>
        ),
        cell: ({ getValue }) => {
          const rawValue = getValue();
          return (
            <SharePointFieldCell
              value={rawValue}
              column={colDef}
              fieldType={fieldType}
              onPreviewImage={setPreviewImage}
              onExpandRichText={setExpandedRichText}
            />
          );
        },
        meta: {
          columnDef: colDef,
          fieldType,
          isFirst,
          isLast,
          minWidthClass: getColumnMinWidth(colDef, colIndex, totalCols),
        },
      };
    });

    // Dedicated Actions Column pinned as the sticky last column
    const actionsColumn: ColumnDef<SharePointListItem> = {
      id: '__row_actions__',
      header: () => (
        <div className="flex items-center justify-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500">
            Actions
          </span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <RowActionMenu
            row={row.original}
            onEdit={(targetRow) => setEditingRow(targetRow)}
            onDelete={(targetRow) => setDeletingRow(targetRow)}
          />
        </div>
      ),
      meta: {
        columnDef: {
          id: '__row_actions__',
          name: '__row_actions__',
          displayName: 'Actions',
        } as any,
        fieldType: 'unknown' as any,
        isFirst: false,
        isLast: true,
        minWidthClass: 'w-[72px] min-w-[72px] max-w-[72px] text-center',
        isActionsCol: true,
      },
      enableHiding: false,
      enableSorting: false,
    };

    return [...baseColumns, actionsColumn];
  }, [list.columns]);

  // TanStack Table Instance configured for exactly 20 rows per page
  const table = useReactTable({
    data: list.items,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 20, // Strict requirement: Exactly 20 rows per page
      },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const visibleColumnsCount = table.getVisibleLeafColumns().filter((c) => c.id !== '__row_actions__').length;
  const totalRowsCount = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount() || 1;

  const rowStart = totalRowsCount === 0 ? 0 : pageIndex * pageSize + 1;
  const rowEnd = Math.min((pageIndex + 1) * pageSize, totalRowsCount);

  return (
    <div className="w-full space-y-4">
      {/* Table Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131d2e] p-4 rounded-xl border border-neutral-200/80 dark:border-white/10 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-slate-100 tracking-tight">
              {title || (activeConnection ? activeConnection.displayName : list.displayName)}
            </h2>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-white/10">
              <TableIcon className="w-3 h-3" />
              {list.items.length} items
            </span>

            {/* Column selection count indicator */}
            {totalAvailableColumns && totalAvailableColumns !== list.columns.length ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                <SlidersIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Showing {list.columns.length} of {totalAvailableColumns} columns
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono text-neutral-500 dark:text-slate-400 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
                {list.columns.length} columns
              </span>
            )}

            {onEditConnection && (
              <button
                type="button"
                onClick={onEditConnection}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-2 py-0.5 rounded-lg border border-transparent hover:border-blue-200 dark:hover:border-blue-800/80 transition-colors cursor-pointer"
                title="Edit connection display name and visible columns"
              >
                <Pencil className="w-3 h-3" />
                <span>Configure View</span>
              </button>
            )}
          </div>

          {(subtitle || list.description) && (
            <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
              {subtitle || list.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* "New" Row Button */}
          <button
            id="btn-new-table-row"
            type="button"
            onClick={() => setIsNewRowModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap"
            title="Create a new item in this SharePoint list"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New</span>
          </button>

          {/* Optional Quick List Switcher */}
          {availableLists && availableLists.length > 1 && onSelectListId && (
            <div className="relative">
              <select
                id="sharepoint-list-switcher"
                aria-label="Select SharePoint List"
                value={list.id}
                onChange={(e) => onSelectListId(e.target.value)}
                className="text-xs bg-neutral-50 dark:bg-[#1a2436] hover:bg-neutral-100 dark:hover:bg-[#202d44] focus:bg-white dark:focus:bg-[#1a2436] border border-neutral-300 dark:border-white/15 focus:border-blue-500 rounded-lg px-2.5 py-1.5 font-medium text-neutral-800 dark:text-slate-100 outline-none transition-all cursor-pointer"
              >
                {availableLists.map((l) => (
                  <option key={l.id} value={l.id} className="bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100">
                    {l.displayName} ({l.items.length} items)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Global Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter across fields..."
              className="pl-8 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-[#0b1120] hover:bg-neutral-100/80 dark:hover:bg-[#101929] focus:bg-white dark:focus:bg-[#0b1120] border border-neutral-300 dark:border-white/15 focus:border-blue-500 text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 rounded-lg outline-none w-44 sm:w-56 transition-all"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Column Visibility Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-slate-200 bg-white dark:bg-[#1a2436] hover:bg-neutral-50 dark:hover:bg-white/5 border border-neutral-300 dark:border-white/15 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 dark:text-slate-400" />
              <span>Columns ({visibleColumnsCount}/{list.columns.length})</span>
            </button>

            {isColumnPickerOpen && (
              <div className="absolute right-0 mt-1 w-64 max-h-80 overflow-y-auto bg-white dark:bg-[#131d2e] border border-neutral-200 dark:border-white/15 rounded-lg shadow-lg z-50 p-2 text-xs divide-y divide-neutral-100 dark:divide-white/10">
                <div className="px-2 py-1 flex items-center justify-between font-medium text-neutral-500 dark:text-slate-400">
                  <span>Visible Columns</span>
                  <button
                    type="button"
                    onClick={() => table.toggleAllColumnsVisible(true)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset all
                  </button>
                </div>
                <div className="py-1 space-y-1">
                  {table
                    .getAllLeafColumns()
                    .filter((col) => col.id !== '__row_actions__')
                    .map((column) => {
                      return (
                        <label
                          key={column.id}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer"
                        >
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          className="rounded text-blue-600 border-neutral-300 dark:border-white/20 focus:ring-blue-500"
                        />
                        <span className="truncate text-neutral-700 dark:text-slate-200">{column.id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Adaptive Table Container with Sticky Header & Frozen Left/Right Columns */}
      <div className="relative rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#131d2e] shadow-xs overflow-hidden">
        {/* Table scroll container: constrained height for vertical sticky header, auto overflow-x for horizontal scrolling */}
        <div className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-190px)] min-h-[460px] select-text">
          <table className="w-full border-collapse text-left border-spacing-0">
            {/* Vertically Sticky Header */}
            <thead className="sticky top-0 z-30 bg-neutral-50/95 dark:bg-[#1a2436]/95 backdrop-blur-xs border-b border-neutral-200 dark:border-white/10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, colIndex, arr) => {
                    const isFirst = colIndex === 0;
                    const isLast = colIndex === arr.length - 1;
                    const meta = header.column.columnDef.meta as any;
                    const minWidthClass = meta?.minWidthClass || 'min-w-[160px]';

                    // Determine sticky classes
                    let stickyClass = 'relative bg-neutral-50/95 dark:bg-[#1a2436]/95';
                    if (isFirst) {
                      // Top-Left Sticky Corner
                      stickyClass =
                        'sticky left-0 z-40 bg-neutral-100 dark:bg-[#1e2c42] shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_5px_-1px_rgba(0,0,0,0.4)] border-r border-neutral-200 dark:border-white/10';
                    } else if (isLast) {
                      // Top-Right Sticky Corner
                      stickyClass =
                        'sticky right-0 z-40 bg-neutral-100 dark:bg-[#1e2c42] shadow-[-2px_0_5px_-1px_rgba(0,0,0,0.08)] dark:shadow-[-2px_0_5px_-1px_rgba(0,0,0,0.4)] border-l border-neutral-200 dark:border-white/10';
                    }

                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className={`px-3.5 py-3 text-xs font-semibold select-none border-b border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-slate-200 ${stickyClass} ${minWidthClass}`}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            onClick={header.column.getToggleSortingHandler()}
                            className={`flex items-center justify-between gap-1.5 cursor-pointer group hover:text-neutral-900 dark:hover:text-white transition-colors ${
                              header.column.getCanSort() ? 'cursor-pointer' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                            {header.column.getCanSort() && (
                              <span className="text-neutral-400 dark:text-slate-500 group-hover:text-neutral-700 dark:group-hover:text-slate-300 flex-shrink-0">
                                {{
                                  asc: <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
                                  desc: <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
                                }[header.column.getIsSorted() as string] ?? (
                                  <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            {/* Table Body with Sticky First and Last Columns */}
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-[#131d2e]">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnsCount} className="text-center py-12 text-neutral-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-neutral-300 dark:text-slate-600" />
                      <p className="text-sm font-medium text-neutral-600 dark:text-slate-300">No matching SharePoint list items found</p>
                      <p className="text-xs text-neutral-400 dark:text-slate-500">Try clearing or modifying your filter query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, rowIndex) => {
                  const isEven = rowIndex % 2 === 0;
                  const rowBgClass = isEven ? 'bg-white dark:bg-[#131d2e]' : 'bg-neutral-50/70 dark:bg-[#0f172a]/70';

                  return (
                    <tr
                      key={row.id}
                      className={`group hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-colors ${rowBgClass}`}
                    >
                      {row.getVisibleCells().map((cell, colIndex, arr) => {
                        const isFirst = colIndex === 0;
                        const isLast = colIndex === arr.length - 1;
                        const meta = cell.column.columnDef.meta as any;
                        const minWidthClass = meta?.minWidthClass || 'min-w-[160px]';

                        // Calculate sticky styling for first and last cells
                        let stickyClass = 'relative';
                        if (isFirst) {
                          stickyClass = `sticky left-0 z-20 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-1px_rgba(0,0,0,0.35)] border-r border-neutral-200 dark:border-white/10 ${
                            isEven ? 'bg-white dark:bg-[#131d2e]' : 'bg-neutral-50 dark:bg-[#0f172a]'
                          } group-hover:bg-blue-50 dark:group-hover:bg-[#15233c]`;
                        } else if (isLast) {
                          stickyClass = `sticky right-0 z-20 shadow-[-2px_0_5px_-1px_rgba(0,0,0,0.06)] dark:shadow-[-2px_0_5px_-1px_rgba(0,0,0,0.35)] border-l border-neutral-200 dark:border-white/10 ${
                            isEven ? 'bg-white dark:bg-[#131d2e]' : 'bg-neutral-50 dark:bg-[#0f172a]'
                          } group-hover:bg-blue-50 dark:group-hover:bg-[#15233c]`;
                        }

                        return (
                          <td
                            key={cell.id}
                            className={`px-3.5 py-3 text-xs text-neutral-700 dark:text-slate-200 align-middle ${stickyClass} ${minWidthClass}`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar: Exactly 20 rows per page */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-neutral-50/90 dark:bg-[#0f172a] border-t border-neutral-200 dark:border-white/10 text-xs text-neutral-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-neutral-900 dark:text-slate-100 font-semibold">{rowStart}</strong> to{' '}
              <strong className="text-neutral-900 dark:text-slate-100 font-semibold">{rowEnd}</strong> of{' '}
              <strong className="text-neutral-900 dark:text-slate-100 font-semibold">{totalRowsCount}</strong> items
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <span className="text-neutral-500 dark:text-slate-400">
              Page {pageIndex + 1} of {pageCount} ({pageSize} per page)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 py-1 font-mono font-medium text-neutral-800 dark:text-slate-100 bg-white dark:bg-[#1a2436] border border-neutral-200 dark:border-white/15 rounded">
              {pageIndex + 1} / {pageCount}
            </span>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Image Preview */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative bg-white dark:bg-[#131d2e] rounded-xl shadow-2xl border border-neutral-200 dark:border-white/10 overflow-hidden max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-white/10">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-slate-100 truncate">
                {previewImage.title || 'Attachment Preview'}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200 rounded transition-colors"
                  title="Open full image in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 text-neutral-400 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-neutral-900 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title || 'Preview'}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal for Expanded Rich Text / Formatted HTML View */}
      {expandedRichText && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4"
          onClick={() => setExpandedRichText(null)}
        >
          <div
            className="relative bg-white dark:bg-[#131d2e] rounded-xl shadow-2xl border border-neutral-200 dark:border-white/10 overflow-hidden max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0f172a]">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-neutral-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                  {expandedRichText.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExpandedRichText(null)}
                className="p-1 text-neutral-400 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-neutral-800 dark:text-slate-200 leading-relaxed">
              <div
                className="space-y-3 prose prose-sm max-w-none text-neutral-800 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: expandedRichText.html }}
              />
            </div>
            <div className="px-5 py-3 bg-neutral-50 dark:bg-[#0f172a] border-t border-neutral-200 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setExpandedRichText(null)}
                className="px-4 py-1.5 text-xs font-medium bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schema-Driven Edit Row Modal with Hidden Fields Support */}
      <EditRowModal
        row={editingRow}
        visibleColumns={visibleColumns}
        hiddenColumns={hiddenColumns}
        isOpen={Boolean(editingRow)}
        onClose={() => setEditingRow(null)}
        onSave={handleSaveEdit}
      />

      {/* Schema-Driven New Row Modal with Hidden Fields Toggle */}
      <NewRowModal
        isOpen={isNewRowModalOpen}
        onClose={() => setIsNewRowModalOpen(false)}
        visibleColumns={visibleColumns}
        hiddenColumns={hiddenColumns}
        listTitle={title || (activeConnection ? activeConnection.displayName : list.displayName)}
        onSave={handleSaveNewRow}
      />

      {/* Delete Row Confirmation Dialog */}
      <DeleteRowConfirmModal
        row={deletingRow}
        isOpen={Boolean(deletingRow)}
        onClose={() => setDeletingRow(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Action Notification Toast */}
      {lastActionNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold text-white animate-in fade-in slide-in-from-bottom-4 duration-200 border ${
            lastActionNotice.type === 'danger'
              ? 'bg-rose-900 border-rose-700'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <CheckCircle2
            className={`w-4 h-4 ${
              lastActionNotice.type === 'danger' ? 'text-rose-400' : 'text-emerald-400'
            }`}
          />
          <span>{lastActionNotice.message}</span>
          <button
            type="button"
            onClick={clearNotice}
            className="ml-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
