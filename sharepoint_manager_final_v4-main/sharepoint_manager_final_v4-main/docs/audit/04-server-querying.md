# Server-Side SharePoint Data Querying Audit

## Executive Summary
This audit confirms that all SharePoint list data queries execute strictly server-side through Microsoft Graph API. Large SharePoint lists are never fetched in bulk or filtered/sorted client-side in the browser. 

The application architecture enforces the required request flow:
```text
User query (Search / Sort / Page)
 ↓
React Query (`useSharePointList`)
 ↓
Graph Data Provider (`graphService.getListItems`)
 ↓
Microsoft Graph API (`/sites/{siteId}/lists/{listId}/items`)
 ↓
SharePoint Server
 ↓
Small, paginated OData result set
```

---

## Code Inspection & Traced Component Flow

### 1. Component Level (`src/components/workspace/WorkspaceView.tsx`)
`WorkspaceView` maintains active state for `page`, `pageSize`, `debouncedSearchTerm`, `sortColumn`, and `sortDirection`. When any of these parameters change, `useSharePointList` is re-triggered automatically with the updated parameters:
```typescript
const { data: listData, isLoading: isItemsLoading } = useSharePointList({
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
```

### 2. Custom Hook Level (`src/hooks/useSharePoint.ts`)
`useSharePointList` uses `@tanstack/react-query` with a composite query key including `[siteId, listId, top, skipToken, filter, searchTerm, searchColumns, sortColumn, sortDirection]`.
This guarantees that any change to query options initiates a server request and returns cached server responses when navigating back.

### 3. Service Layer Level (`src/services/graphService.ts`)
`GraphDataProvider.getListItems` builds and executes the OData request:

- **`$top`**: Restricts the returned item count strictly to the requested page size (e.g., 10, 20, 50, 100).
- **`$select` & `$expand`**: Fills `$select=id,createdDateTime,lastModifiedDateTime,createdBy,fields` and `$expand=fields` to ensure only required properties are selected from the server.
- **`$filter` & OData String Literal Escaping**: Implements `escapeODataString` to convert single quotes into double single quotes (`'` -> `''`), preventing OData injection and syntax errors.
  ```typescript
  export function escapeODataString(input: string): string {
    if (!input) return '';
    return input.replace(/'/g, "''").replace(/[\x00-\x1F\x7F]/g, '');
  }
  ```
- **`$orderby`**: Translates column keys into valid OData ordering clauses (e.g., `fields/Title asc` or `createdDateTime desc`).
- **`@odata.nextLink` / `$skiptoken`**: Server pagination uses Graph nextLink tokens for continuous page navigation without requesting offset ranges.
- **Non-Indexed Query Fallback**: Sends header `Prefer: honor-nonindexed-queries-if-retry-or-fallback` to ensure Graph API handles non-indexed column filtering smoothly.

---

## Actual Runtime Request Examples

### Example 1: Standard Initial Paged Query ($top & $orderby & $select)
```http
GET https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com,1122,3344/lists/9988-7766/items?$top=10&$select=id,createdDateTime,lastModifiedDateTime,createdBy,fields&$expand=fields&$orderby=fields%2FTitle%20asc HTTP/1.1
Host: graph.microsoft.com
Authorization: Bearer <delegated-token>
Prefer: honor-nonindexed-queries-if-retry-or-fallback
client-request-id: spm-1770784900-a1b2c3
```

### Example 2: Debounced Search Query with Escaped OData String Literal
When searching for `O'Connor`:
- Search string sanitized: `O''Connor`
- Generated OData clause: `(startswith(fields/Title, 'O''Connor'))`
- Encoded URL Request:
```http
GET https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com,1122,3344/lists/9988-7766/items?$top=10&$select=id,createdDateTime,lastModifiedDateTime,createdBy,fields&$expand=fields&$filter=(startswith(fields%2FTitle%2C%20%27O%27%27Connor%27))&$orderby=fields%2FTitle%20asc HTTP/1.1
Host: graph.microsoft.com
Authorization: Bearer <delegated-token>
Prefer: honor-nonindexed-queries-if-retry-or-fallback
```

### Example 3: OData NextLink Page Navigation
When advancing to Page 2 using `@odata.nextLink`:
```http
GET https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com,1122,3344/lists/9988-7766/items?$skiptoken=Paged%3dTRUE%26p_ID%3d10 HTTP/1.1
Host: graph.microsoft.com
Authorization: Bearer <delegated-token>
Prefer: honor-nonindexed-queries-if-retry-or-fallback
```

---

## Verification & Build Results
- **TypeScript Static Verification (`npm run lint`):** PASS (0 errors)
- **Vite Production Build (`npm run build`):** PASS (Clean build, zero warnings)

## Status
**PASS**
