import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../stores/useAppStore';
import { useWorkspaces, useMenus } from '../../hooks/useConfiguration';
import { useAuthorization } from '../../auth/AuthorizationContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useSharePointList, useSharePointListMetadata } from '../../hooks/useSharePoint';
import { SharePointColumnDefinition, SharePointListItem } from '../../types';
import { graphService } from '../../services/graphService';
import { runControlledBatch } from '../../utils/batchQueue';
import { DataTable } from '../tables/DataTable';
import { DynamicForm } from '../crud/DynamicForm';
import { ItemDetailDrawer } from '../crud/ItemDetailDrawer';
import { IconResolver } from '../common/IconResolver';
import {
  ListFilter,
  Plus,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Database,
  Building2,
  X,
} from 'lucide-react';

interface WorkspaceViewProps {
  onOpenCreateMenu: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ onOpenCreateMenu }) => {
  const navigate = useNavigate();
  const {
    activeWorkspaceId,
    activeMenuId,
    setActiveMenu,
    currentUser,
    logAction,
    addToast,
  } = useAppStore();

  const auth = useAuthorization();
  const { workspaces } = useWorkspaces();
  const { menus } = useMenus();

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeWsMenus = menus
    .filter((m) => m.workspaceId === activeWorkspaceId && m.visible)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const activeMenu = menus.find((m) => m.id === activeMenuId);

  // State for data and CRUD dialogs
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(activeMenu?.pageSize || 10);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [skipTokens, setSkipTokens] = useState<Record<number, string | undefined>>({ 1: undefined });

  // Server-side sort state
  const [sortColumn, setSortColumn] = useState<string>(activeMenu?.defaultSortColumn || 'Title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(activeMenu?.defaultSortDirection || 'asc');

  // Modal / Drawer state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SharePointListItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<SharePointListItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset page size and sort defaults when menu changes
  useEffect(() => {
    if (activeMenu) {
      setPageSize(activeMenu.pageSize || 10);
      setSortColumn(activeMenu.defaultSortColumn || 'Title');
      setSortDirection(activeMenu.defaultSortDirection || 'asc');
    }
  }, [activeMenuId]);

  // Reset page and skip tokens on filter/menu/pageSize/sort changes
  useEffect(() => {
    setPage(1);
    setSkipTokens({ 1: undefined });
  }, [activeMenuId, pageSize, debouncedSearchTerm, sortColumn, sortDirection]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Query Columns Schema via custom React Query Hook
  const { data: colsData, isLoading: isColsLoading, error: colsError } = useSharePointListMetadata(
    activeMenu?.sharePointSiteId,
    activeMenu?.sharePointListId,
    !!activeMenu
  );

  const searchColumns = useMemo(() => (colsData || []).map((c) => c.name), [colsData]);

  // Query List Items via custom React Query Hook with Server-Side Querying
  const { data: listData, isLoading: isItemsLoading, error: itemsError, refetch: loadListData } = useSharePointList({
    siteId: activeMenu?.sharePointSiteId,
    listId: activeMenu?.sharePointListId,
    top: pageSize,
    skipToken: skipTokens[page],
    searchTerm: debouncedSearchTerm,
    searchColumns,
    sortColumn,
    sortDirection,
    enabled: !!activeMenu,
  });

  // Automatically update nextLink token when list data is fetched
  useEffect(() => {
    if (listData?.nextLink) {
      setSkipTokens((prev) => ({
        ...prev,
        [page + 1]: listData.nextLink,
      }));
    }
  }, [listData, page]);

  const columns = colsData || [];
  const items = listData?.items || [];
  const totalItems = listData?.totalItems;
  const hasNextPage = !!listData?.nextLink;
  const hasPreviousPage = page > 1;
  const isLoading = isColsLoading || isItemsLoading;
  const errorMsg = (colsError as any)?.message || (itemsError as any)?.message || null;

  if (!activeWs) return null;

  // Role CRUD Permissions Check for Active Menu
  const userRole = auth.role || 'Employee';
  const menuPermissions = activeMenu?.permissions[userRole] || {
    create: true,
    read: true,
    update: true,
    delete: true,
    export: true,
  };

  // Form Submit Handler (Create or Update)
  const handleFormSubmit = async (formData: Record<string, any>) => {
    if (!activeMenu) return;
    setIsSaving(true);

    try {
      if (editingItem) {
        // Update
        await graphService.updateListItem(
          activeMenu.sharePointSiteId,
          activeMenu.sharePointListId,
          editingItem.id,
          formData
        );

        logAction({
          action: 'UPDATE',
          details: `Updated record ID: ${editingItem.id}`,
          workspaceName: activeWs?.name,
          menuName: activeMenu.name,
          listId: activeMenu.sharePointListId,
          itemId: String(editingItem.id),
          changedFields: formData,
        });
        addToast('success', 'Record Saved', 'SharePoint list item updated successfully.');
      } else {
        // Create
        const created = await graphService.createListItem(
          activeMenu.sharePointSiteId,
          activeMenu.sharePointListId,
          formData
        );

        logAction({
          action: 'CREATE',
          details: `Created record "${formData.Title || 'New Record'}"`,
          workspaceName: activeWs?.name,
          menuName: activeMenu.name,
          listId: activeMenu.sharePointListId,
          itemId: String(created.id),
          changedFields: formData,
        });
        addToast('success', 'Record Created', 'New item added to SharePoint list.');
      }

      queryClient.invalidateQueries({ queryKey: ['sharepoint-list', activeMenu.sharePointSiteId, activeMenu.sharePointListId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      queryClient.invalidateQueries({ queryKey: ['listItems', activeMenu.sharePointListId] });
      setIsFormModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      addToast('error', 'Operation Failed', err.message || 'Could not save record to SharePoint.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Handler
  const handleDeleteItem = async (itemId: string) => {
    if (!activeMenu) return;
    if (!window.confirm('Are you sure you want to delete this SharePoint record?')) return;

    try {
      await graphService.deleteListItem(activeMenu.sharePointSiteId, activeMenu.sharePointListId, itemId);
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list', activeMenu.sharePointSiteId, activeMenu.sharePointListId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      queryClient.invalidateQueries({ queryKey: ['listItems', activeMenu.sharePointListId] });
      setSelectedItem(null);
      logAction({
        action: 'DELETE',
        details: `Deleted item ID: ${itemId}`,
        workspaceName: activeWs?.name,
        menuName: activeMenu.name,
        listId: activeMenu.sharePointListId,
        itemId: itemId,
      });
      addToast('warning', 'Record Deleted', 'Item permanently removed from SharePoint.');
    } catch (err: any) {
      addToast('error', 'Delete Error', err.message || 'Failed to delete record.');
    }
  };

  // Bulk Delete Handler
  const handleBulkDeleteItems = async (itemIds: string[]) => {
    if (!activeMenu || itemIds.length === 0) return;
    const confirmMsg =
      itemIds.length === 1
        ? 'Are you sure you want to delete this SharePoint record?'
        : `Are you sure you want to delete ${itemIds.length} selected SharePoint records?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const results = await runControlledBatch(
        itemIds,
        (id) => graphService.deleteListItem(activeMenu.sharePointSiteId, activeMenu.sharePointListId, id),
        10
      );

      const failures = results.filter((r) => !r.success);
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list', activeMenu.sharePointSiteId, activeMenu.sharePointListId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      queryClient.invalidateQueries({ queryKey: ['listItems', activeMenu.sharePointListId] });
      if (selectedItem && itemIds.includes(selectedItem.id)) {
        setSelectedItem(null);
      }
      logAction({
        action: 'BULK_DELETE',
        details: `Bulk deleted ${itemIds.length - failures.length} of ${itemIds.length} items from ${activeMenu.name}`,
        workspaceName: activeWs?.name,
        menuName: activeMenu.name,
        listId: activeMenu.sharePointListId,
        itemId: itemIds.slice(0, 5).join(', ') + (itemIds.length > 5 ? ` (+${itemIds.length - 5} more)` : ''),
        itemCount: itemIds.length,
        successCount: itemIds.length - failures.length,
        failureCount: failures.length,
        result: failures.length === 0 ? 'SUCCESS' : 'FAILED',
      });

      if (failures.length === 0) {
        addToast('warning', 'Records Deleted', `${itemIds.length} record(s) permanently removed from SharePoint.`);
      } else {
        addToast(
          'error',
          'Partial Delete Failure',
          `Deleted ${itemIds.length - failures.length} of ${itemIds.length} items. ${failures.length} failed.`
        );
      }
    } catch (err: any) {
      addToast('error', 'Delete Error', err.message || 'Failed to delete selected records.');
    }
  };

  // Bulk Edit Handler
  const handleBulkEditItems = async (itemIds: string[], updateFields: Record<string, any>) => {
    if (!activeMenu || itemIds.length === 0 || Object.keys(updateFields).length === 0) return;
    setIsSaving(true);

    try {
      const results = await runControlledBatch(
        itemIds,
        (id) =>
          graphService.updateListItem(
            activeMenu.sharePointSiteId,
            activeMenu.sharePointListId,
            id,
            updateFields
          ),
        10
      );

      const failures = results.filter((r) => !r.success);
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list', activeMenu.sharePointSiteId, activeMenu.sharePointListId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      queryClient.invalidateQueries({ queryKey: ['listItems', activeMenu.sharePointListId] });
      logAction({
        action: 'BULK_UPDATE',
        details: `Bulk updated ${itemIds.length - failures.length} of ${itemIds.length} items in ${activeMenu.name}`,
        workspaceName: activeWs?.name,
        menuName: activeMenu.name,
        listId: activeMenu.sharePointListId,
        itemId: itemIds.slice(0, 5).join(', ') + (itemIds.length > 5 ? ` (+${itemIds.length - 5} more)` : ''),
        itemCount: itemIds.length,
        successCount: itemIds.length - failures.length,
        failureCount: failures.length,
        changedFields: updateFields,
        result: failures.length === 0 ? 'SUCCESS' : 'FAILED',
      });

      if (failures.length === 0) {
        addToast('success', 'Records Updated', `Successfully updated ${itemIds.length} selected items.`);
      } else {
        addToast(
          'warning',
          'Partial Update Failure',
          `Updated ${itemIds.length - failures.length} of ${itemIds.length} items. ${failures.length} failed.`
        );
      }
    } catch (err: any) {
      addToast('error', 'Bulk Edit Error', err.message || 'Failed to update selected records.');
    } finally {
      setIsSaving(false);
    }
  };

  // Duplicate Item
  const handleDuplicateItem = async (item: SharePointListItem) => {
    if (!activeMenu) return;
    const duplicatedFields = { ...item.fields };
    delete duplicatedFields.id;
    if (duplicatedFields.Title) {
      duplicatedFields.Title = `${duplicatedFields.Title} (Copy)`;
    }

    try {
      await graphService.createListItem(
        activeMenu.sharePointSiteId,
        activeMenu.sharePointListId,
        duplicatedFields
      );
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list', activeMenu.sharePointSiteId, activeMenu.sharePointListId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      queryClient.invalidateQueries({ queryKey: ['listItems', activeMenu.sharePointListId] });
      addToast('success', 'Record Duplicated', 'Duplicated item created successfully.');
    } catch (err: any) {
      addToast('error', 'Duplicate Error', err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950/40">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-enterprise">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: activeWs.color }}
          >
            <IconResolver name={activeWs.iconName} className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs font-mono text-slate-400">{activeWs.id}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{activeWs.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{activeWs.description}</p>
          </div>
        </div>

        {auth.isAdministrator && (
          <button
            onClick={onOpenCreateMenu}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Link SharePoint List
          </button>
        )}
      </div>

      {/* Menu Selector Horizontal Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {activeWsMenus.map((m) => {
          const isSelected = m.id === activeMenuId;

          return (
            <button
              key={m.id}
              onClick={() => {
                setActiveMenu(m.id);
                navigate(`/lists/${m.id}`);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <IconResolver name={m.iconName} className="w-4 h-4" />
              <span>{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Dynamic Table Container */}
      {!activeMenu ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FolderKanban className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No List Selected</h3>
          <p className="text-xs text-slate-400 mt-1">Select a menu tab above or connect a new SharePoint list.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* List Meta Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center gap-2 font-mono">
              <Database className="w-3.5 h-3.5 text-brand-600" />
              <span>
                Site: <strong className="text-slate-800 dark:text-slate-200">{activeMenu.sharePointSiteId}</strong> | List:{' '}
                <strong className="text-slate-800 dark:text-slate-200">{activeMenu.sharePointListName}</strong>
              </span>
            </div>

            <button
              onClick={() => loadListData()}
              disabled={isLoading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-brand-600 flex items-center gap-1 font-semibold text-[11px]"
              title="Refresh Graph Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Error Message banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <div className="flex-1">
                <span className="font-bold block">Graph API Error</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Canonical Data Table Component */}
          <DataTable
            menu={activeMenu}
            columns={columns}
            items={items}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            totalItems={totalItems}
            onAddItem={() => {
              setEditingItem(null);
              setIsFormModalOpen(true);
            }}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsFormModalOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onBulkDeleteItems={handleBulkDeleteItems}
            onBulkEditItems={handleBulkEditItems}
            onDuplicateItem={handleDuplicateItem}
            onSelectItem={(item) => setSelectedItem(item)}
            canCreate={menuPermissions.create}
            canUpdate={menuPermissions.update}
            canDelete={menuPermissions.delete}
            canExport={menuPermissions.export}
          />
        </div>
      )}

      {/* Form Modal for Creating/Editing Item */}
      {isFormModalOpen && activeMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingItem ? `Edit ${activeMenu.name} Record` : `New ${activeMenu.name} Record`}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <DynamicForm
                columns={columns}
                initialData={editingItem?.fields}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormModalOpen(false)}
                isLoading={isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Item Inspector Drawer */}
      <ItemDetailDrawer
        item={selectedItem}
        columns={columns}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          setSelectedItem(null);
          setEditingItem(item);
          setIsFormModalOpen(true);
        }}
        onDelete={handleDeleteItem}
        onDuplicate={handleDuplicateItem}
      />
    </div>
  );
};
