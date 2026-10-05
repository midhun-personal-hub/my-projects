import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { SharePointListItem } from '../../types/sharepoint';

interface DeleteRowConfirmModalProps {
  row: SharePointListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (row: SharePointListItem) => void;
}

export function DeleteRowConfirmModal({
  row,
  isOpen,
  onClose,
  onConfirm,
}: DeleteRowConfirmModalProps) {
  if (!isOpen || !row) return null;

  // Extract a sensible display name/title for the row preview
  const primaryTitle =
    row.fields.Title ||
    row.fields.ProjectName ||
    row.fields.AssetName ||
    row.fields.FullName ||
    row.fields.Name ||
    row.fields.DocumentTitle ||
    row.fields.InvoiceNumber ||
    row.id;

  const handleConfirm = () => {
    onConfirm(row);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#131d2e] rounded-xl shadow-2xl border border-neutral-200 dark:border-white/10 w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-row-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/10 bg-rose-50/50 dark:bg-rose-950/40">
          <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-row-modal-title" className="text-sm font-bold text-neutral-900 dark:text-slate-100">
                Confirm Row Deletion
              </h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400/80">Permanent action in demo dataset</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 text-xs text-neutral-600 dark:text-slate-300">
          <p>
            Are you sure you want to delete this row from the table? It will be immediately removed from the active view and underlying session state.
          </p>

          <div className="p-3 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-slate-400 block mb-1">
              Row to be removed:
            </span>
            <div className="font-semibold text-neutral-900 dark:text-slate-100 text-xs truncate">
              {String(primaryTitle)}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 dark:text-slate-400 mt-0.5">
              ID: {row.id}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-neutral-50 dark:bg-[#0f172a] border-t border-neutral-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-white/15 text-xs font-medium text-neutral-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-delete-row"
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Row</span>
          </button>
        </div>
      </div>
    </div>
  );
}
