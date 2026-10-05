import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert } from 'lucide-react';

export interface DeleteConfirmationDialogProps {
  /** Controls visibility of the confirmation modal */
  isOpen: boolean;
  /** Callback fired to close or dismiss modal */
  onClose: () => void;
  /** Async execution handler performing actual item deletion */
  onConfirm: () => Promise<void>;
  /** Custom modal header title (defaults to 'Confirm Permanent Deletion') */
  title?: string;
  /** Name or title of the single item being deleted */
  itemTitle?: string;
  /** Number of items being deleted if performing bulk delete */
  itemCount?: number;
  /** Deleting state indicator during background operation */
  isDeleting?: boolean;
}

/**
 * Enterprise DeleteConfirmationDialog Component
 *
 * Critical warning modal providing strict deletion safeguards before destroying SharePoint records.
 * Displays exact item title/count, requires secondary click confirmation, handles loading state blocks,
 * and provides friendly error abstraction.
 */
export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Permanent Deletion',
  itemTitle,
  itemCount,
  isDeleting = false,
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [localDeleting, setLocalDeleting] = useState(false);

  // Progressive DOM Loading: Render nothing if modal is not open
  if (!isOpen) return null;

  const loading = isDeleting || localDeleting;

  const handleConfirmClick = async () => {
    try {
      setLocalDeleting(true);
      setInternalError(null);
      await onConfirm();
    } catch (err: any) {
      console.error('Deletion error in dialog:', err);
      const msg =
        err?.message ||
        'An unexpected error occurred while attempting to delete the item from SharePoint.';
      setInternalError(msg);
    } finally {
      setLocalDeleting(false);
    }
  };

  const formattedTargetText = itemCount && itemCount > 1
    ? `${itemCount} selected records`
    : itemTitle
    ? `"${itemTitle}"`
    : 'the selected record';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
        onClick={() => !loading && onClose()}
      />

      {/* Modal Card Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 overflow-hidden transition-all">
        {/* Warning Accent Top Bar */}
        <div className="h-2 w-full bg-rose-600 dark:bg-rose-500" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {title}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Irreversible Action
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="px-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
              {formattedTargetText}
            </strong>{' '}
            from SharePoint?
          </p>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-[11px] leading-snug flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              This operation cannot be undone. The record will be permanently deleted from the target SharePoint list.
            </span>
          </div>

          {/* Deletion Error Banner */}
          {internalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{internalError}</span>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-6 pt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80 mt-4 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmClick}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md hover:shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-60 active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting Record...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Permanent Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
