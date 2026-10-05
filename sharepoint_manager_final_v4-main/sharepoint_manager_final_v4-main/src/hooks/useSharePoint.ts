import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphService } from '../services/graphService';
import { SharePointColumnDefinition, SharePointListItem } from '../types';

export interface SharePointListQueryParams {
  siteId?: string;
  listId?: string;
  top?: number;
  skipToken?: string;
  filter?: string;
  searchTerm?: string;
  searchColumns?: string[];
  selectColumns?: string[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  enabled?: boolean;
}

/**
 * Reusable Query Hook for SharePoint List Items with Full Server-Side Querying
 */
export function useSharePointList({
  siteId,
  listId,
  top = 10,
  skipToken,
  filter,
  searchTerm,
  searchColumns,
  selectColumns,
  sortColumn,
  sortDirection = 'asc',
  enabled = true,
}: SharePointListQueryParams) {
  return useQuery({
    queryKey: [
      'sharepoint-list',
      siteId,
      listId,
      top,
      skipToken,
      filter,
      searchTerm,
      searchColumns,
      selectColumns,
      sortColumn,
      sortDirection,
    ],
    queryFn: async () => {
      if (!siteId || !listId) {
        return { items: [], nextLink: undefined, totalItems: 0 };
      }
      return graphService.getListItems(siteId, listId, {
        top,
        skipToken,
        filter,
        searchTerm,
        searchColumns,
        selectColumns,
        sortColumn,
        sortDirection,
      });
    },
    enabled: Boolean(enabled && siteId && listId),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Reusable Query Hook for SharePoint List Metadata / Columns
 */
export function useSharePointListMetadata(siteId?: string, listId?: string, enabled = true) {
  return useQuery({
    queryKey: ['sharepoint-columns', siteId, listId],
    queryFn: async () => {
      if (!siteId || !listId) return [];
      return graphService.getListColumns(siteId, listId);
    },
    enabled: Boolean(enabled && siteId && listId),
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Reusable Query Hook for Single SharePoint Item
 */
export function useSharePointItem(siteId?: string, listId?: string, itemId?: string, enabled = true) {
  return useQuery({
    queryKey: ['sharepoint-item', siteId, listId, itemId],
    queryFn: async () => {
      if (!siteId || !listId || !itemId) return null;
      return graphService.getListItem(siteId, listId, itemId);
    },
    enabled: Boolean(enabled && siteId && listId && itemId),
  });
}

/**
 * Reusable Query Hook for Lookup Column Options
 */
export function useLookupOptions(
  siteId?: string,
  listId?: string,
  displayField = 'Title',
  query?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['sharepoint-lookup-options', siteId, listId, displayField, query],
    queryFn: async () => {
      if (!siteId || !listId) return [];
      return graphService.getLookupOptions(siteId, listId, displayField, query);
    },
    enabled: Boolean(enabled && siteId && listId),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Reusable Mutation Hook for SharePoint List Item Operations
 */
export function useSharePointMutations(siteId?: string, listId?: string) {
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      if (!siteId || !listId) throw new Error('Site ID and List ID required');
      return graphService.createListItem(siteId, listId, fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, listId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      queryClient.invalidateQueries({ queryKey: ['listItems', listId] });
      queryClient.invalidateQueries({ queryKey: ['listData', listId] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, fields }: { itemId: string; fields: Record<string, any> }) => {
      if (!siteId || !listId) throw new Error('Site ID and List ID required');
      return graphService.updateListItem(siteId, listId, itemId, fields);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, listId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-item', siteId, listId, variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['singleListItem', listId, variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['listItems', listId] });
      queryClient.invalidateQueries({ queryKey: ['listData', listId] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!siteId || !listId) throw new Error('Site ID and List ID required');
      return graphService.deleteListItem(siteId, listId, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list', siteId, listId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-list'] });
      queryClient.invalidateQueries({ queryKey: ['listItems', listId] });
      queryClient.invalidateQueries({ queryKey: ['listData', listId] });
    },
  });

  return { createItem, updateItem, deleteItem };
}
