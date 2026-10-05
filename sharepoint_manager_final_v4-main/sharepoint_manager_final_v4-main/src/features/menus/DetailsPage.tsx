import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { useMenus } from '../../hooks/useConfiguration';
import { graphService } from '../../services/graphService';
import { SharePointColumnDefinition, SharePointListItem } from '../../types';
import { DynamicForm } from '../../components/crud/DynamicForm';
import { Database, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const DetailsPage: React.FC = () => {
  const { listKey, itemId } = useParams<{ listKey: string; itemId: string }>();
  const navigate = useNavigate();
  const { addToast, logAction } = useAppStore();
  const { menus } = useMenus();

  const activeMenu = menus.find((m) => m.id === listKey || m.sharePointListId === listKey);

  const [columns, setColumns] = useState<SharePointColumnDefinition[]>([]);
  const [item, setItem] = useState<SharePointListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!activeMenu || !itemId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
        const [colsData, itemsData] = await Promise.all([
          graphService.getListColumns(activeMenu.sharePointSiteId, activeMenu.sharePointListId),
          graphService.getListItems(activeMenu.sharePointSiteId, activeMenu.sharePointListId, { top: 500 }),
        ]);

        setColumns(colsData);
        const found = itemsData.items.find((i) => i.id === itemId);
        if (found) {
          setItem(found);
        } else {
          setErrorMsg(`Record with ID "${itemId}" was not found in SharePoint list.`);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error loading item details from Graph API.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [listKey, itemId, activeMenu]);

  const handleSubmit = async (formData: Record<string, any>) => {
    if (!activeMenu || !itemId) return;
    setIsSaving(true);

    try {
      const updated = await graphService.updateListItem(
        activeMenu.sharePointSiteId,
        activeMenu.sharePointListId,
        itemId,
        formData
      );
      setItem(updated);
      logAction({
        action: 'UPDATE',
        details: `Updated record ID #${itemId} via Details View`,
        workspaceName: activeMenu.workspaceId,
        menuName: activeMenu.name,
        listId: activeMenu.sharePointListId,
        itemId: String(itemId),
        changedFields: formData,
      });
      addToast('success', 'Changes Saved', 'SharePoint list record updated successfully.');
    } catch (err: any) {
      addToast('error', 'Update Error', err.message || 'Could not update record.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-slate-950/40">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Fetching SharePoint Record Metadata...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950/40">
      {/* Header */}
      <div className="flex items-center justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-enterprise">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Database className="w-3.5 h-3.5 text-brand-600" />
              <span>
                {activeMenu?.name || 'SharePoint List'} / Item #{itemId}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
              {String(item?.fields?.Title || item?.fields?.SKU || `Record #${itemId}`)}
            </h1>
          </div>
        </div>
      </div>

      {errorMsg ? (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      ) : item ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-enterprise space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Record Fields & Editor</h2>
            <p className="text-xs text-slate-500">Edit fields and sync changes directly to SharePoint Online</p>
          </div>

          <DynamicForm
            columns={columns}
            initialData={item.fields}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            isLoading={isSaving}
          />
        </div>
      ) : null}
    </div>
  );
};

export default DetailsPage;
