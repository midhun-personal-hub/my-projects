import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ListBrowser } from '../features/lists/ListBrowser';
import { ListDetail } from '../features/lists/ListDetail';
import { ItemGrid } from '../features/items/ItemGrid';
import { ColumnEditor } from '../features/schema-editor/ColumnEditor';
import { PermissionsPanel } from '../features/permissions/PermissionsPanel';

export function AppRouter() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">SharePoint Management Platform</h1>
          <nav className="flex space-x-4 text-sm font-medium">
            <Link to="/" className="text-neutral-600 hover:text-neutral-900">Lists</Link>
            <Link to="/items" className="text-neutral-600 hover:text-neutral-900">Items</Link>
            <Link to="/schema" className="text-neutral-600 hover:text-neutral-900">Schema</Link>
            <Link to="/permissions" className="text-neutral-600 hover:text-neutral-900">Permissions</Link>
          </nav>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<ListBrowser />} />
            <Route path="/lists/:listId" element={<ListDetail />} />
            <Route path="/items" element={<ItemGrid />} />
            <Route path="/schema" element={<ColumnEditor />} />
            <Route path="/permissions" element={<PermissionsPanel />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
