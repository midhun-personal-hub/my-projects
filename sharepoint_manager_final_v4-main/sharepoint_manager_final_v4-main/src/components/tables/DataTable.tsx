import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MenuConfig, ColumnConfig, FieldType, SharePointColumnDefinition, SharePointListItem } from '../../types';
import { TablePagination } from './TablePagination';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Download,
  Trash2,
  Edit,
  Eye,
  Columns,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  X,
  Image as ImageIcon,
  User,
  Calendar,
  Layers,
  Check,
  Paperclip,
  Database,
  ExternalLink,
} from 'lucide-react';
import './styles.css';

/**
 * Normalized internal representation of a table column
 */
interface NormalizedColumn {
  id: string;
  key: string;
  displayName: string;
  type: string;
  sortable: boolean;
  choices?: string[];
  readOnly?: boolean;
  width?: number;
  visible?: boolean;
}

/**
 * Canonical DataTable Props Contract
 *
 * Supports both SharePoint List Items/Columns (WorkspaceView)
 * and Generic Transactional Datasets.
 */
export interface DataTableProps<TData extends Record<string, any> = Record<string, any>> {
  /** Optional SharePoint Menu Configuration for defaults */
  menu?: MenuConfig;
  /** SharePoint column definitions or generic ColumnConfig array */
  columns: (SharePointColumnDefinition | ColumnConfig)[];
  /** SharePoint list items array */
  items?: SharePointListItem[];
  /** Generic dataset array */
  data?: TData[];
  /** Loading state indicator */
  isLoading?: boolean;

  /** Pagination State & Callbacks */
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  totalItems?: number;

  /** Search Query & Callback */
  searchTerm?: string;
  onSearchChange?: (term: string) => void;

  /** Selection & Bulk Operations */
  selectedIds?: Set<string>;
  onSelectAll?: (selected: boolean) => void;
  onSelectRow?: (id: string, selected: boolean) => void;
  onBulkDeleteItems?: (itemIds: string[]) => void;
  onBulkEditItems?: (itemIds: string[], updateFields: Record<string, any>) => void;

  /** Record CRUD Callbacks */
  onAddItem?: () => void;
  onCreateClick?: () => void;
  onEditItem?: (item: any) => void;
  onEditRow?: (item: any) => void;
  onDeleteItem?: (itemId: string) => void;
  onDeleteRow?: (item: any) => void;
  onDuplicateItem?: (item: any) => void;
  onSelectItem?: (item: any) => void;
  onViewRow?: (item: any) => void;

  /** Access Control / Capabilities */
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canExport?: boolean;

  /** Sorting State & Callback */
  sortColumn?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;

  /** Table Layout Options */
  primaryKey?: string;
  enableSelection?: boolean;
  enableActions?: boolean;
  emptyMessage?: string;
}

/**
 * Enterprise Single Canonical DataTable Component
 *
 * Features:
 * - 3-Section CSS Sticky Grid Architecture (Left Selection, Middle Scrollable, Right Actions)
 * - Dynamic SharePoint schemas & generic ColumnConfig support
 * - Rich field rendering: Person, Lookup, Choice, Image, Currency, Date, Boolean, URL, Attachments
 * - Built-in Toolbar (Search, Column Visibility Selector, Bulk Edit, Bulk Delete, CSV Export, Add)
 * - Server-side & Client-side Pagination (10, 20, 50, 100 rows per page)
 * - Image Lightbox Preview Modal & Bulk Edit Modal
 */
