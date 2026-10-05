import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ListFilter,
} from 'lucide-react';

export interface TablePaginationProps {
  /** Optional total number of records across all pages */
  totalItems?: number;
  /** Active 1-indexed page number */
  currentPage: number;
  /** Active page size allocation limit */
  pageSize: number;
  /** Callback fired when page index is requested */
  onPageChange: (page: number) => void;
  /** Callback fired when page size selection is modified */
  onPageSizeChange: (size: number) => void;
  /** Flag indicating if subsequent page exists */
  hasNextPage: boolean;
  /** Flag indicating if prior page exists */
  hasPreviousPage: boolean;
  /** Standardized page size dropdown choices */
  pageSizeOptions?: number[];
  /** Optional count of records on current page */
  currentItemsCount?: number;
}

/**
 * Enterprise Server-Side TablePagination Component
 *
 * Provides responsive controls for server-side dataset navigation.
 * Interfaces with Microsoft Graph API pagination ($top & $skiptoken) parameters.
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  hasNextPage,
  hasPreviousPage,
  pageSizeOptions = [10, 20, 50, 100],
  currentItemsCount,
}) => {
  const isTotalKnown = totalItems !== undefined && totalItems !== null;
  const totalPages = isTotalKnown ? Math.max(1, Math.ceil(totalItems! / pageSize)) : undefined;

  // Compute 1-indexed item window display range
  const countOnPage = currentItemsCount !== undefined ? currentItemsCount : pageSize;
  const startItem = countOnPage === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = isTotalKnown
    ? Math.min(currentPage * pageSize, totalItems!)
    : (currentPage - 1) * pageSize + countOnPage;

  // Generate bounded page number array
  const getPageNumbers = () => {
    if (isTotalKnown && totalPages !== undefined) {
      if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      const delta = 1;
      const range: number[] = [];
      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        range.unshift(-1); // Ellipsis flag
      }
      if (currentPage + delta < totalPages - 1) {
        range.push(-2); // Ellipsis flag
      }

      range.unshift(1);
      if (totalPages > 1) {
        range.push(totalPages);
      }

      return range;
    } else {
      // OData NextLink Mode: Show visited pages 1..currentPage, plus currentPage+1 if hasNextPage
      const maxPage = hasNextPage ? currentPage + 1 : currentPage;
      const pages: number[] = [];
      for (let i = 1; i <= maxPage; i++) {
        pages.push(i);
      }
      return pages;
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none transition-colors">
      {/* Left Section: Page Size Selector & Record Window Counter */}
      <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
        {/* Page Size Allocation Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Item Count Range Display */}
        <div className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
          <ListFilter className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Showing <strong className="font-bold text-slate-900 dark:text-slate-100">{startItem.toLocaleString()}</strong>–
            <strong className="font-bold text-slate-900 dark:text-slate-100">{endItem.toLocaleString()}</strong>
            {isTotalKnown ? (
              <>
                {' '}of <strong className="font-bold text-brand-600 dark:text-brand-400">{totalItems!.toLocaleString()}</strong> items
              </>
            ) : hasNextPage ? (
              <>
                {' '}of <strong className="font-bold text-brand-600 dark:text-brand-400">{endItem.toLocaleString()}+</strong> items
              </>
            ) : (
              <>
                {' '}of <strong className="font-bold text-brand-600 dark:text-brand-400">{endItem.toLocaleString()}</strong> items
              </>
            )}
          </span>
        </div>
      </div>

      {/* Right Section: Pagination Action Controls */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
        {/* First Page Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPreviousPage || currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="First Page"
          aria-label="Go to first page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage || currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p < 0) {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold">
                  …
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || (isTotalKnown && totalPages !== undefined && currentPage >= totalPages)}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page Button */}
        <button
          onClick={() => isTotalKnown && totalPages !== undefined ? onPageChange(totalPages) : null}
          disabled={!isTotalKnown || !hasNextPage || (totalPages !== undefined && currentPage >= totalPages)}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
          aria-label="Go to last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
