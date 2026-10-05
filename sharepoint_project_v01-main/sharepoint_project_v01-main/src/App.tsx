/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DepartmentsLandingPage } from './components/departments/DepartmentsLandingPage';
import { DepartmentTableView } from './components/departments/DepartmentTableView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main landing page showing responsive grid of department cards */}
        <Route path="/" element={<DepartmentsLandingPage />} />

        {/* Department-scoped workspace with its own sidebar menus and adaptive table */}
        <Route path="/department/:departmentId" element={<DepartmentTableView />} />

        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
