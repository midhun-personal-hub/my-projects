import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { SharePointListItem } from '../../types/sharepoint';

interface RowActionMenuProps {
  row: SharePointListItem;
  onEdit: (row: SharePointListItem) => void;
  onDelete: (row: SharePointListItem) => void;
}

export function RowActionMenu({ row, onEdit, onDelete }: RowActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onEdit(row);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDelete(row);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center justify-center">
      <button
        id={`row-action-btn-${row.id}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-md transition-colors cursor-pointer text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100 hover:bg-neutral-200/80 dark:hover:bg-white/10 focus:outline-hidden ${
          isOpen ? 'bg-neutral-200/80 dark:bg-white/15 text-neutral-900 dark:text-slate-100 ring-2 ring-blue-500/20' : ''
        }`}
        title="Row actions (Edit / Delete)"
        aria-label="Row actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          id={`row-action-menu-${row.id}`}
          className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1b263b] rounded-lg shadow-xl border border-neutral-200/90 dark:border-white/15 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-neutral-100 dark:divide-white/10"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-0.5">
            <button
              id={`btn-edit-row-${row.id}`}
              type="button"
              onClick={handleEdit}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer text-left font-medium"
              role="menuitem"
            >
              <Pencil className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-400 group-hover:text-blue-600" />
              <span>Edit Row</span>
            </button>
          </div>

          <div className="py-0.5">
            <button
              id={`btn-delete-row-${row.id}`}
              type="button"
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer text-left font-medium"
              role="menuitem"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
