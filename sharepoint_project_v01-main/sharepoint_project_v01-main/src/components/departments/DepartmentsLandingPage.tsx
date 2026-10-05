import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building2,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  ExternalLink,
  Sparkles,
  Database,
  ArrowRight,
} from 'lucide-react';
import { useConnectionsStore } from '../../state/connectionsStore';
import { DepartmentModal } from './DepartmentModal';
import { ThemeToggle } from '../common/ThemeToggle';
import type { Department } from '../../types/connections';

export function DepartmentsLandingPage() {
  const navigate = useNavigate();
  const {
    departments,
    setActiveDepartmentId,
    openCreateDepartmentModal,
    openEditDepartmentModal,
    deleteDepartment,
    moveDepartment,
  } = useConnectionsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered and sorted departments
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return sortedDepartments;
    const q = searchQuery.toLowerCase();
    return sortedDepartments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [sortedDepartments, searchQuery]);

  const handleCardClick = (deptId: string) => {
    setActiveDepartmentId(deptId);
    navigate(`/department/${deptId}`);
  };

  const handleDelete = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    if (departments.length <= 1) {
      alert('You must have at least one department configured.');
      return;
    }
    setDeleteConfirmId(dept.id);
  };

  const confirmDelete = (e: React.MouseEvent, deptId: string) => {
    e.stopPropagation();
    deleteDepartment(deptId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-100/70 dark:bg-[#0b1120] flex flex-col font-sans text-neutral-900 dark:text-slate-100 antialiased selection:bg-blue-100 dark:selection:bg-blue-900">
      {/* 1. Global Navigation Topbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#131d2e]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-white/10 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              <span>SP</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-slate-100">
                  SharePoint Hub
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80">
                  Enterprise Directory
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-slate-400">
                Departmental Workspaces & Multi-Source Views
              </p>
            </div>
          </div>

          {/* Right Actions: Theme Toggle + Add Department Button */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              id="btn-add-department-topbar"
              type="button"
              onClick={openCreateDepartmentModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer hover:shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Header Section */}
      <section className="bg-white dark:bg-[#131d2e] border-b border-neutral-200/70 dark:border-white/10 pt-8 pb-7 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Departmental Workspaces</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-slate-100">
              Departments & Operations Directory
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">
              Select an organizational department to access its configured SharePoint list menu
              views, unified multi-source data schemas, and records.
            </p>
          </div>

          {/* Search Input & Total Counter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
              <input
                id="search-departments-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search departments..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50/50 dark:bg-[#0b1120] hover:bg-white dark:hover:bg-[#0f172a] focus:bg-white dark:focus:bg-[#0f172a] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200/50 dark:border-white/10 rounded-xl text-xs font-medium text-neutral-600 dark:text-slate-300 flex-shrink-0">
              <span>{departments.length} Departments</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Content: Department Cards Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredDepartments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#131d2e] rounded-2xl border border-dashed border-neutral-300 dark:border-white/15 p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-white/5 text-neutral-400 dark:text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 dark:text-slate-200">No departments found</h3>
            <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 mb-4">
              {searchQuery
                ? `No department matches "${searchQuery}". Try clearing the search.`
                : 'Get started by creating your first organizational department.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreateDepartmentModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Add Department
              </button>
            )}
          </div>
        ) : (
          <div
            id="department-cards-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredDepartments.map((dept, index) => {
              const connectionCount = dept.connections?.length || 0;
              const totalSourcesCount = (dept.connections || []).reduce(
                (sum, c) => sum + (c.sources?.length || 1),
                0
              );
              const isFirst = index === 0;
              const isLast = index === filteredDepartments.length - 1;

              return (
                <div
                  key={dept.id}
                  id={`department-card-${dept.id}`}
                  onClick={() => handleCardClick(dept.id)}
                  className="group bg-white dark:bg-[#131d2e] rounded-2xl border border-neutral-200/90 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden cursor-pointer relative"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(dept.id);
                    }
                  }}
                >
                  {/* Card Thumbnail Banner */}
                  <div className="h-44 w-full bg-neutral-200 dark:bg-slate-800 relative overflow-hidden flex-shrink-0">
                    <img
                      src={dept.imageUrl}
                      alt={dept.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-900/20 to-transparent" />

                    {/* Quick Reorder Controls (Top Left) */}
                    <div
                      className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-lg shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveDepartment(dept.id, 'up')}
                        className="p-1 rounded text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                        title="Move department earlier in sequence"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveDepartment(dept.id, 'down')}
                        className="p-1 rounded text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                        title="Move department later in sequence"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Edit & Delete Actions (Top Right) */}
                    <div
                      className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-lg shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDepartmentModal(dept.id);
                        }}
                        className="p-1.5 rounded-md text-neutral-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Department"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, dept)}
                        className="p-1.5 rounded-md text-neutral-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Department Tag Overlay (Bottom of Banner) */}
                    <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 backdrop-blur-md border border-white/20 text-white">
                          {connectionCount} {connectionCount === 1 ? 'Configured View' : 'Configured Views'}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-white tracking-tight leading-snug drop-shadow-xs line-clamp-1">
                        {dept.name}
                      </h2>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <p className="text-xs text-neutral-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {dept.description || 'No description provided for this department.'}
                    </p>

                    {/* Connected Views Summary */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-white/10 flex items-center justify-between text-[11px] text-neutral-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" />
                        <span>{totalSourcesCount} SharePoint Lists</span>
                      </div>

                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Delete Confirmation Overlay */}
                  {deleteConfirmId === dept.id && (
                    <div
                      className="absolute inset-0 bg-white/95 dark:bg-[#131d2e]/95 backdrop-blur-xs p-5 flex flex-col items-center justify-center text-center z-20 animate-in fade-in duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-slate-100">Delete {dept.name}?</h4>
                      <p className="text-[11px] text-neutral-500 dark:text-slate-400 mt-1 mb-4">
                        This department and its scoped menu views will be removed.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-slate-300 bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => confirmDelete(e, dept.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal for creating / editing department cards */}
      <DepartmentModal />
    </div>
  );
}
