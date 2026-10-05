// ==============================================================================
// ENTERPRISE SHAREPOINT MANAGEMENT PLATFORM - CORE TYPE DEFINITIONS
// ==============================================================================
// Control Plane Schema, Dynamic DynamicForm & DataTable Engine Contracts,
// Role-Based Access Controls (RBAC), and SharePoint Integration Types.
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. FIELD TYPE ENUM & UNIONS
// ------------------------------------------------------------------------------

/**
 * Standardized field data types supported across generic UI engines
 * (DataTable, DynamicForm) and mapped directly to SharePoint List column types.
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'choice'
  | 'multichoice'
  | 'person'
  | 'lookup'
  | 'attachment'
  | 'image'
  | 'url'
  | 'note'
  | 'multiline';

/**
 * Legacy/Alternative Column Type Alias for SharePoint metadata representation
 */
export type ColumnType =
  | 'Text'
  | 'Note'
  | 'Choice'
  | 'MultiChoice'
  | 'Number'
  | 'Currency'
  | 'DateTime'
  | 'Boolean'
  | 'Person'
  | 'Lookup'
  | 'Attachment'
  | 'Image'
  | 'URL';

export interface PersonUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  email: string;
  Claims?: string;
}

// ------------------------------------------------------------------------------
// 2. COLUMN CONFIGURATION INTERFACE
// ------------------------------------------------------------------------------

/**
 * Defines the layout, behavior, and formatting properties for a single data column.
 */
export interface ColumnConfig {
  /** Unique key or internal name representing the field */
  key: string;
  /** Human-readable display label rendered in headers and form labels */
  label: string;
  /** Data field classification guiding editor controls and cell renderers */
  type: FieldType;
  /** Enables column header click sorting */
  sortable: boolean;
  /** Enables column filtering controls */
  filterable: boolean;
  /** Enables field inclusion in global/table search queries */
  searchable: boolean;
  /** Controls column visibility in data grids */
  visible: boolean;
  /** Fixed width in pixels (optional) */
  width?: number;
  /** Option list for 'choice' and 'multichoice' field types */
  choices?: string[];
  /** Specifies if field value is mandatory during creation/edit */
  required?: boolean;
  /** Specifies if field is read-only in forms */
  readOnly?: boolean;
  /** Target lookup list identifier when field type is 'lookup' */
  lookupListId?: string;
  /** Target lookup display column name */
  lookupColumnName?: string;
  /** Default value for new record creation */
  defaultValue?: unknown;
  /** Helpful hint text displayed under form inputs */
  description?: string;
}

/**
 * Legacy SharePoint Column Definition interface maintained for backward compatibility.
 */
export interface SharePointColumnDefinition {
  id: string;
  name: string; // Internal column name
  displayName: string; // User-facing label
  type: ColumnType | FieldType;
  required?: boolean;
  readOnly?: boolean;
  choices?: string[];
  lookupListId?: string;
  lookupColumnName?: string;
  defaultValue?: unknown;
  description?: string;
  hiddenInTable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

// ------------------------------------------------------------------------------
// 3. LIST CONFIGURATION & ACTIONS INTERFACE
// ------------------------------------------------------------------------------

/**
 * Action permissions matrix for CRUD table operations
 */
export interface ListActionsConfig {
  create: boolean;
  edit: boolean;
  delete: boolean;
  export?: boolean;
}

/**
 * Basic CRUD permissions interface for application roles
 */
export interface CrudPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
}

/**
 * Matrix mapping role names to their respective CRUD permissions
 */
export type RolePermissionMatrix = Record<string, CrudPermissions>;

/**
 * Complete configuration contract defining how a SharePoint List behaves
 * when registered inside the generic dynamic engine.
 */
export interface ListConfig {
  /** Unique identifier key for list configuration */
  key: string;
  /** Internal GUID or title of the target SharePoint List */
  sharePointList: string;
  /** User-friendly display title for the list interface */
  title: string;
  /** Ordered array of column definitions driving table and form layout */
  columns: ColumnConfig[];
  /** Allowed action capabilities for current list engine */
  actions: ListActionsConfig;
  /** Role-based permission matrix governing list access */
  permissions: RolePermissionMatrix;
  /** Target SharePoint Site GUID or URL */
  siteId?: string;
  /** Default column used for initial table sorting */
  defaultSortColumn?: string;
  /** Default sort order direction */
  defaultSortDirection?: 'asc' | 'desc';
  /** Page size limit for pagination */
  pageSize?: number;
}

// ------------------------------------------------------------------------------
// 4. CONTROL PLANE CONFIGURATIONS
// ------------------------------------------------------------------------------

/**
 * Top-level organizational container representing a department or functional area.
 */
export interface Workspace {
  /** Unique workspace identifier */
  WorkspaceId: string;
  /** Display name of the workspace (e.g., 'Human Resources', 'Inventory') */
  Name: string;
  /** Descriptive summary of workspace purpose */
  Description: string;
  /** Lucide icon identifier string */
  Icon: string;
  /** Numerical sorting order on dashboard grids */
  SortOrder: number;
  /** Toggle switch for workspace visibility */
  IsActive: boolean;
  /** Optional theme accent color */
  Color?: string;

