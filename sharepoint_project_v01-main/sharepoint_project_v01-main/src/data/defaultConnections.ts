import type { SharePointListConnection, SharePointSitePreset, Department } from '../types/connections';
import { DEMO_SHAREPOINT_LISTS } from './demoSharePointLists';

export const SHAREPOINT_SITE_PRESETS: SharePointSitePreset[] = [
  {
    id: 'site-pmo',
    name: 'PMO & Enterprise Strategy',
    url: 'https://contoso.sharepoint.com/sites/PMO',
    shortCode: 'PMO',
    badgeColor: 'blue',
    description: 'Portfolio governance, strategic investments, and executive roadmaps',
  },
  {
    id: 'site-itops',
    name: 'IT Operations & Infrastructure',
    url: 'https://contoso.sharepoint.com/sites/ITOperations',
    shortCode: 'IT Ops',
    badgeColor: 'emerald',
    description: 'Corporate hardware asset lifecycle, procurement, and site topology',
  },
  {
    id: 'site-people',
    name: 'People & Talent Operations',
    url: 'https://contoso.sharepoint.com/sites/PeopleOps',
    shortCode: 'HR Talent',
    badgeColor: 'purple',
    description: 'Global candidate onboarding, background verification, and equipment provisioning',
  },
  {
    id: 'site-innovation',
    name: 'Digital Innovation Labs',
    url: 'https://contoso.sharepoint.com/sites/InnovationLabs',
    shortCode: 'Labs',
    badgeColor: 'cyan',
    description: 'Experimental AI prototypes, research sandbox, and patent filings',
  },
];

