// ==============================================================================
// GLOBAL APPLICATION STATE ENGINE (ZUSTAND)
// ==============================================================================
// Manages active workspace selection, user context, audit logs, and feedback toasts.
// Authoritative configuration state is persisted directly to SharePoint Lists.
// ==============================================================================

import { create } from 'zustand';
import { AuditLog, ToastMessage, UserProfile, UserRole } from '../types';
import { auditService, resolveAuthenticatedUser, AuditRecordPayload } from '../services/auditService';

export const ANONYMOUS_USER: UserProfile = {
  id: 'anonymous',
  displayName: 'Anonymous User',
  email: '',
  userPrincipalName: '',
  role: 'Employee',
  jobTitle: '',
  department: '',
};

export interface LogActionParams {
  action: AuditLog['action'];
  details: string;
  workspaceName?: string;
  menuName?: string;
  workspaceId?: string;
  menuId?: string;
  listId?: string;
  itemId?: string;
  result?: 'SUCCESS' | 'FAILED';
  errorCode?: string;
  correlationId?: string;
  itemCount?: number;
  successCount?: number;
  failureCount?: number;
  changedFields?: Record<string, any> | string;
}

interface AppState {
  // Theme & Environment (UI Preferences)
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Navigation (UI State)
  activeWorkspaceId: string | null;
  activeMenuId: string | null;
  setActiveWorkspace: (id: string | null) => void;
  setActiveMenu: (id: string | null) => void;

  // User Context
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  logout: () => void;

  // Audit Logging
  auditLogs: AuditLog[];
  logAction: (
    actionOrParams: AuditLog['action'] | LogActionParams,
    details?: string,
    workspaceName?: string,
    menuName?: string
  ) => Promise<AuditLog>;
  fetchAuditLogsFromSharePoint: () => Promise<void>;

  // Feedback Notifications
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isDarkMode: false,
  toggleDarkMode: () => {
    const next = !get().isDarkMode;
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDarkMode: next });
  },

  activeWorkspaceId: 'ws-projects',
  activeMenuId: 'menu-active-projects',
  setActiveWorkspace: (id) => {
    set({
      activeWorkspaceId: id,
    });
  },
  setActiveMenu: (id) => set({ activeMenuId: id }),

  currentUser: ANONYMOUS_USER,

  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: ANONYMOUS_USER }),

  auditLogs: [],

  logAction: async (actionOrParams, detailsArg, workspaceNameArg, menuNameArg) => {
    let params: LogActionParams;
    if (typeof actionOrParams === 'object') {
      params = actionOrParams;
    } else {
      params = {
        action: actionOrParams,
        details: detailsArg || '',
        workspaceName: workspaceNameArg,
        menuName: menuNameArg,
      };
    }

    const realUser = resolveAuthenticatedUser(get().currentUser);
    const correlationId = params.correlationId || `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const payload: AuditRecordPayload = {
      timestamp: new Date().toISOString(),
      userId: realUser.id,
      userDisplayName: realUser.name,
      operation: params.action,
      workspaceId: params.workspaceId || params.workspaceName || '',
      workspaceName: params.workspaceName || '',
      menuId: params.menuId || params.menuName || '',
      menuName: params.menuName || '',
      listId: params.listId || '',
      itemId: params.itemId || '',
      result: params.result || 'SUCCESS',
      errorCode: params.errorCode,
      correlationId: correlationId,
      itemCount: params.itemCount || 1,
      successCount: params.successCount ?? (params.result === 'FAILED' ? 0 : 1),
      failureCount: params.failureCount ?? (params.result === 'FAILED' ? 1 : 0),
      changedFields: params.changedFields,
      details: params.details,
    };

    const res = await auditService.logAuditRecord(payload, get().currentUser);

    set((state) => ({
      auditLogs: [res.auditLog, ...state.auditLogs.slice(0, 99)],
    }));

    if (!res.success) {
      get().addToast(
        'warning',
        'Audit Notice',
        `Operation succeeded, but audit record could not be written to SharePoint (${res.error || 'Check permissions'}).`
      );
    }

    return res.auditLog;
  },

  fetchAuditLogsFromSharePoint: async () => {
    const logs = await auditService.fetchAuditLogs();
    if (logs && logs.length > 0) {
      set({ auditLogs: logs });
    }
  },

  toasts: [],
  addToast: (type, title, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, type, title, message, timestamp: Date.now() };
    set((state) => ({ toasts: [newToast, ...state.toasts] }));

    setTimeout(() => {
      get().removeToast(id);
    }, 5000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

