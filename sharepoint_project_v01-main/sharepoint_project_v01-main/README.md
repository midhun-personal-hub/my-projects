# sharepoint-management-platform

A Vite + React + TypeScript Single Page Application (SPA) for managing SharePoint resources, lists, items, schemas, and permissions.

## Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **Authentication**: `@azure/msal-browser`, `@azure/msal-react`
- **API Client**: `@microsoft/microsoft-graph-client`
- **State Management**: `zustand`
- **Data Fetching & Caching**: `@tanstack/react-query`
- **Data Table**: `@tanstack/react-table`
- **Validation**: `zod`
- **Routing**: `react-router-dom`
- **Styling**: Tailwind CSS, Lucide React

## Project Structure

```text
src/
├── auth/
│   ├── msalConfig.ts
│   └── useAuth.ts
├── api/
│   ├── graphClient.ts
│   ├── lists.ts
│   ├── items.ts
│   ├── schema.ts
│   └── permissions.ts
├── features/
│   ├── lists/
│   │   ├── ListBrowser.tsx
│   │   └── ListDetail.tsx
│   ├── items/
│   │   ├── ItemGrid.tsx
│   │   └── ItemForm.tsx
│   ├── schema-editor/
│   │   ├── ColumnEditor.tsx
│   │   └── ViewEditor.tsx
│   └── permissions/
│       └── PermissionsPanel.tsx
├── state/
│   ├── listsStore.ts
│   └── uiStore.ts
├── components/
│   ├── DataGrid.tsx
│   ├── Modal.tsx
│   └── FormField.tsx
├── utils/
│   ├── formatters.ts
│   └── graphHelpers.ts
├── router/
│   └── AppRouter.tsx
├── App.tsx
└── main.tsx
```

## Getting Started

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure your Azure Entra ID / Microsoft 365 app registration details in `.env`.
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
