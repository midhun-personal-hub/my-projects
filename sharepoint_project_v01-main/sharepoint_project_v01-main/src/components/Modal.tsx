import type { ReactNode } from 'react';

interface ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  children?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div id="modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75">
      <div id="modal-container" className="bg-white dark:bg-[#131d2e] text-neutral-900 dark:text-slate-100 rounded-lg p-6 max-w-md w-full shadow-lg border border-neutral-200 dark:border-white/10">
        {title && <h3 className="text-lg font-medium mb-4 text-neutral-900 dark:text-slate-100">{title}</h3>}
        <div>{children}</div>
        <div className="mt-6 flex justify-end">
          <button
            id="modal-close-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-800 dark:text-slate-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
