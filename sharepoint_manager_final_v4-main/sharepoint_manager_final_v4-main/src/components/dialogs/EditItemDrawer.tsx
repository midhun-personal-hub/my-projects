import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListConfig } from '../../types';
import { DynamicForm } from '../forms/DynamicForm';
import { graphService } from '../../services/graphService';
import { useAppStore } from '../../stores/useAppStore';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { X, Edit3, AlertTriangle, Loader2 } from 'lucide-react';

export interface EditItemDrawerProps {
  /** Controls visibility of the drawer overlay */
  isOpen: boolean;
  /** Callback fired to dismiss drawer */
  onClose: () => void;
  /** Target SharePoint List configuration schema */
  listConfig: ListConfig;
  /** Primary identifier of the item being edited */
  itemId: string | number | null;
}

/**
 * Parses raw Graph or network exceptions into human-friendly client error messages.
 */
function parseGraphError(err: any): string {
  if (!err) return 'An unexpected error occurred while updating the SharePoint record.';
  const msg = typeof err === 'string' ? err : err.message || String(err);

  if (msg.includes('403') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('access denied')) {
    return 'Access Denied (403): You do not have permission to update items in this SharePoint list.';
  }
  if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
    return 'Conflict Error (409): This item was updated or locked by another user in SharePoint.';
  }
  if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
    return 'Record Not Found (404): The specified item could not be found in SharePoint.';
  }
  if (msg.includes('400') || msg.toLowerCase().includes('bad request')) {
    return 'Validation Error (400): One or more updated values are invalid for SharePoint.';
  }
  return msg;
}

/**
 * Enterprise EditItemDrawer Component
 *
 * Sliding side drawer for editing existing SharePoint list items.
 * Uses TanStack Query to fetch single item details on mount, populates DynamicForm initialData,
 * and executes Microsoft Graph PATCH mutations with automatic cache invalidation.
 */
export const EditItemDrawer: React.FC<EditItemDrawerProps> = ({
  isOpen,
  onClose,
  listConfig,
  itemId,
}) => {
  const queryClient = useQueryClient();
  const { addToast, logAction } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const siteId = listConfig.siteId || 'root';
  const targetList = listConfig.sharePointList || listConfig.key;

  // Query single item details directly from SharePoint / Graph
  const {
    data: singleItem,
    isLoading: isFetchingItem,
    isError: isFetchError,
    error: fetchError,
  } = useQuery({
    queryKey: ['singleListItem', targetList, String(itemId)],
    queryFn: async () => {
      if (!itemId) return null;
      return await graphService.getListItem(siteId, targetList, String(itemId));
    },
    enabled: Boolean(isOpen && itemId),
    staleTime: 30 * 1000,
  });

  // Progressive DOM Loading: Render nothing if closed or no item selected
  if (!isOpen || !itemId) return null;

  const handleFormSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setErrorBanner(null);

      // Execute Microsoft Graph PATCH mutation
      await graphService.updateListItem(siteId, targetList, String(itemId), formData);

      // Post-Mutation Cache Invalidation
      await queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, targetList] });
      await queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      await queryClient.invalidateQueries({ queryKey: ['sharepoint-item', siteId, targetList, String(itemId)] });
      await queryClient.invalidateQueries({ queryKey: ['listData', listConfig.key] });
      await queryClient.invalidateQueries({ queryKey: ['listData', targetList] });
      await queryClient.invalidateQueries({ queryKey: ['listItems', targetList] });
      await queryClient.invalidateQueries({ queryKey: ['singleListItem', targetList, String(itemId)] });

      // User notification & Audit logging
      addToast(
        'success',
        'Record Updated',
        `Successfully updated record #${itemId} in ${listConfig.title}.`
      );
      logAction({
        action: 'UPDATE',
        details: `Updated record #${itemId} in SharePoint list "${listConfig.title}"`,
        menuName: listConfig.title,
        listId: targetList,
        itemId: String(itemId),
        changedFields: formData,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to update SharePoint item:', err);
      const friendlyMsg = parseGraphError(err);
      setErrorBanner(friendlyMsg);
      addToast('error', 'Update Failed', friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Side Panel Container */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col h-full border-l border-slate-200 dark:border-slate-800 transition-all overflow-hidden">
        {/* Drawer Title Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Record #{itemId}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                List: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{listConfig.title}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Friendly Error Banner */}
          {errorBanner && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100 text-xs flex items-start justify-between gap-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-rose-800 dark:text-rose-200 mb-0.5">
                    SharePoint Update Exception
                  </strong>
                  <span>{errorBanner}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="p-1 rounded-lg text-rose-400 hover:text-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Fetch Loading Skeleton */}
          {isFetchingItem ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Fetching record details from SharePoint...</span>
              </div>
              <TableSkeleton rows={6} />
            </div>
          ) : isFetchError ? (
            <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-100">
                Failed to Load Record
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {parseGraphError(fetchError)}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300"
              >
                Close Drawer
              </button>
            </div>
          ) : (
            /* DynamicForm Instance with Initial Data */
            <DynamicForm
              config={listConfig}
              initialData={singleItem?.fields || {}}
              onSubmit={handleFormSubmit}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
};
