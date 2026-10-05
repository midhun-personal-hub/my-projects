/**
 * Route/component composition is static (import + React Router), not a runtime string-keyed registry.
 * No eval() / dangerouslySetInnerHTML is used anywhere in this codebase (verified via audit).
 */

import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { PermissionGuard } from '../components/common/PermissionGuard';
import { AppLayout } from './AppLayout';

// ==============================================================================
// LAZY-LOADED FEATURE MODULES (CODE SPLITTING FOR INITIAL BUNDLE OPTIMIZATION)
// ==============================================================================
const LoginPage = React.lazy(() => import('../auth/LoginPage'));
const DashboardPage = React.lazy(() => import('../features/dashboard/DashboardPage'));
const WorkspacePage = React.lazy(() => import('../features/workplaces/WorkspacePage'));
const ListPage = React.lazy(() => import('../features/menus/ListPage'));
const DetailsPage = React.lazy(() => import('../features/menus/DetailsPage'));
const AdminPage = React.lazy(() => import('../features/admin/AdminPage'));

/**
 * Skeleton Loader for top-level full screen page transitions (e.g. LoginPage)
 */
const FullScreenPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Enterprise Application Client Router Definition
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <React.Suspense fallback={<FullScreenPageSkeleton />}>
        <LoginPage />
      </React.Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'workspace/:workspaceId',
        element: <WorkspacePage />,
      },
      {
        path: 'lists/:listKey',
        element: <ListPage />,
      },
      {
        path: 'lists/:listKey/:itemId',
        element: <DetailsPage />,
      },
      {
        path: 'admin',
        element: (
          <PermissionGuard requiredRole="Administrator">
            <AdminPage />
          </PermissionGuard>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
