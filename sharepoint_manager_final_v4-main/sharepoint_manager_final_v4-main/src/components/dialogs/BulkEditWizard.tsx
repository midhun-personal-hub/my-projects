import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ListConfig } from '../../types';
import { DynamicForm } from '../forms/DynamicForm';
import { useBulkEdit, BulkResultReport } from '../../hooks/useBulkEdit';
import { graphService } from '../../services/graphService';
import { useAppStore } from '../../stores/useAppStore';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Layers,
  RefreshCw,
  Info,
} from 'lucide-react';

export interface BulkEditWizardProps {
  /** Controls wizard modal overlay visibility */
  isOpen: boolean;
  /** Callback fired to close or dismiss wizard modal */
  onClose: () => void;
  /** SharePoint List configuration contract */
  listConfig: ListConfig;
  /** Array of full row items selected for bulk editing */
  selectedItems: Record<string, any>[];
  /** Optional callback fired upon successful bulk operation completion */
  onSuccess?: () => void;
}

/**
 * Parses raw Graph or network exceptions into human-readable error banners.
 */
function parseGraphError(err: any): string {
  if (!err) return 'An unexpected error occurred while saving to SharePoint.';
  const msg = typeof err === 'string' ? err : err.message || String(err);

  if (msg.includes('403') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('access denied')) {
    return 'Access Denied (403): You do not have permission to update records in this SharePoint list.';
  }
  if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
    return 'Conflict Error (409): Record was modified or locked by another user in SharePoint.';
  }
  if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
    return 'Record Not Found (404): Target record could not be found in SharePoint.';
  }
  if (msg.includes('400') || msg.toLowerCase().includes('bad request')) {
    return 'Validation Error (400): One or more field values are invalid for SharePoint.';
  }
  return msg;
}

/**
 * Enterprise BulkEditWizard Component
 *
 * Sequential multi-record bulk editor operating purely on client-side state
 * before committing dirty field deltas in parallel via Microsoft Graph API.
 * Includes step navigator, delta checking, parallel execution reports, and selective retries.
 */
