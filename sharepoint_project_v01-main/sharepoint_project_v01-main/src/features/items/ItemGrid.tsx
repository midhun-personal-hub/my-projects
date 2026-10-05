import { DEMO_SHAREPOINT_LISTS } from '../../data/demoSharePointLists';
import { AdaptiveSharePointTable } from '../../components/table/AdaptiveSharePointTable';

export function ItemGrid() {
  const primaryList = DEMO_SHAREPOINT_LISTS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">List Items View</h2>
          <p className="text-xs text-neutral-500">Live schema-driven table showing {primaryList.displayName}</p>
        </div>
      </div>
      <AdaptiveSharePointTable list={primaryList} />
    </div>
  );
}
