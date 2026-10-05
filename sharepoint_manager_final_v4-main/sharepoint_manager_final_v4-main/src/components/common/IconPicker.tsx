import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Search, ChevronDown, Check } from 'lucide-react';

export const POPULAR_LUCIDE_ICONS = [
  'FolderKanban',
  'Briefcase',
  'FileText',
  'ShoppingCart',
  'Users',
  'CheckSquare',
  'Wrench',
  'BarChart',
  'HardDrive',
  'Shield',
  'AlertTriangle',
  'Layers',
  'Database',
  'Calendar',
  'Settings',
  'Archive',
  'Box',
  'ClipboardList',
  'Tag',
  'FileSpreadsheet',
  'Building2',
  'Truck',
  'DollarSign',
  'Package',
  'UserCheck',
  'Key',
  'ListFilter',
  'LayoutGrid',
  'Award',
  'Bell',
  'Clock',
  'Globe',
  'HelpCircle',
  'Inbox',
  'Mail',
  'Phone',
  'Search',
  'Star',
  'Bookmark',
  'Lock',
  'Heart',
  'FileCheck',
  'Layers3',
  'Flame',
  'Navigation',
  'Server',
  'Cpu',
  'Activity',
  'Zap',
  'PieChart',
  'Sparkles',
  'Folder',
  'File',
  'Filter',
  'Sliders',
  'Gauge',
  'Terminal',
  'Compass',
  'Paperclip',
  'Image',
  'Workflow',
  'BadgeCheck',
  'TrendingUp',
  'Coins',
  'Receipt',
  'CreditCard',
  'Scale',
  'Megaphone',
  'UserPlus',
  'Boxes',
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
  className?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamically resolve current icon component
  const CurrentIconComponent = (Icons as any)[value] || Icons.HelpCircle;

  // Filter icons based on search
  const filteredIcons = POPULAR_LUCIDE_ICONS.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 shrink-0">
            <CurrentIconComponent className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold truncate">{value || 'Select Icon'}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in p-2 text-xs">
          {/* Search Bar Input */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search icons or custom name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-xs"
              autoFocus
            />
          </div>

          {/* Grid of Icons */}
          <div className="max-h-52 overflow-y-auto grid grid-cols-4 gap-1 p-1 custom-scrollbar">
            {filteredIcons.map((iconName) => {
              const IconComp = (Icons as any)[iconName] || Icons.Folder;
              const isSelected = value === iconName;

              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    onChange(iconName);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  title={iconName}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-500 text-brand-600 dark:text-brand-300 font-bold shadow-xs'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <IconComp className="w-4 h-4 mb-1 shrink-0" />
                  <span className="text-[10px] truncate max-w-full leading-tight font-medium">
                    {iconName}
                  </span>
                </button>
              );
            })}

            {filteredIcons.length === 0 && (
              <div className="col-span-4 p-3 text-center text-slate-400">
                <p className="text-[11px] mb-2">No matching standard icon found.</p>
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchTerm.trim());
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="px-3 py-1 bg-brand-600 text-white rounded-md text-[11px] font-bold hover:bg-brand-700 transition-colors"
                  >
                    Use "{searchTerm.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
