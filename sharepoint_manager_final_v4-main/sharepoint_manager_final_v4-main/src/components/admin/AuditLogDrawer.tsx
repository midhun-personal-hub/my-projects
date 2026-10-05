import React, { useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { X, History, User, Clock, CheckCircle2, AlertTriangle, Layers, Database } from 'lucide-react';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({ isOpen, onClose }) => {
  const { auditLogs, fetchAuditLogsFromSharePoint } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      fetchAuditLogsFromSharePoint().catch(() => {});
    }
  }, [isOpen, fetchAuditLogsFromSharePoint]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-drawer flex flex-col h-full animate-slide-left">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Persistent Audit Trail</h3>
              <p className="text-[11px] text-slate-400">SharePoint App_AuditLogs security & action registry</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Database className="w-8 h-8 opacity-40" />
              <span>No audit logs recorded yet in SharePoint App_AuditLogs list.</span>
            </div>
          ) : (
            auditLogs.map((log) => {
              const isBulk = log.action.startsWith('BULK_') || (log.itemCount && log.itemCount > 1);
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action.includes('CREATE')
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.action.includes('UPDATE')
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : log.action.includes('DELETE')
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {log.action}
                      </span>

                      {log.result === 'FAILED' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> FAILED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> SUCCESS
                        </span>
                      )}

                      {isBulk && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> Bulk ({log.itemCount} items)
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">{log.details}</p>

                  {/* Metadata Row */}
                  <div className="flex flex-col gap-1 text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <User className="w-3 h-3 text-slate-400" /> {log.userName}
                      </span>
                      {log.menuName && <span className="font-medium text-brand-600 dark:text-brand-400">{log.menuName}</span>}
                    </div>

                    {log.correlationId && (
                      <div className="flex items-center justify-between font-mono text-[9px] text-slate-400">
                        <span>CorrID: {log.correlationId}</span>
                        {log.auditPersisted ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium">● SharePoint Saved</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-sans font-medium">● Pending Sync</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
