import React from 'react';

/**
 * Base pulsing skeleton block
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`}
  />
);

/**
 * TableSkeleton Component
 * Renders a mock table layout with pulsing search toolbar, headers, and rows
 * matching the enterprise DataTable design system.
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="w-full space-y-4 p-4 md:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse">
      {/* Top Search & Action Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
        <div className="h-9 w-full sm:w-72 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* Mock Table Frame */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="h-11 bg-slate-100 dark:bg-slate-800/80 px-4 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div className="h-4 w-6 bg-slate-300 dark:bg-slate-700 rounded" />
          <div className="h-4 w-32 bg-slate-300 dark:bg-slate-700 rounded" />
          <div className="h-4 w-28 bg-slate-300 dark:bg-slate-700 rounded hidden md:block" />
          <div className="h-4 w-24 bg-slate-300 dark:bg-slate-700 rounded hidden lg:block" />
          <div className="h-4 w-20 bg-slate-300 dark:bg-slate-700 rounded hidden xl:block" />
          <div className="h-4 w-16 bg-slate-300 dark:bg-slate-700 rounded" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className="h-14 px-4 flex items-center justify-between gap-4"
            >
              <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded hidden md:block" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-full hidden lg:block" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded hidden xl:block" />
              <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="flex gap-1.5">
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

/**
 * CardGridSkeleton Component
 * Renders a responsive grid of pulsing cards matching the workspace dashboard design.
 */
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="w-16 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="space-y-2">
            <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * PageSkeleton Component
 * Master application skeleton silhouette matching the AppShell (Header + Collapsible Sidebar + Content)
 * Used during MSAL auth checking or initial application configuration bootstrapping.
 */
export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans animate-pulse">
      {/* Header Silhouette */}
      <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded hidden sm:block" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg hidden sm:block" />
          <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Body Area: Sidebar Silhouette + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar Silhouette */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-6 hidden md:block shrink-0">
          <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="space-y-3 pt-2">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>

        {/* Content View Silhouette */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-hidden">
          {/* Hero Banner Skeleton */}
          <div className="h-28 bg-slate-200 dark:bg-slate-800/80 rounded-2xl w-full" />

          {/* Cards Skeleton Grid */}
          <CardGridSkeleton count={3} />

          {/* Table Skeleton */}
          <TableSkeleton rows={4} />
        </main>
      </div>
    </div>
  );
};