export const DEFAULT_CONNECTIONS: SharePointListConnection[] = [
  {
    id: 'conn-multi-pmo-it',
    displayName: 'Executive 360: Projects & IT Fleet',
    description: 'Connected 2 SharePoint lists: PMO governance and IT hardware inventory side-by-side',
    icon: 'Layers',
    color: 'blue',
    sources: [
      {
        id: 'src-pmo-1',
        siteId: 'site-pmo',
        siteName: 'PMO & Enterprise Strategy',
        siteUrl: 'https://contoso.sharepoint.com/sites/PMO',
        listId: 'list-project-portfolio',
        listName: 'Project Portfolio & Governance',
        selectedColumnNames: [
          'Title',
          'ArchitectureDiagram',
          'ProjectStatus',
          'RAGStatus',
          'ExecutiveSponsor',
          'ProjectBudget',
          'SpendToDate',
        ],
      },
      {
        id: 'src-it-1',
        siteId: 'site-itops',
        siteName: 'IT Operations & Infrastructure',
        siteUrl: 'https://contoso.sharepoint.com/sites/ITOperations',
        listId: 'list-it-assets',
        listName: 'IT Hardware & Asset Inventory',
        selectedColumnNames: [
          'DevicePhoto',
          'AssetTag',
          'DeviceModel',
          'Category',
          'AssignedTechnician',
          'PurchaseCost',
          'OperationalStatus',
        ],
      },
    ],
    createdAt: '2025-01-15T08:00:00.000Z',
    order: 0,
  },
  {
    id: 'conn-multi-projects-hr',
    displayName: 'Project Teams & Talent Onboarding',
    description: 'Connected 2 SharePoint lists: PMO delivery leads paired with HR talent pipeline',
    icon: 'Users',
    color: 'purple',
    sources: [
      {
        id: 'src-pmo-2',
        siteId: 'site-pmo',
        siteName: 'PMO & Enterprise Strategy',
        siteUrl: 'https://contoso.sharepoint.com/sites/PMO',
        listId: 'list-project-portfolio',
        listName: 'Project Portfolio & Governance',
        selectedColumnNames: [
          'Title',
          'ProjectStatus',
          'ProjectLead',
          'TargetCompletionDate',
          'ProjectBudget',
        ],
      },
      {
        id: 'src-hr-1',
        siteId: 'site-people',
        siteName: 'People & Talent Operations',
        siteUrl: 'https://contoso.sharepoint.com/sites/PeopleOps',
        listId: 'list-employee-onboarding',
        listName: 'Global HR Onboarding & Compliance',
        selectedColumnNames: [
          'EmployeeName',
          'RoleTitle',
          'DepartmentTaxonomy',
          'HiringManager',
          'StartDate',
          'OnboardingStage',
          'WorkLocation',
        ],
      },
    ],
    createdAt: '2025-01-16T10:30:00.000Z',
    order: 1,
  },
  {
    id: 'conn-multi-tri-source',
    displayName: 'Tri-Source Operations Master Matrix',
    description: 'Connected 3 SharePoint lists: PMO governance, IT equipment, and HR staffing in one table',
    icon: 'Database',
    color: 'indigo',
    sources: [
      {
        id: 'src-pmo-3',
        siteId: 'site-pmo',
        siteName: 'PMO & Enterprise Strategy',
        siteUrl: 'https://contoso.sharepoint.com/sites/PMO',
        listId: 'list-project-portfolio',
        listName: 'Project Portfolio & Governance',
        selectedColumnNames: ['Title', 'RAGStatus', 'ProjectBudget', 'ExecutiveSponsor'],
      },
      {
        id: 'src-it-2',
        siteId: 'site-itops',
        siteName: 'IT Operations & Infrastructure',
        siteUrl: 'https://contoso.sharepoint.com/sites/ITOperations',
        listId: 'list-it-assets',
        listName: 'IT Hardware & Asset Inventory',
        selectedColumnNames: ['AssetTag', 'DeviceModel', 'PurchaseCost', 'OperationalStatus'],
      },
      {
        id: 'src-hr-2',
        siteId: 'site-people',
        siteName: 'People & Talent Operations',
        siteUrl: 'https://contoso.sharepoint.com/sites/PeopleOps',
        listId: 'list-employee-onboarding',
        listName: 'Global HR Onboarding & Compliance',
        selectedColumnNames: ['EmployeeName', 'RoleTitle', 'WorkLocation'],
      },
    ],
    createdAt: '2025-01-17T11:00:00.000Z',
    order: 2,
  },
  {
    id: 'conn-pmo-full',
    displayName: 'PMO Portfolio (Single List • 22 Fields)',
    description: 'Comprehensive view of all 22 project governance fields',
    icon: 'ShieldCheck',
    color: 'cyan',
    sources: [
      {
        id: 'src-pmo-single',
        siteId: 'site-pmo',
        siteName: 'PMO & Enterprise Strategy',
        siteUrl: 'https://contoso.sharepoint.com/sites/PMO',
        listId: 'list-project-portfolio',
        listName: 'Project Portfolio & Governance',
        selectedColumnNames: DEMO_SHAREPOINT_LISTS[0].columns.map((c) => c.name),
      },
    ],
    createdAt: '2025-01-18T14:15:00.000Z',
    order: 3,
  },
  {
    id: 'conn-it-hardware',
    displayName: 'IT Fleet Inventory (Single List)',
    description: 'Complete corporate hardware tracking catalog',
    icon: 'Server',
    color: 'emerald',
    sources: [
      {
        id: 'src-it-single',
        siteId: 'site-itops',
        siteName: 'IT Operations & Infrastructure',
        siteUrl: 'https://contoso.sharepoint.com/sites/ITOperations',
        listId: 'list-it-assets',
        listName: 'IT Hardware & Asset Inventory',
        selectedColumnNames: DEMO_SHAREPOINT_LISTS[1].columns.map((c) => c.name),
      },
    ],
    createdAt: '2025-01-19T09:00:00.000Z',
    order: 4,
  },
  {
    id: 'conn-people-pipeline',
    displayName: 'Global HR Onboarding (Single List)',
    description: 'Candidate verification and stage workflow pipeline',
    icon: 'Briefcase',
    color: 'amber',
    sources: [
      {
        id: 'src-people-single',
        siteId: 'site-people',
        siteName: 'People & Talent Operations',
        siteUrl: 'https://contoso.sharepoint.com/sites/PeopleOps',
        listId: 'list-employee-onboarding',
        listName: 'Global HR Onboarding & Compliance',
        selectedColumnNames: DEMO_SHAREPOINT_LISTS[2].columns.map((c) => c.name),
      },
    ],
    createdAt: '2025-01-20T16:45:00.000Z',
    order: 5,
  },
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'dept-pmo',
    name: 'PMO & Strategic Operations',
    description: 'Enterprise project portfolio governance, investment milestones, deliverables, and executive roadmaps.',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    order: 0,
    activeConnectionId: DEFAULT_CONNECTIONS[0].id,
    connections: [
      DEFAULT_CONNECTIONS[0], // Executive 360
      DEFAULT_CONNECTIONS[1], // Project Teams & Talent
      DEFAULT_CONNECTIONS[3], // PMO Portfolio Single List
    ],
    createdAt: '2025-01-15T08:00:00.000Z',
  },
  {
    id: 'dept-itops',
    name: 'IT Operations & Infrastructure',
    description: 'Corporate hardware fleet lifecycle, datacenter assets, procurement warranties, and technician dispatches.',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    order: 1,
    activeConnectionId: DEFAULT_CONNECTIONS[4].id,
    connections: [
      DEFAULT_CONNECTIONS[4], // IT Fleet Inventory
      DEFAULT_CONNECTIONS[0], // Executive 360: Projects & IT Fleet
    ],
    createdAt: '2025-01-16T09:00:00.000Z',
  },
  {
    id: 'dept-people',
    name: 'People & Talent Operations',
    description: 'Global candidate onboarding, background verification, compliance auditing, and hardware provisioning readiness.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    order: 2,
    activeConnectionId: DEFAULT_CONNECTIONS[5].id,
    connections: [
      DEFAULT_CONNECTIONS[5], // Global HR Onboarding
      DEFAULT_CONNECTIONS[1], // Project Teams & Talent Onboarding
    ],
    createdAt: '2025-01-17T10:00:00.000Z',
  },
  {
    id: 'dept-governance',
    name: 'Digital Innovation & Governance',
    description: 'Cross-functional multi-matrix uniting PMO milestones, IT assets, and human capital in one consolidated dashboard.',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    order: 3,
    activeConnectionId: DEFAULT_CONNECTIONS[2].id,
    connections: [
      DEFAULT_CONNECTIONS[2], // Tri-Source Operations Master Matrix
    ],
    createdAt: '2025-01-18T11:00:00.000Z',
  },
];

