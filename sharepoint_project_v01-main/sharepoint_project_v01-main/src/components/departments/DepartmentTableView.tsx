import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Layers, AlertCircle } from 'lucide-react';
import { DEMO_SHAREPOINT_LISTS } from '../../data/demoSharePointLists';
import { SHAREPOINT_SITE_PRESETS } from '../../data/defaultConnections';
import { AdaptiveSharePointTable } from '../table/AdaptiveSharePointTable';
import { SharePointSidebar } from '../sidebar/SharePointSidebar';
import { ConnectionConfigModal } from '../sidebar/ConnectionConfigModal';
import { ThemeToggle } from '../common/ThemeToggle';
import { useConnectionsStore } from '../../state/connectionsStore';
import { useDemoDataStore } from '../../state/demoDataStore';
import type {
  SharePointColumnDefinition,
  SharePointList,
  SharePointListItem,
} from '../../types/sharepoint';

export function DepartmentTableView() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();

  const {
    departments,
    activeDepartmentId,
    setActiveDepartmentId,
    connections,
    activeConnectionId,
    openEditModal,
  } = useConnectionsStore();

  const storedRows = useDemoDataStore((state) => state.connectionRows[activeConnectionId]);
  const initConnectionRows = useDemoDataStore((state) => state.initConnectionRows);

  // Sync route param with store state
  useEffect(() => {
    if (departmentId && departmentId !== activeDepartmentId) {
      const exists = departments.some((d) => d.id === departmentId);
      if (exists) {
        setActiveDepartmentId(departmentId);
      }
    }
  }, [departmentId, activeDepartmentId, departments, setActiveDepartmentId]);

  // Current active department
  const currentDepartment = useMemo(() => {
    return departments.find((d) => d.id === departmentId) || departments[0];
  }, [departments, departmentId]);

  // Find currently active connection from active department's connections
  const activeConnection = useMemo(() => {
    if (!connections || connections.length === 0) return undefined;
    return connections.find((c) => c.id === activeConnectionId) || connections[0];
  }, [connections, activeConnectionId]);

  // Consolidate columns and rows from all connected SharePoint sources
  const { consolidatedList, totalAvailableColumns } = useMemo(() => {
    if (!activeConnection || !activeConnection.sources || activeConnection.sources.length === 0) {
      return {
        consolidatedList: DEMO_SHAREPOINT_LISTS[0],
        totalAvailableColumns: DEMO_SHAREPOINT_LISTS[0].columns.length,
      };
    }

    const sources = activeConnection.sources;
    let totalAvail = 0;
    const combinedColumns: SharePointColumnDefinition[] = [];

    // 1. Gather all selected columns across each connected SharePoint list
    sources.forEach((source) => {
      const sourceRawList =
        DEMO_SHAREPOINT_LISTS.find((l) => l.id === source.listId) || DEMO_SHAREPOINT_LISTS[0];
      totalAvail += sourceRawList.columns.length;

      const preset = SHAREPOINT_SITE_PRESETS.find((s) => s.id === source.siteId);
      const badgeColor = preset?.badgeColor || 'blue';

      const selectedCols =
        source.selectedColumnNames && source.selectedColumnNames.length > 0
          ? source.selectedColumnNames
          : sourceRawList.columns.map((c) => c.name);

      selectedCols.forEach((colName) => {
        const foundCol = sourceRawList.columns.find((c) => c.name === colName);
        if (foundCol) {
          const uniqueKey = `${source.id}__${foundCol.name}`;
          combinedColumns.push({
            ...foundCol,
            uniqueKey,
            sourceId: source.id,
            sourceSiteName: source.siteName,
            sourceListName: source.listName,
            sourceBadgeColor: badgeColor,
          });
        }
      });
    });

    // 2. Synthesize merged rows across all sources
    const maxItems = Math.max(
      ...sources.map((s) => {
        const l = DEMO_SHAREPOINT_LISTS.find((dl) => dl.id === s.listId) || DEMO_SHAREPOINT_LISTS[0];
        return l.items.length;
      }),
      20
    );

    const mergedItems: SharePointListItem[] = [];
    for (let i = 0; i < maxItems; i++) {
      const mergedFields: Record<string, any> = {};

      sources.forEach((source) => {
        const sList =
          DEMO_SHAREPOINT_LISTS.find((dl) => dl.id === source.listId) || DEMO_SHAREPOINT_LISTS[0];
        const sItem = sList.items[i % sList.items.length];
        if (sItem && sItem.fields) {
          Object.keys(sItem.fields).forEach((fieldName) => {
            mergedFields[`${source.id}__${fieldName}`] = sItem.fields[fieldName];
            if (mergedFields[fieldName] === undefined) {
              mergedFields[fieldName] = sItem.fields[fieldName];
            }
          });
        }
      });

      mergedItems.push({
        id: `merged-${activeConnection.id}-row-${i}`,
        fields: mergedFields,
      });
    }

    const effectiveItems = storedRows ?? mergedItems;

    const consolidatedList: SharePointList = {
      id: `consolidated-${activeConnection.id}`,
      displayName: activeConnection.displayName,
      name: activeConnection.displayName,
      description:
        activeConnection.description ||
        `Consolidated view uniting ${sources.length} SharePoint lists into a single table`,
      columns: combinedColumns,
      items: effectiveItems,
    };

    return { consolidatedList, totalAvailableColumns: totalAvail };
  }, [activeConnection, storedRows]);

  // Ensure demo data rows are registered in persistent store
  useEffect(() => {
    if (activeConnection?.id && consolidatedList?.items && !storedRows) {
      initConnectionRows(activeConnection.id, consolidatedList.items);
    }
  }, [activeConnection?.id, consolidatedList?.items, storedRows, initConnectionRows]);

  // Handle department not found
  if (!currentDepartment) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center p-6 bg-neutral-100 dark:bg-[#0b1120] font-sans text-neutral-900 dark:text-slate-100">
        <div className="bg-white dark:bg-[#131d2e] p-8 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-slate-100">Department Not Found</h2>
          <p className="text-xs text-neutral-500 dark:text-slate-400">
            The department workspace you requested does not exist or was removed.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Return to Departments Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-neutral-100/70 dark:bg-[#0b1120] font-sans text-neutral-900 dark:text-slate-100 antialiased">
      {/* 1. Left Collapsible Sidebar Navigation with Multi-Source Menus Scoped to This Department */}
      <SharePointSidebar />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-y-auto">
        {/* Top Breadcrumb & Department Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#131d2e]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-white/10 px-4 sm:px-6 py-2.5 flex items-center justify-between flex-shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back to main cards page button */}
            <Link
              to="/"
              id="btn-back-to-departments"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 border border-neutral-200/80 dark:border-white/10 shadow-2xs"
              title="Return to Departments Directory"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Departments</span>
            </Link>

            <div className="h-4 w-px bg-neutral-200 dark:bg-white/10 flex-shrink-0" />

            {/* Department Thumbnail & Title */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-200 dark:border-white/10 shadow-2xs">
                <img
                  src={currentDepartment.imageUrl}
                  alt={currentDepartment.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xs font-bold text-neutral-900 dark:text-slate-100 truncate">
                    {currentDepartment.name}
                  </h1>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-slate-300 border border-neutral-200/80 dark:border-white/10">
                    {connections.length} {connections.length === 1 ? 'View' : 'Views'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action: Quick switch or view stats + ThemeToggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <ThemeToggle compact />
            <span className="text-[11px] text-neutral-400 dark:text-slate-500 hidden md:inline">
              Workspace active
            </span>
          </div>
        </header>

        {/* 3. Table Container */}
        <div className="w-full max-w-[1700px] mx-auto p-3 sm:p-5 lg:p-6 flex flex-col justify-start">
          <AdaptiveSharePointTable
            list={consolidatedList}
            title={activeConnection?.displayName}
            subtitle={activeConnection?.description}
            activeConnection={activeConnection}
            totalAvailableColumns={totalAvailableColumns}
            onEditConnection={activeConnection ? () => openEditModal(activeConnection.id) : undefined}
          />
        </div>
      </main>

      {/* 4. Multi-Source Connection & Field Selection Configuration Modal */}
      <ConnectionConfigModal />
    </div>
  );
}