  // CamelCase aliases for app compatibility
  id?: string;
  name?: string;
  description?: string;
  iconName?: string;
  displayOrder?: number;
  visible?: boolean;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Legacy Workspace Config maintaining compatibility with existing stores
 */
export interface WorkspaceConfig {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  displayOrder: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a menu item linked to a specific SharePoint List inside a Workspace folder.
 */
export interface Menu {
  /** Unique menu identifier */
  MenuId: string;
  /** Foreign key pointing to parent Workspace */
  WorkspaceId: string;
  /** Display label for navigation item */
  Name: string;
  /** Lucide icon identifier string */
  Icon: string;
  /** Navigation route path (e.g., '/projects/active') */
  Route: string;
  /** Type of view layout rendered ('grid' | 'kanban' | 'form' | 'dashboard') */
  PageType: string;
  /** Data source connector target (SharePoint site/list identifier) */
  DataSource: string;
  /** Numerical order inside sidebar navigation */
  SortOrder: number;
  /** Toggle switch for menu item visibility */
  IsActive: boolean;

  // CamelCase aliases for app compatibility
  id?: string;
  name?: string;
  workspaceId?: string;
  iconName?: string;
  displayOrder?: number;
  visible?: boolean;
}

/**
 * Detailed Menu Configuration interface for dynamic SharePoint bindings
 */
export interface MenuConfig {
  id: string;
  name: string;
  workspaceId: string;
  iconName: string;
  displayOrder: number;
  visible: boolean;
  sharePointSiteId: string;
  sharePointListId: string;
  sharePointListName: string;
  primaryColumn: string;
  descriptionColumn?: string;
  visibleColumns: string[];
  defaultSortColumn: string;
  defaultSortDirection: 'asc' | 'desc';
  searchColumns: string[];
  allowSearch: boolean;
  allowFilter: boolean;
  allowExport: boolean;
  allowFileUpload: boolean;
  permissions: Record<UserRole, CrudPermissions>;
  pageSize: number;
}

/**
 * Granular field control metadata for dynamically rendering input controls.
 */
export interface AppField {
  /** Unique field identifier */
  FieldId: string;
  /** Foreign key linking to parent Menu configuration */
  MenuId: string;
  /** SharePoint internal column name */
  InternalName: string;
  /** User-facing label text */
  DisplayName: string;
  /** Field classification type */
  FieldType: FieldType;
  /** Indicates if value must be supplied */
  Required: boolean;
  /** Indicates if field is displayed in grids */
  Visible: boolean;
  /** Indicates if field can be edited in forms */
  Editable: boolean;
}

/**
 * Role definition for RBAC engine
 */
export interface AppRole {
  /** Unique role identifier */
  RoleId: string;
  /** Human-readable role title ('Administrator' | 'Manager' | 'Employee') */
  RoleName: string;
  /** Role description and scope of access */
  Description?: string;
}

/**
 * Dynamic permission mapping linking a role to specific menu permissions
 */
export interface AppPermission {
  /** Unique permission record identifier */
  PermissionId: string;
  /** Foreign key linking to target Role */
  RoleId: string;
  /** Foreign key linking to target Menu */
  MenuId: string;
  /** Permission flags */
  CanRead: boolean;
  /** Permission flag for creation */
  CanCreate: boolean;
  /** Permission flag for modification */
  CanUpdate: boolean;
  /** Permission flag for deletion */
  CanDelete: boolean;
  /** Permission flag for exporting datasets */
  CanExport: boolean;
}

// ------------------------------------------------------------------------------
// 5. USER CONTEXT & SESSION MODELS
// ------------------------------------------------------------------------------

/** Supported standard application roles */
export type UserRole = 'Administrator' | 'Manager' | 'Employee';

/**
 * Logged-in user context model carrying active security principals,
 * assigned roles, and granular menu permissions.
 */
export interface AppUser {
  /** Unique Entra ID user principal identifier (OID) */
  UserId: string;
  /** User display name */
  DisplayName: string;
  /** Primary user email address */
  Email: string;
  /** User Principal Name (UPN) */
  UserPrincipalName: string;
  /** Assigned active application role */
  Role: UserRole;
  /** Job title from Microsoft Graph profile */
  JobTitle?: string;
  /** Department name from Microsoft Graph profile */
  Department?: string;
  /** Avatar or profile picture URL */
  AvatarUrl?: string;
  /** Active permission capabilities matrix indexed by Menu ID */
  ActivePermissions?: Record<string, CrudPermissions>;
}

/**
 * Legacy User Profile alias for backwards compatibility
 */
export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  userPrincipalName: string;
  role: UserRole;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
}

// ------------------------------------------------------------------------------
// 6. SHAREPOINT ITEM & DATA PAYLOAD MODELS
// ------------------------------------------------------------------------------

/**
 * SharePoint Attachment Metadata
 */
export interface SharePointAttachment {
  id: string;
  fileName: string;
  url: string;
  size?: number;
}

/**
 * Strongly typed generic wrapper for a single SharePoint List record item.
 */
export interface SharePointListItem<TFields = Record<string, unknown>> {
  id: string;
  title?: string;
  created?: string;
  createdBy?: {
    displayName: string;
    email: string;
  };
  modified?: string;
  modifiedBy?: {
    displayName: string;
    email: string;
  };
  attachments?: SharePointAttachment[];
  fields: TFields;
}

// ------------------------------------------------------------------------------
// 7. SYSTEM AUDIT & UTILITY MODELS
// ------------------------------------------------------------------------------

/**
 * Audit log entry for tracking system actions and administrative changes
 */
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'CONFIG_CHANGE' | 'BULK_CREATE' | 'BULK_UPDATE' | 'BULK_DELETE';
  workspaceId?: string;
  workspaceName?: string;
  menuId?: string;
  menuName?: string;
  listId?: string;
  itemId?: string;
  result?: 'SUCCESS' | 'FAILED';
  errorCode?: string;
  correlationId?: string;
  itemCount?: number;
  successCount?: number;
  failureCount?: number;
  changedFields?: string;
  details: string;
  auditPersisted?: boolean;
}

/**
 * Toast notification object
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}
