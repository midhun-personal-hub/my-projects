import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ListConfig } from '../../types';
import { DynamicForm } from '../forms/DynamicForm';
import { graphService } from '../../services/graphService';
import { useAppStore } from '../../stores/useAppStore';
import { X, PlusCircle, AlertTriangle } from 'lucide-react';

export interface CreateItemDrawerProps {
  /** Controls visibility of the drawer overlay */
  isOpen: boolean;
  /** Callback fired to dismiss drawer */
  onClose: () => void;
  /** Target SharePoint List configuration schema */
  listConfig: ListConfig;
}

/**
 * Parses raw Graph or network exceptions into human-friendly client error messages.
 */
function parseGraphError(err: any): string {
  if (!err) return 'An unexpected error occurred while saving to SharePoint.';
  const msg = typeof err === 'string' ? err : err.message || String(err);

  if (msg.includes('403') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('access denied')) {
    return 'Access Denied (403): You do not have sufficient permissions to create items in this SharePoint list.';
  }
  if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
    return 'Conflict Error (409): A record with these unique details already exists or is locked in SharePoint.';
  }
  if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
    return 'List Not Found (404): The target SharePoint list or site could not be located.';
  }
  if (msg.includes('400') || msg.toLowerCase().includes('bad request')) {
    return 'Validation Error (400): One or more field values are invalid or improperly formatted for SharePoint.';
  }
  return msg;
}

/**
 * Enterprise CreateItemDrawer Component
 *
 * Sliding side drawer for adding new items to a SharePoint list.
 * Features progressive DOM loading, DynamicForm Zod validation, Microsoft Graph POST API mutations,
 * TanStack Query cache invalidations, and human-friendly error abstraction.
 */
export const CreateItemDrawer: React.FC<CreateItemDrawerProps> = ({
  isOpen,
  onClose,
  listConfig,
}) => {
  const queryClient = useQueryClient();
  const { addToast, logAction } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Progressive DOM Loading: Render nothing if drawer is closed
  if (!isOpen) return null;

  const handleFormSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setErrorBanner(null);

      const siteId = listConfig.siteId || 'root';
      const targetList = listConfig.sharePointList || listConfig.key;

      // Execute Microsoft Graph POST mutation
      const created = await graphService.createListItem(siteId, targetList, formData);

      // Post-Mutation Cache Invalidation across query key variants
      await queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, targetList] });
      await queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      await queryClient.invalidateQueries({ queryKey: ['listData', listConfig.key] });
      await queryClient.invalidateQueries({ queryKey: ['listData', targetList] });
      await queryClient.invalidateQueries({ queryKey: ['listItems', targetList] });

      // User notification & Audit logging
      addToast(
        'success',
        'Record Created',
        `Successfully added new item to ${listConfig.title}.`
      );
      logAction({
        action: 'CREATE',
        details: `Created record in SharePoint list "${listConfig.title}" (${Object.keys(formData).join(', ')})`,
        menuName: listConfig.title,
        listId: targetList,
        itemId: String(created.id),
        changedFields: formData,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to create SharePoint item:', err);
      const friendlyMsg = parseGraphError(err);
      setErrorBanner(friendlyMsg);
      addToast('error', 'Creation Failed', friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Side Panel Container */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col h-full border-l border-slate-200 dark:border-slate-800 transition-all overflow-hidden">
        {/* Drawer Title Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Create New Record
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
                    SharePoint Mutation Exception
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

          {/* DynamicForm Instance */}
          <DynamicForm
            config={listConfig}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};
