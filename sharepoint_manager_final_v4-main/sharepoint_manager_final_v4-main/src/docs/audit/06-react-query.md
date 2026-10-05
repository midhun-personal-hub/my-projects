# Audit Report 06 — React Query Server State Architecture

**Status:** PASS  
**Audited Date:** August 10, 2026  
**Auditor:** Automated Remediation Engine  

---

## Executive Summary

The application server-state architecture has been unified and verified under **TanStack React Query v5**. All SharePoint list data fetching, caching, pagination, sorting, search, filtering, and CRUD mutation invalidations flow through a single, controlled React Query layer (`src/hooks/useSharePoint.ts`).

Zustand (`src/stores/useAppStore.ts`) was audited and verified to contain **zero server-side item state or uncontrolled duplicate caches**. Zustand strictly manages client UI state (theme, active workspace/menu IDs, current user context, audit logs, and notification toasts).

---

## 1. Unified Server-State Architecture

| Data Source | Management Engine | Query / Cache Key | Stale Time | Invalidation Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **SharePoint List Items** | TanStack `useQuery` (`useSharePointList`) | `['sharepoint-list', site, list, pageSize, skipToken, filter, search, ...]` | 30s | Create, Update, Delete, Bulk Operations |
| **SharePoint List Metadata** | TanStack `useQuery` (`useSharePointListMetadata`) | `['sharepoint-columns', site, list]` | 5m | Menu reconfiguration |
| **Single SharePoint Item** | TanStack `useQuery` (`useSharePointItem`) | `['sharepoint-item', site, list, itemId]` | 30s | Item Update, Item Delete |
| **Relational Lookups** | TanStack `useQuery` (`useLookupOptions` / `LookupSelect`) | `['sharepoint-lookup-options', site, list, field]` | 5m | Manual refresh / parent list change |

---

## 2. Query Key Standardization

All list query keys in `src/hooks/useSharePoint.ts` strictly incorporate all required dimensional parameters to guarantee query isolation and accurate cache targeting:

```typescript
// Query Key Structure in useSharePointList
queryKey: [
  'sharepoint-list',
  siteId,         // 1. Site
  listId,         // 2. List
  top,            // 3. Page size
  skipToken,      // 4. Pagination (OData skipToken)
  filter,         // 5. Filters
  searchTerm,     // 6. Search
  searchColumns,  // Search fields
  selectColumns,  // Field projection
  sortColumn,     // 7. Sort column
  sortDirection,  // 7. Sort direction
]
```

### Verified Dimensions:
1. **Site**: `siteId` parameter.
2. **List**: `listId` parameter.
3. **Search**: `searchTerm` parameter (debounced 400ms).
4. **Filters**: `filter` parameter.
5. **Sort**: `sortColumn` & `sortDirection` parameters.
6. **Page Size**: `top` parameter (`10`, `20`, `50`, `100`).
7. **Pagination**: `skipToken` parameter (`@odata.nextLink` token).

---

## 3. Mutation Invalidation & Component Traceability

All application write operations (Create, Update, Delete, Bulk Update, Bulk Delete) execute cache invalidation against `['sharepoint-list', siteId, listId]` and `['sharepoint-list']`, triggering automatic refetches that keep the UI perfectly synchronized with SharePoint.

### Production Component Invalidation Trace:

#### A. Single Item Creation
- **Components:** `src/components/workspace/WorkspaceView.tsx`, `src/components/dialogs/CreateItemDrawer.tsx`, `src/hooks/useSharePoint.ts`
- **Invalidations:**
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, listId] });
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
  ```

#### B. Single Item Update
- **Components:** `src/components/workspace/WorkspaceView.tsx`, `src/components/dialogs/EditItemDrawer.tsx`, `src/hooks/useSharePoint.ts`
- **Invalidations:**
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, listId] });
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
  queryClient.invalidateQueries({ queryKey: ['sharepoint-item', siteId, listId, itemId] });
  ```

#### C. Single Item Delete
- **Components:** `src/components/workspace/WorkspaceView.tsx`, `src/components/dialogs/DeleteConfirmationDialog.tsx`, `src/hooks/useSharePoint.ts`
- **Invalidations:**
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, listId] });
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
  ```

#### D. Bulk Edit & Sequential Bulk Edit
- **Components:** `src/components/workspace/WorkspaceView.tsx`, `src/components/dialogs/BulkEditWizard.tsx`
- **Invalidations:**
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, listId] });
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
  ```

#### E. Bulk Delete
- **Components:** `src/components/workspace/WorkspaceView.tsx`
- **Invalidations:**
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, listId] });
  queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
  ```

---

## 4. Verification Checklist

- [x] Single server-state architecture managed by TanStack React Query.
- [x] Zero duplicate or uncontrolled server-side item caches in Zustand.
- [x] Structured query keys distinguish `site`, `list`, `search`, `filters`, `sort`, `page size`, and `pagination`.
- [x] Mutations (`create`, `update`, `delete`, `bulk update`, `bulk delete`) invalidate affected query keys.
- [x] UI updates immediately after operations to reflect live SharePoint state.
- [x] TypeScript build (`compile_applet`) and Linter (`lint_applet`) verified green.

---

**Audit Verdict:** PASS
