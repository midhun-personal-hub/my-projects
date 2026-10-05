import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SharePointListItem } from '../types/sharepoint';

interface DemoDataState {
  // Rows keyed by connectionId
  connectionRows: Record<string, SharePointListItem[]>;

  // Notification / toast feedback
  lastActionNotice: { message: string; type: 'success' | 'info' | 'danger'; timestamp: number } | null;
  clearNotice: () => void;

  // Actions
  initConnectionRows: (connectionId: string, defaultRows: SharePointListItem[]) => void;
  addRow: (connectionId: string, fields: Record<string, any>) => void;
  updateRow: (connectionId: string, rowId: string, updatedFields: Record<string, any>) => void;
  deleteRow: (connectionId: string, rowId: string) => void;
  resetConnectionRows: (connectionId?: string) => void;
}

export const useDemoDataStore = create<DemoDataState>()(
  persist(
    (set, get) => ({
      connectionRows: {},
      lastActionNotice: null,

      clearNotice: () => set({ lastActionNotice: null }),

      initConnectionRows: (connectionId: string, defaultRows: SharePointListItem[]) => {
        const existing = get().connectionRows[connectionId];
        if (!existing || existing.length === 0) {
          set((state) => ({
            connectionRows: {
              ...state.connectionRows,
              [connectionId]: defaultRows,
            },
          }));
        }
      },

      addRow: (connectionId: string, fields: Record<string, any>) => {
        const currentRows = get().connectionRows[connectionId] || [];
        const newId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const now = new Date().toISOString();
        const newRow: SharePointListItem = {
          id: newId,
          createdDateTime: now,
          lastModifiedDateTime: now,
          fields: {
            ...fields,
            Title: fields.Title || fields.name || 'New Item',
          },
        };

        set((state) => ({
          connectionRows: {
            ...state.connectionRows,
            [connectionId]: [newRow, ...(state.connectionRows[connectionId] || [])],
          },
          lastActionNotice: {
            message: 'New row successfully added to table',
            type: 'success',
            timestamp: Date.now(),
          },
        }));
      },

      updateRow: (connectionId: string, rowId: string, updatedFields: Record<string, any>) => {
        const currentRows = get().connectionRows[connectionId];
        if (!currentRows) return;

        const updated = currentRows.map((row) => {
          if (row.id === rowId) {
            return {
              ...row,
              lastModifiedDateTime: new Date().toISOString(),
              fields: {
                ...row.fields,
                ...updatedFields,
              },
            };
          }
          return row;
        });

        set((state) => ({
          connectionRows: {
            ...state.connectionRows,
            [connectionId]: updated,
          },
          lastActionNotice: {
            message: 'Row successfully updated',
            type: 'success',
            timestamp: Date.now(),
          },
        }));
      },

      deleteRow: (connectionId: string, rowId: string) => {
        const currentRows = get().connectionRows[connectionId];
        if (!currentRows) return;

        const filtered = currentRows.filter((row) => row.id !== rowId);

        set((state) => ({
          connectionRows: {
            ...state.connectionRows,
            [connectionId]: filtered,
          },
          lastActionNotice: {
            message: 'Row successfully removed from table',
            type: 'danger',
            timestamp: Date.now(),
          },
        }));
      },

      resetConnectionRows: (connectionId?: string) => {
        if (connectionId) {
          set((state) => {
            const next = { ...state.connectionRows };
            delete next[connectionId];
            return { connectionRows: next };
          });
        } else {
          set({ connectionRows: {} });
        }
      },
    }),
    {
      name: 'sharepoint_demo_data_store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
