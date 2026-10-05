/**
 * Types for SharePoint Site and List Connections
 */

export interface SharePointSitePreset {
  id: string;
  name: string;
  url: string;
  shortCode: string;
  badgeColor: 'blue' | 'emerald' | 'purple' | 'amber' | 'cyan' | 'rose';
  description: string;
}

export interface SharePointSourceConfig {
  id: string; // Unique source config ID within the menu connection
  siteId: string;
  siteName: string;
  siteUrl: string;
  listId: string; // Target SharePoint list ID
  listName: string; // Target SharePoint list display name
  selectedColumnNames: string[]; // Fields selected from this SharePoint list
}

export interface SharePointListConnection {
  id: string;
  displayName: string;
  description?: string;
  icon: string; // Lucide icon name, e.g. 'FolderGit2', 'Server', 'Users', 'Layers'
  color: 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'purple' | 'cyan' | 'slate';
  sources: SharePointSourceConfig[]; // 1, 2, or more connected SharePoint lists!
  createdAt: string;
  updatedAt?: string;
  order: number;
}

export type ConnectionFormData = Omit<SharePointListConnection, 'id' | 'createdAt' | 'updatedAt' | 'order'>;

export interface Department {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  order: number;
  connections: SharePointListConnection[];
  activeConnectionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DepartmentFormData = Omit<
  Department,
  'id' | 'order' | 'connections' | 'activeConnectionId' | 'createdAt' | 'updatedAt'
>;

