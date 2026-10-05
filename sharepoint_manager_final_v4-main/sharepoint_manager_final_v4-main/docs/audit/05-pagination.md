# Audit Documentation: 05 — True Graph Pagination

**Status:** PASS  
**Date:** 2026-08-10  
**Target:** Microsoft Graph API Pagination (`$top` & `@odata.nextLink`)

---

## Executive Summary

Remediation 05 replaces pseudo client-side array slicing with **true Microsoft Graph OData pagination**. The application strictly queries Graph using `$top` page sizes (`10`, `20`, `50`, `100`) and traverses opaque pagination tokens via `@odata.nextLink`. Item array length (`items.length`) is explicitly untethered from total count representations, ensuring standard enterprise Graph OData compliance.

---

## Key Technical Specifications & Verification Matrix

### 1. Page Size Configurations ($top)
- **Supported Choices:** `10`, `20`, `50`, `100` records per page.
- **Default Page Size:** `10` records (aligned across `graphService`, `useSharePointList`, `WorkspaceView`, and `TablePagination`).
- **Graph Parameter:** Passed via `$top=<pageSize>` query parameter on initial requests.

### 2. OData Traversal (@odata.nextLink)
- **Next Page Token Storage:** Maintained as `skipTokens` map (`Record<number, string | undefined>`) inside `WorkspaceView`.
- **URL Handling:** When Graph returns `@odata.nextLink`, `graphService.getListItems` detects full URLs starting with `http` and fetches directly using `fetchWithRetry(nextLink)`, preserving all query tokens attached by Graph API.
- **Total Count Integrity:** `totalItems` reflects `@odata.count` when explicitly provided by Graph; otherwise returned as `undefined` without assuming `items.length` is total list length.

### 3. Combination State Handling
- **Search Reset:** Modifying search term (`debouncedSearchTerm`) resets active page to `1` and clears `skipTokens` to `{ 1: undefined }`.
- **Filter Reset:** Modifying dynamic filter panel criteria resets page to `1` and clears `skipTokens`.
- **Sort Reset:** Changing sort column or direction (`$orderby`) resets page to `1` and clears `skipTokens`.
- **Page Size Reset:** Changing rows per page resets page to `1` and re-queries Graph with new `$top`.

---

## UI Component Navigation Controls

| Control | Action | State Behavior |
| :--- | :--- | :--- |
| **First Page (`ChevronsLeft`)** | Requests Page 1 | Sets `page = 1`, uses `skipToken: undefined` |
| **Previous Page (`ChevronLeft`)** | Requests `page - 1` | Sets `page = page - 1`, uses `skipTokens[page - 1]` |
| **Next Page (`ChevronRight`)** | Requests `page + 1` | Sets `page = page + 1`, uses `skipTokens[page + 1]` |
| **Page Size Selector** | Changes rows per page | Triggers `onPageSizeChange`, resets to `page = 1` |

---

## Code Base Evidence

### Graph API Service (`src/services/graphService.ts`)
```typescript
async getListItems(
  siteId: string,
  listId: string,
  options?: DataQueryOptions
): Promise<{ items: SharePointListItem[]; nextLink?: string; totalItems?: number }> {
  const top = options?.top ?? 10;
  const skipToken = options?.skipToken;

  // If skipToken is a full URL (@odata.nextLink), fetch it directly
  if (skipToken && skipToken.startsWith('http')) {
    const response = await this.fetchWithRetry(skipToken, ...);
    const data = await response.json();
    return {
      items,
      nextLink: data['@odata.nextLink'] || undefined,
      totalItems: data['@odata.count'] !== undefined ? data['@odata.count'] : undefined,
    };
  }
  ...
}
```

### Table Pagination (`src/components/tables/TablePagination.tsx`)
```typescript
const isTotalKnown = totalItems !== undefined && totalItems !== null;
const totalPages = isTotalKnown ? Math.max(1, Math.ceil(totalItems! / pageSize)) : undefined;

// Computed window item range display
const startItem = countOnPage === 0 ? 0 : (currentPage - 1) * pageSize + 1;
const endItem = isTotalKnown
  ? Math.min(currentPage * pageSize, totalItems!)
  : (currentPage - 1) * pageSize + countOnPage;
```

---

## Test & Audit Verification Checklist

- [x] Page Size 10 Verified ($top=10)
- [x] Page Size 20 Verified ($top=20)
- [x] Page Size 50 Verified ($top=50)
- [x] Page Size 100 Verified ($top=100)
- [x] Next Page Traversal via `@odata.nextLink`
- [x] Previous Page Traversal via Cached Tokens
- [x] First Page Navigation
- [x] Search Reset + Pagination
- [x] Filter Reset + Pagination
- [x] Sort Reset + Pagination
- [x] `items.length` Untethered from Total Count

---

**Audit Conclusion:** PASS
