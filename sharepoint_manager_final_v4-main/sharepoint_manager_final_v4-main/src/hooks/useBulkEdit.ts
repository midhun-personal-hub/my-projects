import { useState, useCallback, useMemo } from 'react';

export interface BulkEditState {
  /** Array of selected record IDs being edited in sequence */
  selectedRowIds: string[];
  /** Zero-based index of the current active record */
  currentIndex: number;
  /** Maps [rowId] -> modified/submitted form values */
  modifiedRows: Record<string, Record<string, any>>;
  /** Maps [rowId] -> original fetched record fields */
  originalRows: Record<string, Record<string, any>>;
}

export interface BulkResultReport {
  rowId: string;
  itemTitle: string;
  success: boolean;
  message: string;
  fieldsUpdatedCount?: number;
}

/**
 * Utility function to perform delta check comparing updated form values against original row fields.
 * Returns an object containing ONLY dirty/modified fields.
 */
export function computeDelta(
  original: Record<string, any> = {},
  updated: Record<string, any> = {}
): Record<string, any> {
  const delta: Record<string, any> = {};

  for (const key of Object.keys(updated)) {
    // Ignore internal read-only keys
    if (key === 'id' || key === 'ID' || key === 'created' || key === 'modified') {
      continue;
    }

    const newVal = updated[key];
    const origVal = original[key];

    // Check if field is dirty
    const isDifferent = (() => {
      if (newVal === origVal) return false;
      if (
        (newVal === null || newVal === undefined || newVal === '') &&
        (origVal === null || origVal === undefined || origVal === '')
      ) {
        return false;
      }
      if (typeof newVal === 'object' || typeof origVal === 'object') {
        return JSON.stringify(newVal) !== JSON.stringify(origVal);
      }
      return String(newVal) !== String(origVal);
    })();

    if (isDifferent) {
      delta[key] = newVal;
    }
  }

  return delta;
}

/**
 * Custom React State Hook for managing sequential bulk edits client-side
 * without premature Microsoft Graph API writes.
 */
export function useBulkEdit(initialSelectedItems: Record<string, any>[] = []) {
  const initialOriginalRows = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    initialSelectedItems.forEach((item) => {
      const id = String(item.id ?? item.ID);
      map[id] = item;
    });
    return map;
  }, [initialSelectedItems]);

  const initialRowIds = useMemo(() => {
    return initialSelectedItems.map((item) => String(item.id ?? item.ID));
  }, [initialSelectedItems]);

  const [state, setState] = useState<BulkEditState>({
    selectedRowIds: initialRowIds,
    currentIndex: 0,
    modifiedRows: {},
    originalRows: initialOriginalRows,
  });

  const [executionReports, setExecutionReports] = useState<BulkResultReport[] | null>(null);

  /** Initialize hook with selected items */
  const initializeItems = useCallback((items: Record<string, any>[]) => {
    const ids = items.map((item) => String(item.id ?? item.ID));
    const origMap: Record<string, Record<string, any>> = {};
    items.forEach((item) => {
      const id = String(item.id ?? item.ID);
      origMap[id] = item;
    });

    setState({
      selectedRowIds: ids,
      currentIndex: 0,
      modifiedRows: {},
      originalRows: origMap,
    });
    setExecutionReports(null);
  }, []);

  const currentRowId = state.selectedRowIds[state.currentIndex] || null;
  const currentOriginalData = currentRowId ? state.originalRows[currentRowId] || {} : {};
  const currentModifiedData = currentRowId ? state.modifiedRows[currentRowId] || {} : {};

  /** Merged form dataset for current item */
  const currentFormData = useMemo(() => {
    return {
      ...currentOriginalData,
      ...currentModifiedData,
    };
  }, [currentOriginalData, currentModifiedData]);

  /** Save current form values into local state for current row */
  const updateRowLocalState = useCallback((rowId: string, formValues: Record<string, any>) => {
    setState((prev) => ({
      ...prev,
      modifiedRows: {
        ...prev.modifiedRows,
        [rowId]: formValues,
      },
    }));
  }, []);

  /** Save current item values and advance to next record */
  const nextItem = useCallback((currentFormValues?: Record<string, any>) => {
    setState((prev) => {
      const currentId = prev.selectedRowIds[prev.currentIndex];
      const updatedModified = currentFormValues && currentId
        ? { ...prev.modifiedRows, [currentId]: currentFormValues }
        : prev.modifiedRows;

      const nextIdx = Math.min(prev.currentIndex + 1, prev.selectedRowIds.length - 1);
      return {
        ...prev,
        modifiedRows: updatedModified,
        currentIndex: nextIdx,
      };
    });
  }, []);

  /** Save current item values and move to previous record */
  const prevItem = useCallback((currentFormValues?: Record<string, any>) => {
    setState((prev) => {
      const currentId = prev.selectedRowIds[prev.currentIndex];
      const updatedModified = currentFormValues && currentId
        ? { ...prev.modifiedRows, [currentId]: currentFormValues }
        : prev.modifiedRows;

      const prevIdx = Math.max(prev.currentIndex - 1, 0);
      return {
        ...prev,
        modifiedRows: updatedModified,
        currentIndex: prevIdx,
      };
    });
  }, []);

  /** Jump directly to a target item index */
  const jumpToItem = useCallback((targetIndex: number, currentFormValues?: Record<string, any>) => {
    setState((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.selectedRowIds.length) return prev;
      const currentId = prev.selectedRowIds[prev.currentIndex];
      const updatedModified = currentFormValues && currentId
        ? { ...prev.modifiedRows, [currentId]: currentFormValues }
        : prev.modifiedRows;

      return {
        ...prev,
        modifiedRows: updatedModified,
        currentIndex: targetIndex,
      };
    });
  }, []);

  /** Compute dirty fields delta map across all selected records */
  const getAllDeltas = useCallback(() => {
    const deltas: Record<string, Record<string, any>> = {};
    state.selectedRowIds.forEach((id) => {
      const orig = state.originalRows[id] || {};
      const mod = state.modifiedRows[id];
      if (mod) {
        const d = computeDelta(orig, mod);
        if (Object.keys(d).length > 0) {
          deltas[id] = d;
        }
      }
    });
    return deltas;
  }, [state.selectedRowIds, state.originalRows, state.modifiedRows]);

  /** Reset all hook state */
  const reset = useCallback(() => {
    setState({
      selectedRowIds: [],
      currentIndex: 0,
      modifiedRows: {},
      originalRows: {},
    });
    setExecutionReports(null);
  }, []);

  return {
    state,
    currentRowId,
    currentIndex: state.currentIndex,
    totalCount: state.selectedRowIds.length,
    isFirstItem: state.currentIndex === 0,
    isLastItem: state.currentIndex === state.selectedRowIds.length - 1,
    currentOriginalData,
    currentModifiedData,
    currentFormData,
    executionReports,
    setExecutionReports,
    initializeItems,
    updateRowLocalState,
    nextItem,
    prevItem,
    jumpToItem,
    getAllDeltas,
    reset,
  };
}