export const BulkEditWizard: React.FC<BulkEditWizardProps> = ({
  isOpen,
  onClose,
  listConfig,
  selectedItems,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { addToast, logAction } = useAppStore();
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);

  const {
    state,
    currentRowId,
    currentIndex,
    totalCount,
    isFirstItem,
    isLastItem,
    currentFormData,
    executionReports,
    setExecutionReports,
    initializeItems,
    nextItem,
    prevItem,
    jumpToItem,
    getAllDeltas,
    reset,
  } = useBulkEdit(selectedItems);

  // Sync selected items into hook state when modal opens
  useEffect(() => {
    if (isOpen && selectedItems.length > 0) {
      initializeItems(selectedItems);
    } else if (!isOpen) {
      reset();
    }
  }, [isOpen, selectedItems, initializeItems, reset]);

  // Progressive DOM Loading: Render nothing if modal is not open
  if (!isOpen || selectedItems.length === 0) return null;

  const siteId = listConfig.siteId || 'root';
  const targetList = listConfig.sharePointList || listConfig.key;

  const currentItem = selectedItems[currentIndex] || {};
  const currentItemTitle =
    currentItem.Title || currentItem.title || `Record #${currentRowId}`;

  // Execute parallel Graph PATCH updates for modified items
  const executeSaveAll = async (targetRowIds?: string[]) => {
    try {
      setIsSubmittingAll(true);
      const allDeltas = getAllDeltas();

      // Determine which items need updating
      const idsToProcess = targetRowIds || state.selectedRowIds;
      const itemsToUpdate = idsToProcess.map((id) => {
        const itemObj = state.originalRows[id] || {};
        const delta = allDeltas[id] || {};
        return { id, itemObj, delta };
      });

      // Filter out items with no modified fields
      const dirtyItems = itemsToUpdate.filter(
        (item) => Object.keys(item.delta).length > 0
      );

      if (dirtyItems.length === 0) {
        addToast(
          'warning',
          'No Changes Detected',
          'No fields were modified across the selected records.'
        );
        onClose();
        return;
      }

      // Execute parallel SharePoint updates
      const updatePromises = dirtyItems.map(async ({ id, itemObj, delta }) => {
        const itemTitle =
          itemObj.Title || itemObj.title || `Record #${id}`;
        try {
          await graphService.updateListItem(siteId, targetList, id, delta);
          return {
            rowId: id,
            itemTitle,
            success: true,
            message: `Successfully updated ${Object.keys(delta).length} modified field(s).`,
            fieldsUpdatedCount: Object.keys(delta).length,
          } as BulkResultReport;
        } catch (err: any) {
          return {
            rowId: id,
            itemTitle,
            success: false,
            message: parseGraphError(err),
          } as BulkResultReport;
        }
      });

      const results = await Promise.allSettled(updatePromises);
      const reports: BulkResultReport[] = results.map((res, idx) => {
        if (res.status === 'fulfilled') {
          return res.value;
        }
        const fallbackItem = dirtyItems[idx];
        return {
          rowId: fallbackItem.id,
          itemTitle: fallbackItem.itemObj.Title || `Record #${fallbackItem.id}`,
          success: false,
          message: parseGraphError(res.reason),
        };
      });

      const successes = reports.filter((r) => r.success);
      const failures = reports.filter((r) => !r.success);

      // Invalidate query cache if any items succeeded
      if (successes.length > 0) {
        await queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, targetList] });
        await queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
        await queryClient.invalidateQueries({ queryKey: ['listData', listConfig.key] });
        await queryClient.invalidateQueries({ queryKey: ['listData', targetList] });
        await queryClient.invalidateQueries({ queryKey: ['listItems', targetList] });
      }

      const dirtyItemIds = dirtyItems.map((d) => d.id);

      // Log action and notify user
      logAction({
        action: 'BULK_UPDATE',
        details: `Bulk updated ${successes.length} of ${dirtyItemIds.length} records in SharePoint list "${listConfig.title}"`,
        menuName: listConfig.title,
        listId: targetList,
        itemId: dirtyItemIds.slice(0, 5).join(', ') + (dirtyItemIds.length > 5 ? ` (+${dirtyItemIds.length - 5} more)` : ''),
        itemCount: dirtyItemIds.length,
        successCount: successes.length,
        failureCount: failures.length,
        changedFields: allDeltas,
        result: failures.length === 0 ? 'SUCCESS' : 'FAILED',
      });

      if (failures.length === 0) {
        addToast(
          'success',
          'Bulk Updates Saved',
          `Successfully updated all ${successes.length} records in SharePoint.`
        );
        if (onSuccess) onSuccess();
        onClose();
      } else {
        // Render execution report modal view for partial failures
        setExecutionReports(reports);
        addToast(
          'warning',
          'Bulk Edit Partial Completion',
          `${successes.length} succeeded, ${failures.length} failed. Please review execution report.`
        );
      }
    } catch (err: any) {
      console.error('Bulk save error:', err);
      addToast('error', 'Bulk Update Error', parseGraphError(err));
    } finally {
      setIsSubmittingAll(false);
    }
  };

  // Called when DynamicForm submits for current item
  const handleCurrentItemFormSubmit = async (formData: any) => {
    if (isLastItem) {
      // Save current row inputs locally first, then execute Save All
      nextItem(formData);
      await executeSaveAll();
    } else {
      // Save current row inputs locally and advance to next record
      nextItem(formData);
    }
  };

  // Handle Retry Failed Submissions
  const handleRetryFailed = async () => {
    if (!executionReports) return;
    const failedIds = executionReports.filter((r) => !r.success).map((r) => r.rowId);
    setExecutionReports(null);
    await executeSaveAll(failedIds);
  };

  // Calculate count of modified items locally
  const allDeltas = getAllDeltas();
  const modifiedItemCount = Object.keys(allDeltas).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmittingAll && onClose()}
      />

      {/* Main Wizard Modal Card */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden transition-all">
        {/* Wizard Top Banner & Sequential Navigator Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Bulk Edit Wizard
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                  {totalCount} Records
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Editing record <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentIndex + 1} of {totalCount}</strong>: {currentItemTitle}
              </p>
            </div>
          </div>

          {/* Quick Item Navigation Pill Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1">
            {state.selectedRowIds.map((id, idx) => {
              const isCurrent = idx === currentIndex;
              const isModified = Boolean(allDeltas[id]);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={isSubmittingAll}
                  onClick={() => jumpToItem(idx)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1 shrink-0 ${
                    isCurrent
                      ? 'bg-brand-600 text-white shadow-xs'
                      : isModified
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={`Jump to item ${idx + 1}`}
                >
                  <span>#{idx + 1}</span>
                  {isModified && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isSubmittingAll}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Close wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Execution Report OR DynamicForm Step */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {executionReports ? (
            /* Parallel Execution Report View */
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Bulk Update Execution Report
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Detailed summary of Microsoft Graph parallel PATCH commitments.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                    {executionReports.filter((r) => r.success).length} Succeeded
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                    {executionReports.filter((r) => !r.success).length} Failed
                  </span>
                </div>
              </div>

              {/* Individual Item Results List */}
              <div className="space-y-3">
                {executionReports.map((report) => (
                  <div
                    key={report.rowId}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                      report.success
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {report.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {report.itemTitle} (ID: #{report.rowId})
                        </strong>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            report.success
                              ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                              : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
                          }`}
                        >
                          {report.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        {report.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Execution Report Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Close & Dismiss
                </button>

                {executionReports.some((r) => !r.success) && (
                  <button
                    type="button"
                    disabled={isSubmittingAll}
                    onClick={handleRetryFailed}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                  >
                    {isSubmittingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Retrying Failed...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry Failed Items</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Active DynamicForm Step Engine */
            <div className="space-y-4">
              {/* Local Transaction Status Banner */}
              <div className="p-3.5 rounded-2xl bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-100 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span>
                    Changes are saved locally in memory. No SharePoint updates are committed until you click <strong>Save All</strong>.
                  </span>
                </div>
                {modifiedItemCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-[10px]">
                    {modifiedItemCount} item(s) modified
                  </span>
                )}
              </div>

              {/* DynamicForm Instance for Current Item */}
              <DynamicForm
                key={currentRowId || `item-${currentIndex}`}
                config={listConfig}
                initialData={currentFormData}
                onSubmit={handleCurrentItemFormSubmit}
                onCancel={onClose}
                isSubmitting={isSubmittingAll}
                hideHeader={true}
                submitLabel={
                  isLastItem
                    ? modifiedItemCount > 0
                      ? `Save All Items (${modifiedItemCount} Modified)`
                      : 'Save All Items'
                    : 'Save & Next Item'
                }
                customFooterLeft={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isFirstItem || isSubmittingAll}
                      onClick={() => prevItem()}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous Item</span>
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
