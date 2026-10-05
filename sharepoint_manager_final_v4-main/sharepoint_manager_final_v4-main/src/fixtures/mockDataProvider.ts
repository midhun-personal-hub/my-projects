import { DataProvider } from '../services/dataProvider';
import { PersonUser, SharePointColumnDefinition, SharePointListItem } from '../types';
import { MOCK_ITEMS, MOCK_SCHEMAS } from './mockData';

export class MockDataProvider implements DataProvider {
  async getListColumns(siteId: string, listId: string): Promise<SharePointColumnDefinition[]> {
    return MOCK_SCHEMAS[listId] || [
      { id: '1', name: 'Title', displayName: 'Title', type: 'Text', required: true },
      { id: '2', name: 'Description', displayName: 'Description', type: 'Note' },
      { id: '3', name: 'Status', displayName: 'Status', type: 'Choice', choices: ['Active', 'Pending', 'Closed'] },
      { id: '4', name: 'CreatedDate', displayName: 'Created Date', type: 'DateTime' },
    ];
  }

  async getListItems(
    siteId: string,
    listId: string,
    options?: { top?: number; skipToken?: string; filter?: string }
  ): Promise<{ items: SharePointListItem[]; nextLink?: string; totalItems: number }> {
    const top = options?.top ?? 10;
    const skipToken = options?.skipToken;
    const filter = options?.filter;

    let items = MOCK_ITEMS[listId] || [];

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      items = items.filter((item) =>
        Object.values(item.fields).some((val) =>
          String(val).toLowerCase().includes(lowerFilter)
        )
      );
    }

    const offset = skipToken ? parseInt(skipToken, 10) : 0;
    const paginated = items.slice(offset, offset + top);
    const nextOffset = offset + top;
    const nextLink = nextOffset < items.length ? String(nextOffset) : undefined;

    return {
      items: [...paginated],
      nextLink,
      totalItems: items.length,
    };
  }

  async getListItem(siteId: string, listId: string, itemId: string): Promise<SharePointListItem> {
    const items = MOCK_ITEMS[listId] || [];
    const found = items.find(i => String(i.id) === String(itemId));
    if (found) return found;
    return {
      id: itemId,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      fields: { Title: `Item #${itemId}` },
    };
  }

  async createListItem(siteId: string, listId: string, fields: Record<string, any>): Promise<SharePointListItem> {
    const newItem: SharePointListItem = {
      id: `item-${Date.now()}`,
      title: fields.Title || 'New Item',
      created: new Date().toISOString(),
      createdBy: { displayName: 'System', email: 'system@example.com' },
      modified: new Date().toISOString(),
      modifiedBy: { displayName: 'System', email: 'system@example.com' },
      fields: { ...fields },
      attachments: [],
    };
    return newItem;
  }

  async updateListItem(
    siteId: string,
    listId: string,
    itemId: string,
    fields: Record<string, any>
  ): Promise<SharePointListItem> {
    const existing = await this.getListItem(siteId, listId, itemId);
    return {
      ...existing,
      modified: new Date().toISOString(),
      fields: { ...existing.fields, ...fields },
    };
  }

  async deleteListItem(siteId: string, listId: string, itemId: string): Promise<boolean> {
    return true;
  }

  async getLookupOptions(
    siteId: string,
    listId: string,
    displayField: string = 'Title',
    query?: string
  ): Promise<{ id: string; value: string }[]> {
    let items = MOCK_ITEMS[listId] || [];
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      items = items.filter((i) => {
        const val = String(i.fields[displayField] || i.title || i.fields.Title || i.id);
        return val.toLowerCase().includes(q);
      });
    }
    return items.slice(0, 15).map((i) => ({
      id: String(i.id),
      value: String(i.fields[displayField] || i.title || i.fields.Title || i.id),
    }));
  }

  async searchUsers(query: string): Promise<PersonUser[]> {
    if (!query || query.trim().length < 2) return [];
    return [];
  }
}
