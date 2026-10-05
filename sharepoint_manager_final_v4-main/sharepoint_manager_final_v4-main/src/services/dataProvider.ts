import { PersonUser, SharePointColumnDefinition, SharePointListItem } from '../types';

export interface DataQueryOptions {
  top?: number;
  skipToken?: string;
  filter?: string;
  searchTerm?: string;
  searchColumns?: string[];
  selectColumns?: string[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface DataProvider {
  getListColumns(siteId: string, listId: string): Promise<SharePointColumnDefinition[]>;
  getListItems(
    siteId: string,
    listId: string,
    options?: DataQueryOptions
  ): Promise<{ items: SharePointListItem[]; nextLink?: string; totalItems?: number; isTotalExact?: boolean }>;
  getListItem(siteId: string, listId: string, itemId: string): Promise<SharePointListItem>;
  createListItem(siteId: string, listId: string, fields: Record<string, any>): Promise<SharePointListItem>;
  updateListItem(siteId: string, listId: string, itemId: string, fields: Record<string, any>): Promise<SharePointListItem>;
  deleteListItem(siteId: string, listId: string, itemId: string): Promise<boolean>;
  getLookupOptions(siteId: string, listId: string, displayField?: string, query?: string): Promise<{ id: string; value: string }[]>;
  searchUsers(query: string): Promise<PersonUser[]>;
}