export function DataTable<TData extends Record<string, any>>({
  menu,
  columns,
  items,
  data,
  isLoading = false,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  hasNextPage,
  hasPreviousPage,
  totalItems: totalItemsProp,
  searchTerm: searchTermProp,
  onSearchChange,
  selectedIds: selectedIdsProp,
  onSelectAll,
  onSelectRow,
  onBulkDeleteItems,
  onBulkEditItems,
  onAddItem,
  onCreateClick,
  onEditItem,
  onEditRow,
  onDeleteItem,
  onDeleteRow,
  onDuplicateItem,
  onSelectItem,
  onViewRow,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  canExport = true,
  sortColumn: sortColumnProp,
  sortField: sortFieldProp,
  sortDirection: sortDirectionProp,
  onSort: onSortProp,
  primaryKey = 'id',
  enableSelection = true,
  enableActions = true,
  emptyMessage = 'No records found matching your query.',
}: DataTableProps<TData>): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize data array
  const rawDataset: any[] = useMemo(() => {
    if (items && Array.isArray(items)) return items;
    if (data && Array.isArray(data)) return data;
    return [];
  }, [items, data]);

  // Normalize column definitions
  const normalizedColumns: NormalizedColumn[] = useMemo(() => {
    return columns.map((col, idx) => {
      const spCol = col as SharePointColumnDefinition;
      const genCol = col as ColumnConfig;

      const key = spCol.name || genCol.key || `col_${idx}`;
      const displayName = spCol.displayName || genCol.label || key;
      const id = spCol.id || key;
      const type = String(spCol.type || genCol.type || 'Text');
      const sortable = genCol.sortable !== undefined ? genCol.sortable : true;
      const choices = spCol.choices || genCol.choices;
      const readOnly = spCol.readOnly || genCol.readOnly;
      const width = genCol.width;
      const visible = genCol.visible !== undefined ? genCol.visible : true;

      return {
        id,
        key,
        displayName,
        type,
        sortable,
        choices,
        readOnly,
        width,
        visible,
      };
    });
  }, [columns]);

  // Column Visibility State
  const initialVisibleKeys = useMemo(() => {
    if (menu?.visibleColumns && menu.visibleColumns.length > 0) {
      return menu.visibleColumns;
    }
    return normalizedColumns.filter((c) => c.visible !== false).map((c) => c.key);
  }, [menu, normalizedColumns]);

  const [visibleColKeys, setVisibleColKeys] = useState<string[]>(initialVisibleKeys);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  useEffect(() => {
    if (initialVisibleKeys.length > 0) {
      setVisibleColKeys(initialVisibleKeys);
    }
  }, [initialVisibleKeys]);

  const activeColumns = useMemo(() => {
    return normalizedColumns.filter((col) => visibleColKeys.includes(col.key));
  }, [normalizedColumns, visibleColKeys]);

  // Sorting State
  const [localSortColumn, setLocalSortColumn] = useState<string>(
    sortColumnProp || sortFieldProp || menu?.defaultSortColumn || normalizedColumns[0]?.key || 'Title'
  );
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>(
    sortDirectionProp || menu?.defaultSortDirection || 'asc'
  );

  const activeSortCol = sortColumnProp || sortFieldProp || localSortColumn;
  const activeSortDir = sortDirectionProp || localSortDirection;

  const handleHeaderSort = (colKey: string) => {
    if (onSortProp) {
      onSortProp(colKey);
    } else {
      if (localSortColumn === colKey) {
        setLocalSortDirection(localSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setLocalSortColumn(colKey);
        setLocalSortDirection('asc');
      }
    }
  };

  // Search State
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTermProp || '');
  const activeSearchTerm = searchTermProp !== undefined ? searchTermProp : localSearchTerm;

  const handleSearchChangeInput = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearchTerm(val);
    }
  };

  // Helper getters for item properties
  const getItemValue = useCallback((item: any, colKey: string) => {
    if (item?.fields && colKey in item.fields) {
      return item.fields[colKey];
    }
    if (item && colKey in item) {
      return item[colKey];
    }
    return undefined;
  }, []);

  const getItemId = useCallback((item: any): string => {
    if (item?.id !== undefined) return String(item.id);
    if (primaryKey && item[primaryKey] !== undefined) return String(item[primaryKey]);
    return String(item?.ID ?? item?.key ?? '');
  }, [primaryKey]);

  // Client-side filtering if search is not server-handled
  const filteredDataset = useMemo(() => {
    if (onSearchChange || !activeSearchTerm.trim()) return rawDataset;
    const term = activeSearchTerm.toLowerCase();
    return rawDataset.filter((item) => {
      return activeColumns.some((col) => {
        const val = getItemValue(item, col.key);
        return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
      });
    });
  }, [rawDataset, activeSearchTerm, onSearchChange, activeColumns, getItemValue]);

  // Client-side sorting if sort is not server-handled
  const sortedDataset = useMemo(() => {
    if (onSortProp) return filteredDataset;
    const res = [...filteredDataset];
    res.sort((a, b) => {
      const valA = getItemValue(a, activeSortCol) ?? '';
      const valB = getItemValue(b, activeSortCol) ?? '';

      if (valA < valB) return activeSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return activeSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return res;
  }, [filteredDataset, activeSortCol, activeSortDir, onSortProp, getItemValue]);

  // Selection State
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = selectedIdsProp || localSelectedIds;

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedDataset.length && sortedDataset.length > 0) {
      if (onSelectAll) onSelectAll(false);
      setLocalSelectedIds(new Set());
    } else {
      const allIds = new Set(sortedDataset.map((item) => getItemId(item)));
      if (onSelectAll) onSelectAll(true);
      setLocalSelectedIds(allIds);
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    const isNowSelected = !next.has(id);
    if (isNowSelected) {
      next.add(id);
    } else {
      next.delete(id);
    }
    if (onSelectRow) onSelectRow(id, isNowSelected);
    setLocalSelectedIds(next);
  };

  // Modals state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [enabledBulkFields, setEnabledBulkFields] = useState<Set<string>>(new Set());
  const [bulkFieldValues, setBulkFieldValues] = useState<Record<string, any>>({});

  // Scroll boundary indicators for sticky shadows
  const [scrolledLeft, setScrolledLeft] = useState(false);
  const [scrolledRight, setScrolledRight] = useState(false);

  const checkScrollBoundaries = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setScrolledLeft(scrollLeft > 2);
    setScrolledRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    checkScrollBoundaries();
    const observer = new ResizeObserver(() => checkScrollBoundaries());
    observer.observe(container);
    return () => observer.disconnect();
  }, [checkScrollBoundaries, sortedDataset, activeColumns]);

  // Export to CSV
  const handleExportCSV = () => {
    const exportRows = sortedDataset.map((item) => {
      const row: Record<string, any> = {};
      activeColumns.forEach((col) => {
        row[col.displayName] = getItemValue(item, col.key) ?? '';
      });
      return row;
    });

    if (exportRows.length === 0) return;

    const headers = Object.keys(exportRows[0]).join(',');
    const rows = exportRows.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(menu?.name || 'Table').replace(/\s+/g, '_')}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk Delete
  const handleBulkDeleteAction = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onBulkDeleteItems) {
      onBulkDeleteItems(ids);
    } else {
      ids.forEach((id) => {
        if (onDeleteItem) onDeleteItem(id);
        if (onDeleteRow) {
          const item = rawDataset.find((i) => getItemId(i) === id);
          if (item) onDeleteRow(item);
        }
      });
    }
    setLocalSelectedIds(new Set());
  };

  // Bulk Edit
  const handleOpenBulkEdit = () => {
    setEnabledBulkFields(new Set());
    setBulkFieldValues({});
    setIsBulkEditModalOpen(true);
  };

  const handleApplyBulkEdit = () => {
    if (enabledBulkFields.size === 0 || selectedIds.size === 0) return;
    const updates: Record<string, any> = {};
    enabledBulkFields.forEach((key) => {
      updates[key] = bulkFieldValues[key] ?? '';
    });

    if (onBulkEditItems) {
      onBulkEditItems(Array.from(selectedIds), updates);
    }
    setIsBulkEditModalOpen(false);
    setLocalSelectedIds(new Set());
  };

  // Action callers
  const handleAddClick = onAddItem || onCreateClick;
  const handleEditClick = (item: any) => {
    if (onEditItem) onEditItem(item);
    else if (onEditRow) onEditRow(item);
  };
  const handleDeleteClick = (item: any) => {
    const id = getItemId(item);
    if (onDeleteItem) onDeleteItem(id);
    else if (onDeleteRow) onDeleteRow(item);
  };
  const handleSelectRowClick = (item: any) => {
    if (onSelectItem) onSelectItem(item);
    else if (onViewRow) onViewRow(item);
  };

  // Cell Renderer for dynamic SharePoint / custom types
  const renderCellContent = (item: any, col: NormalizedColumn) => {
    const val = getItemValue(item, col.key);

    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-300 dark:text-slate-600 font-mono">—</span>;
    }

    const colTypeLower = col.type.toLowerCase();

    // Image Detection
    const isImageCol = colTypeLower === 'image';
    const isImageUrl =
      typeof val === 'string' &&
      (val.startsWith('http://') ||
        val.startsWith('https://') ||
        val.startsWith('data:image/') ||
        /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(val));

    if (isImageCol || isImageUrl) {
      return (
        <div
          className="flex items-center gap-2 group/img cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof val === 'string') setPreviewImage(val);
          }}
        >
          <img
            src={String(val)}
            alt={col.displayName}
            className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-2xs group-hover/img:scale-105 transition-transform shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="truncate max-w-[120px] text-xs font-medium text-slate-700 dark:text-slate-300">
            {typeof val === 'string' ? val.split('/').pop()?.substring(0, 15) || 'Image' : 'Image'}
          </span>
        </div>
      );
    }

    // Person Field
    if (colTypeLower === 'person') {
      const name = typeof val === 'object' ? val?.displayName || val?.title || val?.email : String(val);
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
          <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold">
            <User className="w-3 h-3" />
          </div>
          <span className="truncate max-w-[140px] text-xs">{name}</span>
        </span>
      );
    }

    // Lookup Field
    if (colTypeLower === 'lookup') {
      const lookupVal = typeof val === 'object' ? val?.value || val?.title || val?.id : String(val);
      return (
        <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
          <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-[140px] text-xs">{lookupVal}</span>
        </span>
      );
    }

    // Choice / MultiChoice
    if (colTypeLower === 'choice' || colTypeLower === 'multichoice') {
      const choices = Array.isArray(val) ? val : [String(val)];
      return (
        <div className="flex flex-wrap gap-1">
          {choices.map((c, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              {c}
            </span>
          ))}
        </div>
      );
    }

    // Date / DateTime
    if (colTypeLower === 'datetime' || colTypeLower === 'date') {
      try {
        const str = String(val);
        let formatted = str;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const [y, m, d] = str.split('-').map(Number);
          formatted = new Date(y, m - 1, d).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } else {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            {formatted}
          </span>
        );
      } catch {
        return String(val);
      }
    }

    // Currency
    if (colTypeLower === 'currency') {
      return (
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
          ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      );
    }

    // Number
    if (colTypeLower === 'number') {
      return <span className="font-mono text-slate-800 dark:text-slate-200 text-xs">{Number(val).toLocaleString()}</span>;
    }

    // Boolean
    if (colTypeLower === 'boolean' || typeof val === 'boolean') {
      return Boolean(val) ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Check className="w-3 h-3" /> True
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <X className="w-3 h-3" /> False
        </span>
      );
    }

    // URL
    if (colTypeLower === 'url' || (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://')))) {
      return (
        <a
          href={String(val)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium underline max-w-[180px] truncate text-xs"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{String(val).replace(/^https?:\/\//, '')}</span>
        </a>
      );
    }

    // Attachment
    if (colTypeLower === 'attachment') {
      const count = Array.isArray(val) ? val.length : 1;
      return (
        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
          {count} file{count > 1 ? 's' : ''}
        </span>
      );
    }

    // Default Text / Note
    return <span className="truncate max-w-[240px] inline-block text-xs text-slate-800 dark:text-slate-200">{String(val)}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-enterprise overflow-hidden">
      {/* Table Toolbar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40 relative z-40">
        {/* Left: Search & Column Config */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={activeSearchTerm}
              onChange={(e) => handleSearchChangeInput(e.target.value)}
              placeholder={`Search in ${menu?.name || 'records'}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          {/* Column Display Config Modal Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Customize visible columns"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </button>

            {isColumnPickerOpen && (
              <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-56 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-fade-in text-xs space-y-2">
                <div className="font-bold text-slate-500 uppercase text-[10px] pb-1 border-b border-slate-100 dark:border-slate-800">
                  Visible Table Columns
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                  {normalizedColumns.map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColKeys.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVisibleColKeys([...visibleColKeys, col.key]);
                          } else {
                            setVisibleColKeys(visibleColKeys.filter((k) => k !== col.key));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{col.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Bulk & Action Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {selectedIds.size > 0 && canUpdate && (
            <button
              onClick={handleOpenBulkEdit}
              className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-100 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Bulk Edit ({selectedIds.size})</span>
            </button>
          )}

          {selectedIds.size > 0 && canDelete && (
            <button
              onClick={handleBulkDeleteAction}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </button>
          )}

          {canExport && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {canCreate && handleAddClick && (
            <button
              onClick={handleAddClick}
              className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-xs text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Container with 3-Section Sticky Positioning */}
      <div
        ref={containerRef}
        onScroll={checkScrollBoundaries}
        className="data-table-container flex-1 overflow-x-auto overflow-y-auto min-h-[300px] max-h-[70vh] relative"
      >
        {activeColumns.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 min-h-[300px]">
            <Columns className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No columns visible</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">Select columns from the Columns dropdown above.</p>
          </div>
        ) : (
          <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-full">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold select-none sticky top-0 z-20">
              <tr>
                {enableSelection && (
                  <th
                    className={`sticky left-0 top-0 z-30 p-3 w-12 min-w-[48px] max-w-[48px] text-center bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-800 ${
                      scrolledLeft ? 'sticky-left-shadow' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === sortedDataset.length}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      aria-label="Select all rows"
                    />
                  </th>
                )}

                {activeColumns.map((col, colIdx) => {
                  const isSorted = activeSortCol === col.key;
                  const isStickyFirstData = colIdx === 0;

                  return (
                    <th
                      key={col.id}
                      onClick={() => col.sortable && handleHeaderSort(col.key)}
                      style={{ width: col.width ? `${col.width}px` : 'auto' }}
                      className={`sticky top-0 p-3 whitespace-nowrap min-w-[150px] border-b border-slate-200 dark:border-slate-800 transition-colors ${
                        col.sortable ? 'cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60' : ''
                      } ${
                        isStickyFirstData
                          ? `left-[48px] z-30 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-800 ${
                              scrolledLeft ? 'sticky-left-shadow' : ''
                            }`
                          : 'z-10 bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.displayName}</span>
                        {col.sortable && (
                          <span className="shrink-0 text-slate-400">
                            {isSorted ? (
                              activeSortDir === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-brand-600 font-bold" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-brand-600 font-bold" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {enableActions && (
                  <th
                    className={`sticky top-0 right-0 z-30 p-3 w-32 text-right whitespace-nowrap bg-slate-100 dark:bg-slate-800 border-b border-l border-slate-200 dark:border-slate-800 ${
                      scrolledRight ? 'sticky-right-shadow' : ''
                    }`}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {enableSelection && (
                      <td className="sticky left-0 z-20 p-3 w-12 text-center bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800">
                        <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                      </td>
                    )}
                    {activeColumns.map((col, colIdx) => (
                      <td
                        key={col.id}
                        className={`p-3 border-b border-slate-100 dark:border-slate-800 ${
                          colIdx === 0
                            ? 'sticky left-[48px] z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800'
                            : ''
                        }`}
                      >
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                      </td>
                    ))}
                    {enableActions && (
                      <td className="sticky right-0 z-20 p-3 bg-white dark:bg-slate-900 border-l border-b border-slate-200 dark:border-slate-800">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto" />
                      </td>
                    )}
                  </tr>
                ))
              ) : sortedDataset.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeColumns.length + (enableSelection ? 1 : 0) + (enableActions ? 1 : 0)}
                    className="p-12 text-center text-slate-400"
                  >
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{emptyMessage}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting search or filters.</p>
                  </td>
                </tr>
              ) : (
                sortedDataset.map((item) => {
                  const itemId = getItemId(item);
                  const isSelected = selectedIds.has(itemId);
                  const cellBg = isSelected
                    ? 'bg-blue-50 dark:bg-slate-800'
                    : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80';

                  return (
                    <tr key={itemId} className="group transition-colors">
                      {enableSelection && (
                        <td
                          className={`sticky left-0 z-20 p-3 w-12 min-w-[48px] max-w-[48px] text-center border-b border-r border-slate-200 dark:border-slate-800/80 ${cellBg} ${
                            scrolledLeft ? 'sticky-left-shadow' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(itemId)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {activeColumns.map((col, colIdx) => {
                        const isStickyFirstData = colIdx === 0;

                        return (
                          <td
                            key={col.id}
                            onClick={() => handleSelectRowClick(item)}
                            className={`p-3 cursor-pointer max-w-xs truncate font-medium min-w-[150px] border-b border-slate-100 dark:border-slate-800/80 ${cellBg} ${
                              isStickyFirstData
                                ? `sticky left-[48px] z-20 border-r border-slate-200 dark:border-slate-800/80 ${
                                    scrolledLeft ? 'sticky-left-shadow' : ''
                                  }`
                                : ''
                            }`}
                          >
                            {renderCellContent(item, col)}
                          </td>
                        );
                      })}

                      {enableActions && (
                        <td
                          className={`sticky right-0 z-20 p-3 text-right whitespace-nowrap border-b border-l border-slate-200 dark:border-slate-800/80 ${cellBg} ${
                            scrolledRight ? 'sticky-right-shadow' : ''
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {(onSelectItem || onViewRow) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectRowClick(item);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canUpdate && (onEditItem || onEditRow) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(item);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Edit Record"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onDuplicateItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateItem(item);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Duplicate Record"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDelete && (onDeleteItem || onDeleteRow) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(item);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {onPageChange && onPageSizeChange && (
        <TablePagination
          totalItems={totalItemsProp}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          hasNextPage={hasNextPage ?? (totalItemsProp !== undefined ? page * pageSize < totalItemsProp : false)}
          hasPreviousPage={hasPreviousPage ?? page > 1}
          pageSizeOptions={[10, 20, 50, 100]}
          currentItemsCount={sortedDataset.length}
        />
      )}

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white z-10 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Asset Preview" className="max-w-full max-h-[75vh] object-contain rounded-xl" />
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-full px-2">
              {previewImage}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-enterprise w-full max-w-xl max-h-[85vh] flex flex-col animate-scale-up">
            <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Bulk Edit ({selectedIds.size} Selected Records)
                  </h3>
                  <p className="text-xs text-slate-500">Select fields to update across all chosen records.</p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
              {normalizedColumns
                .filter((col) => !col.readOnly && col.key !== 'id' && col.key !== 'ID')
                .map((col) => {
                  const isEnabled = enabledBulkFields.has(col.key);
                  return (
                    <div
                      key={col.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isEnabled
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              const next = new Set(enabledBulkFields);
                              if (e.target.checked) {
                                next.add(col.key);
                              } else {
                                next.delete(col.key);
                              }
                              setEnabledBulkFields(next);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span>{col.displayName}</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">{col.type}</span>
                      </div>

                      {isEnabled && (
                        <div className="pl-6">
                          {col.type === 'Choice' ? (
                            <select
                              value={bulkFieldValues[col.key] || ''}
                              onChange={(e) => setBulkFieldValues({ ...bulkFieldValues, [col.key]: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/50 outline-none"
                            >
                              <option value="">-- Select {col.displayName} --</option>
                              {col.choices?.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : col.type.toLowerCase() === 'datetime' || col.type.toLowerCase() === 'date' ? (
                            <input
                              type="date"
                              value={bulkFieldValues[col.key] || ''}
                              onChange={(e) => setBulkFieldValues({ ...bulkFieldValues, [col.key]: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/50 outline-none"
                            />
                          ) : col.type === 'Currency' || col.type === 'Number' ? (
                            <input
                              type="number"
                              value={bulkFieldValues[col.key] ?? ''}
                              onChange={(e) =>
                                setBulkFieldValues({
                                  ...bulkFieldValues,
                                  [col.key]: e.target.value === '' ? '' : Number(e.target.value),
                                })
                              }
                              placeholder={`Enter ${col.displayName}...`}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/50 outline-none"
                            />
                          ) : col.type === 'Boolean' ? (
                            <select
                              value={bulkFieldValues[col.key] === undefined ? '' : String(bulkFieldValues[col.key])}
                              onChange={(e) =>
                                setBulkFieldValues({
                                  ...bulkFieldValues,
                                  [col.key]: e.target.value === 'true',
                                })
                              }
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/50 outline-none"
                            >
                              <option value="true">Yes / True</option>
                              <option value="false">No / False</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={bulkFieldValues[col.key] || ''}
                              onChange={(e) => setBulkFieldValues({ ...bulkFieldValues, [col.key]: e.target.value })}
                              placeholder={`Enter new ${col.displayName}...`}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/50 outline-none"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">{enabledBulkFields.size} field(s) selected for update</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBulkEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={enabledBulkFields.size === 0}
                  onClick={handleApplyBulkEdit}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 shadow-xs transition-colors cursor-pointer"
                >
                  Apply to {selectedIds.size} Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
