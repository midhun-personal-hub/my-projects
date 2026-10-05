import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  SharePointListConnection,
  ConnectionFormData,
  Department,
  DepartmentFormData,
} from '../types/connections';
import { DEFAULT_DEPARTMENTS, DEFAULT_CONNECTIONS } from '../data/defaultConnections';

interface DepartmentModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  departmentId?: string;
}

interface ConnectionModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  connectionId?: string;
}

interface ConnectionsState {
  // Department state
  departments: Department[];
  activeDepartmentId: string;
  departmentModalState: DepartmentModalState;

  // Active department scoped connection state
  connections: SharePointListConnection[];
  activeConnectionId: string;

  // Sidebar & Search UI states
  sidebarCollapsed: boolean;
  collapsedSites: Record<string, boolean>;
  multiViewsCollapsed: boolean;
  singleViewsCollapsed: boolean;
  searchQuery: string;
  modalState: ConnectionModalState;

  // Department Actions
  setActiveDepartmentId: (deptId: string) => void;
  getActiveDepartment: () => Department | undefined;
  openCreateDepartmentModal: () => void;
  openEditDepartmentModal: (departmentId: string) => void;
  closeDepartmentModal: () => void;
  addDepartment: (data: DepartmentFormData) => string;
  updateDepartment: (id: string, updates: Partial<DepartmentFormData>) => void;
  deleteDepartment: (id: string) => boolean;
  moveDepartment: (id: string, direction: 'up' | 'down') => void;

  // Connection Actions (scoped to active department)
  setActiveConnectionId: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSiteGroup: (siteId: string) => void;
  toggleMultiViews: () => void;
  toggleSingleViews: () => void;
  setMultiViewsCollapsed: (collapsed: boolean) => void;
  setSingleViewsCollapsed: (collapsed: boolean) => void;
  setSearchQuery: (query: string) => void;

  openCreateModal: () => void;
  openEditModal: (connectionId: string) => void;
  closeModal: () => void;

  addConnection: (data: ConnectionFormData) => string;
  updateConnection: (id: string, updates: Partial<ConnectionFormData>) => void;
  deleteConnection: (id: string) => void;
  moveConnection: (id: string, direction: 'up' | 'down') => void;
  reorderConnections: (sourceId: string, targetId: string) => void;
  resetToDefaults: () => void;
}

