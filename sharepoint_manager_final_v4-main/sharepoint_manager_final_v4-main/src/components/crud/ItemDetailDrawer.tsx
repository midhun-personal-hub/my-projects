import React from 'react';
import { SharePointColumnDefinition, SharePointListItem } from '../../types';
import {
  X,
  FileText,
  User,
  Calendar,
  Clock,
  Paperclip,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface ItemDetailDrawerProps {
  item: SharePointListItem | null;
  columns: SharePointColumnDefinition[];
  onClose: () => void;
  onEdit: (item: SharePointListItem) => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (item: SharePointListItem) => void;
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  item,
  columns,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-drawer flex flex-col h-full animate-slide-left">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <FileText className="w-5 h-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {String(item.fields.Title || item.fields.SKU || item.fields.PONumber || item.fields.FullName || 'Item Details')}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">ID: {item.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Created On</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {item.created ? new Date(item.created).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Created By</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 truncate">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{item.createdBy?.displayName || 'System'}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Field Values */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SharePoint Fields</h4>
            <div className="space-y-3">
              {columns.map((col) => {
                const val = item.fields[col.name];
                return (
                  <div
                    key={col.id}
                    className="p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      {col.displayName}
                    </span>
                    <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {val === undefined || val === null || val === '' ? (
                        <span className="text-slate-400 italic">Unspecified</span>
                      ) : typeof val === 'boolean' ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            val ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {val ? 'Yes' : 'No'}
                        </span>
                      ) : col.type === 'Currency' ? (
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : String(col.type).toLowerCase() === 'datetime' || String(col.type).toLowerCase() === 'date' ? (
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {(() => {
                            try {
                              const str = String(val);
                              if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                                const [y, m, d] = str.split('-').map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                });
                              }
                              const d = new Date(val as string | number | Date);
                              return isNaN(d.getTime())
                                ? str
                                : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            } catch {
                              return String(val);
                            }
                          })()}
                        </span>
                      ) : (
                        String(val)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({item.attachments?.length || 0})</span>
            </h4>

            {item.attachments && item.attachments.length > 0 ? (
              <div className="space-y-2">
                {item.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{att.fileName}</span>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No document attachments uploaded.</p>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Item
          </button>
          <button
            onClick={() => onDuplicate(item)}
            className="p-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Duplicate Item"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
            title="Delete Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
