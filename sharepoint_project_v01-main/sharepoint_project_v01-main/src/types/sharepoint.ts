/**
 * Microsoft Graph SharePoint List and Column Definition Types
 * Standard schema representation matching Graph API /v1.0/sites/{siteId}/lists/{listId}
 */

export type SharePointFieldType =
  | 'text'
  | 'note'
  | 'choice'
  | 'multichoice'
  | 'person'
  | 'multiperson'
  | 'datetime'
  | 'number'
  | 'currency'
  | 'boolean'
  | 'hyperlink'
  | 'image'
  | 'attachment'
  | 'lookup'
  | 'multilookup'
  | 'taxonomy'
  | 'unknown';

export interface SharePointPersonValue {
  id?: string;
  displayName: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  initials?: string;
}

export interface SharePointHyperlinkValue {
  url: string;
  description?: string;
}

export interface SharePointAttachmentValue {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  size?: number;
  contentType?: string;
  isImage?: boolean;
}

export interface SharePointLookupValue {
  id: string | number;
  lookupValue: string;
  lookupId?: string | number;
}

export interface SharePointTaxonomyValue {
  termGuid: string;
  label: string;
  path?: string;
  wssId?: number;
}

export interface SharePointColumnDefinition {
  id: string;
  name: string; // internal name
  displayName: string;
  description?: string;
  hidden?: boolean;
  readOnly?: boolean;
  required?: boolean;

  // Source attribution when combining multiple SharePoint lists
  sourceId?: string;
  sourceSiteName?: string;
  sourceListName?: string;
  sourceBadgeColor?: string;
  uniqueKey?: string;

  // Graph API type descriptors
  text?: {
    allowMultipleLines?: boolean;
    appendChangesToExistingText?: boolean;
    linesForEditing?: number;
    maxLength?: number;
  };
  choice?: {
    allowMultipleValues?: boolean;
    choices?: string[];
    displayAs?: 'checkBoxes' | 'dropDownMenu';
  };
  personOrGroup?: {
    allowMultipleSelection?: boolean;
    chooseFromType?: string;
    displayAs?: string;
  };
  dateTime?: {
    displayAs?: string;
    format?: 'dateOnly' | 'dateTime';
  };
  number?: {
    decimalPlaces?: string;
    displayAs?: 'number' | 'percentage';
    maximum?: number;
    minimum?: number;
  };
  currency?: {
    locale?: string;
    currencySymbol?: string;
  };
  boolean?: Record<string, never>;
  hyperlinkOrPicture?: {
    isPicture?: boolean;
  };
  thumbnail?: Record<string, never>;
  attachment?: Record<string, never>;
  lookup?: {
    allowMultipleValues?: boolean;
    allowUnlimitedLength?: boolean;
    columnName?: string;
    listId?: string;
    primaryLookupColumnId?: string;
  };
  taxonomy?: {
    allowMultipleValues?: boolean;
    termStoreId?: string;
    sspId?: string;
  };
}

export interface SharePointListItem {
  id: string;
  eTag?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  createdBy?: { user?: SharePointPersonValue };
  lastModifiedBy?: { user?: SharePointPersonValue };
  fields: Record<string, any>;
}

export interface SharePointList {
  id: string;
  displayName: string;
  name: string;
  description?: string;
  webUrl?: string;
  columns: SharePointColumnDefinition[];
  items: SharePointListItem[];
}
