import type { ComponentType } from 'react';
import {
  FolderGit2,
  Server,
  Users,
  Layers,
  ShieldCheck,
  Database,
  Laptop,
  CheckSquare,
  FileSpreadsheet,
  Briefcase,
  Calendar,
  Boxes,
  Cpu,
  Globe,
  Activity,
  FileText,
  BarChart3,
  Bookmark,
  Sparkles,
  Share2,
  Table,
} from 'lucide-react';

export const AVAILABLE_ICONS: Record<string, { label: string; component: ComponentType<{ className?: string }> }> = {
  Layers: { label: 'Layers & Views', component: Layers },
  ShieldCheck: { label: 'Governance & Security', component: ShieldCheck },
  FolderGit2: { label: 'Repository & PMO', component: FolderGit2 },
  Server: { label: 'Server & Infra', component: Server },
  Laptop: { label: 'Hardware & Workstation', component: Laptop },
  Users: { label: 'People & HR', component: Users },
  Database: { label: 'Database & Records', component: Database },
  FileSpreadsheet: { label: 'Spreadsheet & Financials', component: FileSpreadsheet },
  CheckSquare: { label: 'Tasks & Checklist', component: CheckSquare },
  BarChart3: { label: 'Analytics & KPIs', component: BarChart3 },
  Briefcase: { label: 'Operations & Business', component: Briefcase },
  Calendar: { label: 'Milestones & Dates', component: Calendar },
  Boxes: { label: 'Inventory & Assets', component: Boxes },
  Globe: { label: 'Global Portal', component: Globe },
  Cpu: { label: 'Architecture & Compute', component: Cpu },
  Activity: { label: 'Health & Diagnostics', component: Activity },
  FileText: { label: 'Documentation', component: FileText },
  Sparkles: { label: 'Innovation & AI', component: Sparkles },
  Share2: { label: 'SharePoint Site', component: Share2 },
  Table: { label: 'Standard Table', component: Table },
  Bookmark: { label: 'Favorite List', component: Bookmark },
};

export const COLOR_VARIANTS = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    activeBg: 'bg-blue-600',
    activeText: 'text-white',
    ring: 'ring-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
    ring: 'ring-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    activeBg: 'bg-indigo-600',
    activeText: 'text-white',
    ring: 'ring-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    activeBg: 'bg-amber-600',
    activeText: 'text-white',
    ring: 'ring-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    activeBg: 'bg-rose-600',
    activeText: 'text-white',
    ring: 'ring-rose-500',
    badge: 'bg-rose-100 text-rose-700',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    activeBg: 'bg-purple-600',
    activeText: 'text-white',
    ring: 'ring-purple-500',
    badge: 'bg-purple-100 text-purple-700',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    activeBg: 'bg-cyan-600',
    activeText: 'text-white',
    ring: 'ring-cyan-500',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  slate: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    activeBg: 'bg-slate-700',
    activeText: 'text-white',
    ring: 'ring-slate-500',
    badge: 'bg-slate-200 text-slate-700',
  },
} as const;

export type ConnectionColor = keyof typeof COLOR_VARIANTS;

interface SharePointIconProps {
  name: string;
  className?: string;
  color?: ConnectionColor;
  isActive?: boolean;
}

export function SharePointIcon({
  name,
  className = 'w-4 h-4',
  color = 'blue',
  isActive = false,
}: SharePointIconProps) {
  const IconConfig = AVAILABLE_ICONS[name] || AVAILABLE_ICONS.Layers;
  const Component = IconConfig.component;
  const colorDef = COLOR_VARIANTS[color] || COLOR_VARIANTS.blue;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg transition-colors p-1.5 flex-shrink-0 ${
        isActive
          ? `${colorDef.activeBg} ${colorDef.activeText} shadow-xs`
          : `${colorDef.bg} ${colorDef.text} ${colorDef.border} border`
      }`}
    >
      <Component className={className} />
    </div>
  );
}
