import React, { useState, useEffect } from 'react';
import { ColumnConfig, FieldType } from '../../types';
import {
  X,
  Filter,
  RotateCcw,
  Check,
  Calendar,
  Tag,
  Hash,
  ToggleLeft,
  Type,
  Search,
} from 'lucide-react';

export interface FilterPanelProps {
  /** Controls drawer open/close visibility */
  isOpen: boolean;
  /** Close drawer callback handler */
  onClose: () => void;
  /** Full list of table column configurations */
  columns: ColumnConfig[];
  /** Active filter state map (columnKey -> filterValue object or primitive) */
  activeFilters: Record<string, any>;
  /** Callback fired when user applies current filter selections */
  onApplyFilters: (filters: Record<string, any>) => void;
  /** Callback fired when user clears all active filter criteria */
  onClearFilters: () => void;
}

/**
 * Enterprise Dynamic FilterPanel Drawer Component
 *
 * Dynamically renders filter input controls based on field type configurations (ColumnConfig[])
 * and supports field types (Choice, Date Range, Number Range, Boolean, Text) for Microsoft Graph OData queries.
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  columns,
  activeFilters,
  onApplyFilters,
  onClearFilters,
}) => {
  // Local pending filter state buffer
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(activeFilters);

  // Sync local buffer whenever drawer opens or external activeFilters change
  useEffect(() => {
    setLocalFilters(activeFilters || {});
  }, [activeFilters, isOpen]);

  if (!isOpen) return null;

  // Filter columns that have filterable !== false
  const filterableColumns = columns.filter((col) => col.filterable !== false);

  // Helper to handle field-specific changes
  const handleFieldChange = (key: string, value: any) => {
    setLocalFilters((prev) => {
      const updated = { ...prev };
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && Object.keys(value).length === 0)
      ) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      return updated;
    });
  };

  // Handle Apply button click
  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  // Handle Reset button click
  const handleClear = () => {
    setLocalFilters({});
    onClearFilters();
  };

  // Count active filter fields
  const activeCount = Object.keys(localFilters).length;

  // Render individual dynamic filter input based on ColumnConfig type
  const renderFilterControl = (col: ColumnConfig) => {
    const val = localFilters[col.key];

    switch (col.type) {
      case 'choice':
      case 'multichoice': {
        const choices = col.choices || [];
        const selectedChoices: string[] = Array.isArray(val)
          ? val
          : val
          ? [String(val)]
          : [];

        const toggleChoice = (choice: string) => {
          let updated: string[];
          if (selectedChoices.includes(choice)) {
            updated = selectedChoices.filter((c) => c !== choice);
          } else {
            updated = [...selectedChoices, choice];
          }
          handleFieldChange(col.key, updated.length > 0 ? updated : undefined);
        };

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Tag className="w-3.5 h-3.5 text-brand-600" />
              <span>{col.label}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {choices.map((choice) => {
                const isSelected = selectedChoices.includes(choice);
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => toggleChoice(choice)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/80 dark:text-brand-300 dark:border-brand-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/80 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {choice}
                  </button>
                );
              })}
              {choices.length === 0 && (
                <input
                  type="text"
                  value={val || ''}
                  onChange={(e) => handleFieldChange(col.key, e.target.value)}
                  placeholder={`Filter ${col.label}...`}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                />
              )}
            </div>
          </div>
        );
      }

      case 'date':
      case 'datetime': {
        const fromDate = val?.from || '';
        const toDate = val?.to || '';

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-brand-600" />
              <span>{col.label} Range</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) =>
                    handleFieldChange(col.key, {
                      ...val,
                      from: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) =>
                    handleFieldChange(col.key, {
                      ...val,
                      to: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'boolean': {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <ToggleLeft className="w-3.5 h-3.5 text-brand-600" />
              <span>{col.label}</span>
            </div>
            <select
              value={val !== undefined ? String(val) : 'all'}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'all') handleFieldChange(col.key, undefined);
                else handleFieldChange(col.key, v === 'true');
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Records</option>
              <option value="true">True / Checked</option>
              <option value="false">False / Unchecked</option>
            </select>
          </div>
        );
      }

      case 'number': {
        const minVal = val?.min ?? '';
        const maxVal = val?.max ?? '';

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Hash className="w-3.5 h-3.5 text-brand-600" />
              <span>{col.label} (Range)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minVal}
                onChange={(e) =>
                  handleFieldChange(col.key, {
                    ...val,
                    min: e.target.value !== '' ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxVal}
                onChange={(e) =>
                  handleFieldChange(col.key, {
                    ...val,
                    max: e.target.value !== '' ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        );
      }

      default: {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Type className="w-3.5 h-3.5 text-brand-600" />
              <span>{col.label}</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={val || ''}
                onChange={(e) => handleFieldChange(col.key, e.target.value)}
                placeholder={`Contains text in ${col.label}...`}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Semi-transparent Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Sliding Drawer Container */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 transition-transform duration-300 ease-out">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Filter List Records
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeCount > 0
                  ? `${activeCount} filter condition(s) configured`
                  : 'Specify query criteria to restrict grid items'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body - Filter Controls Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {filterableColumns.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              No filterable fields available in current list configuration.
            </p>
          ) : (
            filterableColumns.map((col) => (
              <div
                key={col.key}
                className="pb-4 border-b border-slate-100 dark:border-slate-800/80 last:border-0"
              >
                {renderFilterControl(col)}
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};