export const useConnectionsStore = create<ConnectionsState>()(
  persist(
    (set, get) => {
      const initialDepts = DEFAULT_DEPARTMENTS;
      const initialActiveDept = initialDepts[0];
      const initialConns = initialActiveDept.connections;
      const initialActiveConnId = initialActiveDept.activeConnectionId || initialConns[0]?.id || '';

      return {
        departments: initialDepts,
        activeDepartmentId: initialActiveDept.id,
        departmentModalState: {
          isOpen: false,
          mode: 'create',
        },

        connections: initialConns,
        activeConnectionId: initialActiveConnId,

        sidebarCollapsed: false,
        collapsedSites: {},
        multiViewsCollapsed: false,
        singleViewsCollapsed: false,
        searchQuery: '',
        modalState: {
          isOpen: false,
          mode: 'create',
        },

        // Department Actions
        setActiveDepartmentId: (deptId: string) => {
          const dept = get().departments.find((d) => d.id === deptId);
          if (dept) {
            const activeConnId =
              dept.activeConnectionId && dept.connections.some((c) => c.id === dept.activeConnectionId)
                ? dept.activeConnectionId
                : dept.connections[0]?.id || '';

            set({
              activeDepartmentId: deptId,
              connections: dept.connections,
              activeConnectionId: activeConnId,
              searchQuery: '',
            });
          }
        },

        getActiveDepartment: () => {
          const state = get();
          return state.departments.find((d) => d.id === state.activeDepartmentId) || state.departments[0];
        },

        openCreateDepartmentModal: () => {
          set({
            departmentModalState: {
              isOpen: true,
              mode: 'create',
            },
          });
        },

        openEditDepartmentModal: (departmentId: string) => {
          set({
            departmentModalState: {
              isOpen: true,
              mode: 'edit',
              departmentId,
            },
          });
        },

        closeDepartmentModal: () => {
          set((state) => ({
            departmentModalState: {
              ...state.departmentModalState,
              isOpen: false,
            },
          }));
        },

        addDepartment: (data: DepartmentFormData) => {
          const id = `dept-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const currentDepts = get().departments;
          const maxOrder = currentDepts.reduce((max, d) => Math.max(max, d.order ?? 0), -1);

          // Inherit initial single list connection as template so table works immediately
          const initialConnection: SharePointListConnection = {
            ...DEFAULT_CONNECTIONS[0],
            id: `conn-${Date.now()}-initial`,
            displayName: `${data.name} Overview`,
            description: `Primary SharePoint connection for ${data.name}`,
            order: 0,
            createdAt: new Date().toISOString(),
          };

          const newDept: Department = {
            ...data,
            id,
            order: maxOrder + 1,
            connections: [initialConnection],
            activeConnectionId: initialConnection.id,
            createdAt: new Date().toISOString(),
          };

          const updated = [...currentDepts, newDept];
          set({
            departments: updated,
            departmentModalState: { isOpen: false, mode: 'create' },
          });

          return id;
        },

        updateDepartment: (id: string, updates: Partial<DepartmentFormData>) => {
          const currentDepts = get().departments;
          const updated = currentDepts.map((d) => {
            if (d.id === id) {
              return {
                ...d,
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            }
            return d;
          });

          set({
            departments: updated,
            departmentModalState: { isOpen: false, mode: 'edit' },
          });
        },

        deleteDepartment: (id: string) => {
          const currentDepts = get().departments;
          if (currentDepts.length <= 1) {
            return false;
          }

          const filtered = currentDepts.filter((d) => d.id !== id);
          let nextActiveDeptId = get().activeDepartmentId;

          if (nextActiveDeptId === id) {
            nextActiveDeptId = filtered[0].id;
          }

          const nextDept = filtered.find((d) => d.id === nextActiveDeptId) || filtered[0];

          set({
            departments: filtered,
            activeDepartmentId: nextActiveDeptId,
            connections: nextDept.connections,
            activeConnectionId: nextDept.activeConnectionId || nextDept.connections[0]?.id || '',
            departmentModalState: { isOpen: false, mode: 'edit' },
          });

          return true;
        },

        moveDepartment: (id: string, direction: 'up' | 'down') => {
          const current = [...get().departments].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const index = current.findIndex((d) => d.id === id);
          if (index === -1) return;

          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= current.length) return;

          const temp = current[index];
          current[index] = current[targetIndex];
          current[targetIndex] = temp;

          const reordered = current.map((d, idx) => ({ ...d, order: idx }));
          set({ departments: reordered });
        },

        // Connection Actions
        setActiveConnectionId: (id: string) => {
          const state = get();
          const currentDepts = state.departments;
          const activeDeptId = state.activeDepartmentId;

          const updatedDepts = currentDepts.map((dept) => {
            if (dept.id === activeDeptId) {
              const exists = dept.connections.some((c) => c.id === id);
              if (exists) {
                return { ...dept, activeConnectionId: id };
              }
            }
            return dept;
          });

          set({
            departments: updatedDepts,
            activeConnectionId: id,
          });
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set({ sidebarCollapsed: collapsed });
        },

        toggleSiteGroup: (siteId: string) => {
          set((state) => ({
            collapsedSites: {
              ...state.collapsedSites,
              [siteId]: !state.collapsedSites[siteId],
            },
          }));
        },

        toggleMultiViews: () => {
          set((state) => ({ multiViewsCollapsed: !state.multiViewsCollapsed }));
        },

        toggleSingleViews: () => {
          set((state) => ({ singleViewsCollapsed: !state.singleViewsCollapsed }));
        },

        setMultiViewsCollapsed: (collapsed: boolean) => {
          set({ multiViewsCollapsed: collapsed });
        },

        setSingleViewsCollapsed: (collapsed: boolean) => {
          set({ singleViewsCollapsed: collapsed });
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },

        openCreateModal: () => {
          set({
            modalState: {
              isOpen: true,
              mode: 'create',
            },
          });
        },

        openEditModal: (connectionId: string) => {
          set({
            modalState: {
              isOpen: true,
              mode: 'edit',
              connectionId,
            },
          });
        },

        closeModal: () => {
          set((state) => ({
            modalState: {
              ...state.modalState,
              isOpen: false,
            },
          }));
        },

        addConnection: (data: ConnectionFormData) => {
          const id = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const now = new Date().toISOString();
          const state = get();
          const currentConns = state.connections;
          const maxOrder = currentConns.reduce((max, c) => Math.max(max, c.order ?? 0), -1);

          const newConnection: SharePointListConnection = {
            ...data,
            id,
            createdAt: now,
            order: maxOrder + 1,
          };

          const updatedConns = [...currentConns, newConnection];

          const updatedDepts = state.departments.map((dept) => {
            if (dept.id === state.activeDepartmentId) {
              return {
                ...dept,
                connections: updatedConns,
                activeConnectionId: id,
              };
            }
            return dept;
          });

          set({
            departments: updatedDepts,
            connections: updatedConns,
            activeConnectionId: id,
            modalState: { isOpen: false, mode: 'create' },
          });

          return id;
        },

        updateConnection: (id: string, updates: Partial<ConnectionFormData>) => {
          const state = get();
          const updatedConns = state.connections.map((c) => {
            if (c.id === id) {
              return {
                ...c,
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });

          const updatedDepts = state.departments.map((dept) => {
            if (dept.id === state.activeDepartmentId) {
              return {
                ...dept,
                connections: updatedConns,
              };
            }
            return dept;
          });

          set({
            departments: updatedDepts,
            connections: updatedConns,
            modalState: { isOpen: false, mode: 'edit' },
          });
        },

        deleteConnection: (id: string) => {
          const state = get();
          if (state.connections.length <= 1) {
            alert('At least one connection must remain configured in this department.');
            return;
          }

          const filtered = state.connections.filter((c) => c.id !== id);
          let nextActiveId = state.activeConnectionId;

          if (nextActiveId === id) {
            nextActiveId = filtered[0]?.id || '';
          }

          const updatedDepts = state.departments.map((dept) => {
            if (dept.id === state.activeDepartmentId) {
              return {
                ...dept,
                connections: filtered,
                activeConnectionId: nextActiveId,
              };
            }
            return dept;
          });

          set({
            departments: updatedDepts,
            connections: filtered,
            activeConnectionId: nextActiveId,
            modalState: { isOpen: false, mode: 'edit' },
          });
        },

        moveConnection: (id: string, direction: 'up' | 'down') => {
          const state = get();
          const current = [...state.connections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const index = current.findIndex((c) => c.id === id);
          if (index === -1) return;

          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= current.length) return;

          const temp = current[index];
          current[index] = current[targetIndex];
          current[targetIndex] = temp;

          const reordered = current.map((c, idx) => ({ ...c, order: idx }));

          const updatedDepts = state.departments.map((dept) => {
            if (dept.id === state.activeDepartmentId) {
              return {
                ...dept,
                connections: reordered,
              };
            }
            return dept;
          });

          set({
            departments: updatedDepts,
            connections: reordered,
          });
        },

        reorderConnections: (sourceId: string, targetId: string) => {
          if (sourceId === targetId) return;
          const state = get();
          const current = [...state.connections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const sourceIndex = current.findIndex((c) => c.id === sourceId);
          const targetIndex = current.findIndex((c) => c.id === targetId);
          if (sourceIndex === -1 || targetIndex === -1) return;

          const [movedItem] = current.splice(sourceIndex, 1);
          current.splice(targetIndex, 0, movedItem);

          const reordered = current.map((c, idx) => ({ ...c, order: idx }));

          const updatedDepts = state.departments.map((dept) => {
            if (dept.id === state.activeDepartmentId) {
              return {
                ...dept,
                connections: reordered,
              };
            }
            return dept;
          });

          set({
            departments: updatedDepts,
            connections: reordered,
          });
        },

        resetToDefaults: () => {
          const defaultDepts = DEFAULT_DEPARTMENTS;
          const firstDept = defaultDepts[0];
          set({
            departments: defaultDepts,
            activeDepartmentId: firstDept.id,
            connections: firstDept.connections,
            activeConnectionId: firstDept.activeConnectionId || firstDept.connections[0].id,
            collapsedSites: {},
            multiViewsCollapsed: false,
            singleViewsCollapsed: false,
            searchQuery: '',
          });
        },
      };
    },
    {
      name: 'sharepoint_connections_store',
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        departments: state.departments,
        activeDepartmentId: state.activeDepartmentId,
        sidebarCollapsed: state.sidebarCollapsed,
        collapsedSites: state.collapsedSites,
        multiViewsCollapsed: state.multiViewsCollapsed,
        singleViewsCollapsed: state.singleViewsCollapsed,
      }),
      migrate: (persistedState: any, version: number) => {
        if (version < 4 || !persistedState?.departments || persistedState.departments.length === 0) {
          const defaultDepts = DEFAULT_DEPARTMENTS;
          return {
            ...persistedState,
            departments: defaultDepts,
            activeDepartmentId: defaultDepts[0].id,
            connections: defaultDepts[0].connections,
            activeConnectionId: defaultDepts[0].activeConnectionId || defaultDepts[0].connections[0].id,
          };
        }
        return persistedState;
      },
    }
  )
);
