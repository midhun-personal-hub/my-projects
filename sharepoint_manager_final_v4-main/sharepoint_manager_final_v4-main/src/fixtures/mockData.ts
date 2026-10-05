import { SharePointColumnDefinition, SharePointListItem } from '../types';

export const MOCK_SCHEMAS: Record<string, SharePointColumnDefinition[]> = {
  'list-active-projects-id': [
    { id: '1', name: 'Title', displayName: 'Project Name', type: 'Text', required: true },
    { id: '2', name: 'ProjectImage', displayName: 'Project Photo', type: 'Image', required: false },
    { id: '3', name: 'ProjectManager', displayName: 'Project Manager', type: 'Person', required: true },
    { id: '4', name: 'Status', displayName: 'Status', type: 'Choice', choices: ['Planning', 'In Progress', 'On Hold', 'Under Review'], required: true },
    { id: '5', name: 'Priority', displayName: 'Priority', type: 'Choice', choices: ['Low', 'Medium', 'High', 'Critical'], required: true },
    { id: '6', name: 'Budget', displayName: 'Budget ($)', type: 'Currency', required: true },
    { id: '7', name: 'StartDate', displayName: 'Start Date', type: 'DateTime', required: true },
    { id: '8', name: 'CompletionPercentage', displayName: 'Progress (%)', type: 'Number', required: false },
    { id: '9', name: 'Department', displayName: 'Department', type: 'Choice', choices: ['Cloud Infrastructure', 'Digital Workplace', 'Supply Chain', 'Security Ops', 'Data Analytics'], required: false },
    { id: '10', name: 'RiskLevel', displayName: 'Risk Level', type: 'Choice', choices: ['Low Risk', 'Moderate Risk', 'High Risk'], required: false },
    { id: '11', name: 'ExpectedEndDate', displayName: 'Target End Date', type: 'DateTime', required: false },
    { id: '12', name: 'TotalHoursLogged', displayName: 'Logged Hours', type: 'Number', required: false },
    { id: '13', name: 'CostCenter', displayName: 'Cost Center', type: 'Text', required: false },
    { id: '14', name: 'LeadArchitect', displayName: 'Lead Architect', type: 'Person', required: false },
    { id: '15', name: 'Region', displayName: 'Region', type: 'Choice', choices: ['North America', 'EMEA', 'APAC', 'LATAM'], required: false },
    { id: '16', name: 'SecurityCompliance', displayName: 'Compliance', type: 'Choice', choices: ['ISO27001', 'SOC2 Type II', 'HIPAA', 'FedRAMP'], required: false },
    { id: '17', name: 'BillingStatus', displayName: 'Billing State', type: 'Choice', choices: ['Invoiced', 'Milestone Based', 'Time & Materials', 'Prepaid'], required: false },
    { id: '18', name: 'ClientApproved', displayName: 'Client Approved', type: 'Boolean', required: false },
    { id: '19', name: 'ProjectDocURL', displayName: 'Spec Document', type: 'Text', required: false },
    { id: '20', name: 'Description', displayName: 'Scope & Details', type: 'Note', required: false },
  ],
};

export const MOCK_ITEMS: Record<string, SharePointListItem[]> = {
  'list-active-projects-id': [
    {
      id: 'item-101',
      title: 'Test Project Item',
      created: '2026-01-15T10:30:00Z',
      createdBy: { displayName: 'Test User', email: 'test@example.com' },
      modified: '2026-02-01T14:20:00Z',
      modifiedBy: { displayName: 'Test User', email: 'test@example.com' },
      fields: {
        Title: 'Test Project Item',
        Status: 'In Progress',
        Priority: 'High',
      },
      attachments: [],
    },
  ],
};
