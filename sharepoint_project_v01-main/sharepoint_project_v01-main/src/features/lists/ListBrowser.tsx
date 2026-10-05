import { useState, useMemo } from 'react';
import {
  FolderKanban,
  Laptop,
  Users,
  CheckCircle2,
  Sparkles,
  Info,
  Pin,
  ChevronRight,
} from 'lucide-react';
import { DEMO_SHAREPOINT_LISTS } from '../../data/demoSharePointLists';
import { AdaptiveSharePointTable } from '../../components/table/AdaptiveSharePointTable';
import { detectSharePointFieldType } from '../../components/table/fieldRenderers';

export function ListBrowser() {
  const [selectedListId, setSelectedListId] = useState<string>(DEMO_SHAREPOINT_LISTS[0].id);

  const currentList = useMemo(() => {
    return DEMO_SHAREPOINT_LISTS.find((l) => l.id === selectedListId) || DEMO_SHAREPOINT_LISTS[0];
  }, [selectedListId]);

  // Count field types in the active list
  const fieldTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentList.columns.forEach((col) => {
      const type = detectSharePointFieldType(col);
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [currentList]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Explaining Schema-Driven Adaptive Rendering */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3 h-3" />
                Schema-Driven SharePoint Data Table
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                20 Rows / View
              </span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Adaptive SharePoint List Renderer
            </h1>
            <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
              Dynamically maps Microsoft Graph list schemas to specialized column renderers. Supports sticky frozen
              first column on the left, sticky frozen last column on the right, sticky vertical header, and seamless horizontal scrolling.
            </p>
          </div>

          {/* Frozen Layout Indicator Pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/70">
            <div className="flex items-center gap-1.5 font-medium text-neutral-700">
              <Pin className="w-3.5 h-3.5 text-blue-600" />
              <span>Layout Constraints:</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-mono">
              Left Col: Frozen
            </span>
            <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-mono">
              Right Col: Frozen
            </span>
            <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-mono">
              Header: Frozen
            </span>
            <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-mono">
              20 Rows/Page
            </span>
          </div>
        </div>

        {/* List Selector Tabs */}
        <div className="mt-5 pt-4 border-t border-neutral-100">
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">
            Select SharePoint List Schema:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {DEMO_SHAREPOINT_LISTS.map((list) => {
              const isSelected = list.id === currentList.id;
              const Icon =
                list.id === 'list-project-portfolio'
                  ? FolderKanban
                  : list.id === 'list-it-assets'
                    ? Laptop
                    : Users;

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListId(list.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/10 shadow-xs'
                      : 'bg-white hover:bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-950' : 'text-neutral-900'}`}>
                        {list.displayName}
                      </span>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 ml-1" />}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {list.columns.length} columns • {list.items.length} items
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Schema Field Types Breakdown */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
          <span className="flex items-center gap-1 font-medium text-neutral-700 mr-1">
            <Info className="w-3 h-3 text-neutral-400" />
            Detected Field Types ({Object.keys(fieldTypeCounts).length}):
          </span>
          {Object.entries(fieldTypeCounts).map(([type, count]) => (
            <span
              key={type}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-mono text-[11px] border border-neutral-200"
            >
              {type} <span className="text-neutral-400 ml-1 font-sans">×{count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Render the Schema-driven Adaptive Table */}
      <AdaptiveSharePointTable
        key={currentList.id}
        list={currentList}
        title={currentList.displayName}
        subtitle={currentList.description}
      />
    </div>
  );
}
