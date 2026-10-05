import { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  AlertCircle,
  ExternalLink,
  User,
  Trash2,
  Image as ImageIcon,
  Check,
  Tag,
  Database,
  Calendar,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import type {
  SharePointColumnDefinition,
  SharePointFieldType,
  SharePointPersonValue,
  SharePointHyperlinkValue,
  SharePointAttachmentValue,
  SharePointLookupValue,
  SharePointTaxonomyValue,
} from '../../types/sharepoint';
import { detectSharePointFieldType } from './fieldRenderers';

interface NewRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleColumns: SharePointColumnDefinition[];
  hiddenColumns: SharePointColumnDefinition[];
  listTitle?: string;
  onSave: (newFields: Record<string, any>) => void;
}

// Preset demo users for Person/Group picker
const DEMO_PERSONAS: SharePointPersonValue[] = [
  {
    displayName: 'Elena Rostova',
    email: 'elena.rostova@contoso.com',
    jobTitle: 'Principal Cloud Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    displayName: 'Marcus Vance',
    email: 'marcus.v@contoso.com',
    jobTitle: 'Enterprise Program Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    displayName: 'Sarah Jenkins',
    email: 'sarah.j@contoso.com',
    jobTitle: 'Chief Information Security Officer',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    displayName: 'David Chen',
    email: 'david.c@contoso.com',
    jobTitle: 'Senior DevOps Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    displayName: 'Alex Wilber',
    email: 'alex.w@contoso.com',
    jobTitle: 'Hardware Fleet Administrator',
  },
  {
    displayName: 'Megan Bowen',
    email: 'megan.b@contoso.com',
    jobTitle: 'Procurement Specialist',
  },
];

// Preset image thumbnails for Image/Attachment fields
const DEMO_IMAGE_PRESETS = [
  {
    name: 'Cloud Architecture Topology',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Enterprise Hardware Rack',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Workstation Laptop Setup',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cybersecurity Shield Gateway',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
  },
];

// Preset lookup options
const DEMO_LOOKUP_OPTIONS = [
  'Global Infrastructure & Cloud',
  'CC-9042 Cloud Ops',
  'CC-1020 Enterprise Security',
  'Information Security & SecOps',
  'Hardware Fleet Management',
  'Corporate Finance & Governance',
  'Tier-1 North America',
  'Frankfurt Data Center',
];

// Preset taxonomy tags
const DEMO_TAXONOMY_TAGS = [
  'Infrastructure > Cloud Transformation',
  'Security > Zero-Trust',
  'Operations > Asset Fleet',
  'Compliance > SOC2',
  'Data Platform > Analytics',
];

export function NewRowModal({
  isOpen,
  onClose,
  visibleColumns,
  hiddenColumns,
  listTitle,
  onSave,
}: NewRowModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showHiddenFields, setShowHiddenFields] = useState<boolean>(false);

  // Initialize empty state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      const allCols = [...visibleColumns, ...hiddenColumns];

      allCols.forEach((col) => {
        const key = col.uniqueKey || col.name;
        const type = detectSharePointFieldType(col);

        switch (type) {
          case 'choice':
            initial[key] = col.choice?.choices?.[0] || '';
            break;
          case 'multichoice':
            initial[key] = [];
            break;
          case 'boolean':
            initial[key] = false;
            break;
          case 'person':
          case 'multiperson':
            initial[key] = type === 'multiperson' ? [] : DEMO_PERSONAS[0];
            break;
          case 'datetime':
            initial[key] = new Date().toISOString().split('T')[0];
            break;
          case 'hyperlink':
            initial[key] = { url: '', description: '' };
            break;
          case 'image':
          case 'attachment':
            initial[key] = { url: DEMO_IMAGE_PRESETS[0].url, name: DEMO_IMAGE_PRESETS[0].name };
            break;
          case 'lookup':
          case 'multilookup':
            initial[key] = type === 'multilookup' ? [] : DEMO_LOOKUP_OPTIONS[0];
            break;
          case 'taxonomy':
            initial[key] = [];
            break;
          default:
            initial[key] = '';
            break;
        }

        // Also duplicate on un-prefixed name
        if (col.name !== key && initial[col.name] === undefined) {
          initial[col.name] = initial[key];
        }
      });

      setFormData(initial);
      setErrors({});
      setShowHiddenFields(false);
    }
  }, [isOpen, visibleColumns, hiddenColumns]);

  if (!isOpen) return null;

  const handleFieldChange = (key: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: val,
    }));
    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const allCols = [...visibleColumns, ...hiddenColumns];

    allCols.forEach((col) => {
      const key = col.uniqueKey || col.name;
      const val = formData[key];
      const type = detectSharePointFieldType(col);

      // 1. Required check (Title is always required)
      if ((col.required || col.name === 'Title') && (val === undefined || val === null || String(val).trim() === '')) {
        newErrors[key] = `${col.displayName || col.name} is required`;
      }

      // 2. Numeric / Currency check
      if ((type === 'number' || type === 'currency') && val !== '' && val !== null && val !== undefined) {
        if (isNaN(Number(val))) {
          newErrors[key] = 'Please enter a valid numeric value';
        }
      }

      // 3. Hyperlink URL check
      if (type === 'hyperlink' && val) {
        const url = typeof val === 'object' ? val.url : String(val);
        if (url && !/^https?:\/\//i.test(url)) {
          newErrors[key] = 'URL must start with http:// or https://';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Build payload including both uniqueKey and original field names
    const allCols = [...visibleColumns, ...hiddenColumns];
    const finalPayload: Record<string, any> = { ...formData };

    allCols.forEach((col) => {
      const uniqueKey = col.uniqueKey || col.name;
      const val = formData[uniqueKey];
      finalPayload[uniqueKey] = val;
      if (col.name !== uniqueKey) {
        finalPayload[col.name] = val;
      }
    });

    // Ensure Title exists
    if (!finalPayload.Title) {
      finalPayload.Title = formData.Title || formData.name || 'New Item';
    }

    onSave(finalPayload);
    onClose();
  };

  const renderFieldInput = (col: SharePointColumnDefinition) => {
    const key = col.uniqueKey || col.name;
    const value = formData[key];
    const fieldType = detectSharePointFieldType(col);
    const error = errors[key];

    switch (fieldType) {
      // 1. Text (single line)
      case 'text':
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            maxLength={col.text?.maxLength || 255}
            placeholder={`Enter ${col.displayName || col.name}...`}
            className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 outline-none transition-all ${
              error
                ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 ring-1 ring-rose-500/20'
                : 'border-neutral-300 dark:border-white/15 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
            }`}
          />
        );

      // 2. Note / Rich text (multi-line)
      case 'note':
        return (
          <textarea
            value={value ?? ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            rows={3}
            placeholder={`Enter detailed description for ${col.displayName || col.name}...`}
            className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 outline-none transition-all resize-y ${
              error
                ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 ring-1 ring-rose-500/20'
                : 'border-neutral-300 dark:border-white/15 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
            }`}
          />
        );

      // 3. Choice (Single)
      case 'choice': {
        const choices = col.choice?.choices || ['Default', 'Active', 'Pending'];
        return (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {choices.map((choice) => {
              const isSelected = value === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleFieldChange(key, choice)}
                  className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white dark:bg-[#1a2436] text-neutral-700 dark:text-slate-200 border-neutral-300 dark:border-white/15 hover:bg-neutral-50 dark:hover:bg-white/5'
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        );
      }

      // 4. Multi-Choice
      case 'multichoice': {
        const choices = col.choice?.choices || ['Cloud', 'Security', 'DevOps', 'Frontend', 'Compliance'];
        const selectedArr: string[] = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {choices.map((choice) => {
              const isSelected = selectedArr.includes(choice);
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? selectedArr.filter((c) => c !== choice)
                      : [...selectedArr, choice];
                    handleFieldChange(key, next);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 ring-1 ring-blue-400/20'
                      : 'bg-white dark:bg-[#1a2436] text-neutral-600 dark:text-slate-300 border-neutral-300 dark:border-white/15 hover:bg-neutral-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-xs border flex items-center justify-center text-[9px] ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-neutral-400 dark:border-slate-500 bg-white dark:bg-[#1a2436]'
                    }`}
                  >
                    {isSelected && '✓'}
                  </span>
                  <span>{choice}</span>
                </button>
              );
            })}
          </div>
        );
      }

      // 5. Person / Group
      case 'person':
      case 'multiperson': {
        const isMulti = fieldType === 'multiperson';
        const currentPersons: SharePointPersonValue[] = isMulti
          ? Array.isArray(value)
            ? value
            : []
          : value
          ? [value]
          : [];

        return (
          <div className="space-y-2">
            {/* Selected persons */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
              {currentPersons.length === 0 ? (
                <span className="text-xs text-neutral-400 dark:text-slate-500 italic py-0.5 px-1">
                  No person assigned
                </span>
              ) : (
                currentPersons.map((p, idx) => (
                  <div
                    key={p.email || idx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-[#1a2436] border border-neutral-200 dark:border-white/10 shadow-2xs text-xs text-neutral-800 dark:text-slate-100"
                  >
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.displayName}
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[9px] font-bold">
                        {p.displayName.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium truncate max-w-[120px]">{p.displayName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isMulti) {
                          handleFieldChange(
                            key,
                            currentPersons.filter((_, i) => i !== idx)
                          );
                        } else {
                          handleFieldChange(key, null);
                        }
                      }}
                      className="text-neutral-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Persona picker selector */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] text-neutral-400 dark:text-slate-500 uppercase font-semibold flex-shrink-0 mr-1">
                Assign:
              </span>
              {DEMO_PERSONAS.map((person) => {
                const isSelected = currentPersons.some((p) => p.email === person.email);
                return (
                  <button
                    key={person.email}
                    type="button"
                    onClick={() => {
                      if (isMulti) {
                        if (!isSelected) {
                          handleFieldChange(key, [...currentPersons, person]);
                        }
                      } else {
                        handleFieldChange(key, person);
                      }
                    }}
                    disabled={isSelected}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] whitespace-nowrap transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-neutral-100 dark:bg-white/5 text-neutral-400 dark:text-slate-500 border-neutral-200 dark:border-white/10 opacity-60 cursor-not-allowed'
                        : 'bg-white dark:bg-[#1a2436] text-neutral-700 dark:text-slate-200 border-neutral-300 dark:border-white/15 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'
                    }`}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{person.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // 6. DateTime
      case 'datetime': {
        const dateVal = value ? String(value).split('T')[0] : '';
        return (
          <div className="relative">
            <input
              type="date"
              value={dateVal}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 outline-none transition-all ${
                error
                  ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500'
                  : 'border-neutral-300 dark:border-white/15 focus:border-blue-500'
              }`}
            />
          </div>
        );
      }

      // 7. Number / Currency
      case 'number':
      case 'currency': {
        const isPercent = col.number?.displayAs === 'percentage';
        const isCurr = fieldType === 'currency';
        return (
          <div className="relative">
            {isCurr && (
              <span className="absolute left-3 top-2.5 text-xs text-neutral-400 dark:text-slate-500 font-semibold select-none">
                {col.currency?.currencySymbol || '$'}
              </span>
            )}
            <input
              type="number"
              step={col.number?.decimalPlaces === '0' ? '1' : 'any'}
              value={value ?? ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={isCurr ? '0.00' : isPercent ? 'e.g. 75' : 'Enter number...'}
              className={`w-full py-2 text-xs rounded-lg border bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                isCurr ? 'pl-7 pr-3' : isPercent ? 'pl-3 pr-7' : 'px-3'
              } ${
                error
                  ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 ring-1 ring-rose-500/20'
                  : 'border-neutral-300 dark:border-white/15 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
              }`}
            />
            {isPercent && (
              <span className="absolute right-3 top-2.5 text-xs text-neutral-400 dark:text-slate-500 font-semibold select-none">
                %
              </span>
            )}
          </div>
        );
      }

      // 8. Boolean (Yes/No toggle)
      case 'boolean': {
        const isChecked = Boolean(value);
        return (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleFieldChange(key, !isChecked)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isChecked ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  isChecked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-neutral-700 dark:text-slate-200">
              {isChecked ? 'Yes (True)' : 'No (False)'}
            </span>
          </div>
        );
      }

      // 9. Hyperlink
      case 'hyperlink': {
        const linkObj: SharePointHyperlinkValue =
          typeof value === 'object' && value !== null
            ? value
            : { url: String(value || ''), description: '' };

        return (
          <div className="space-y-2 p-2.5 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                Target URL
              </label>
              <input
                type="url"
                value={linkObj.url || ''}
                onChange={(e) =>
                  handleFieldChange(key, { ...linkObj, url: e.target.value })
                }
                placeholder="https://contoso.sharepoint.com/..."
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                Display Text / Description
              </label>
              <input
                type="text"
                value={linkObj.description || ''}
                onChange={(e) =>
                  handleFieldChange(key, { ...linkObj, description: e.target.value })
                }
                placeholder="Link Title"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        );
      }

      // 10. Image / Attachment
      case 'image':
      case 'attachment': {
        const currentUrl =
          typeof value === 'string'
            ? value
            : value?.url || value?.[0]?.url || '';
        const currentName =
          typeof value === 'object'
            ? value?.name || value?.[0]?.name || 'Item Asset'
            : 'Item Asset';

        return (
          <div className="space-y-2 p-2.5 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              {currentUrl ? (
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] flex-shrink-0 shadow-2xs">
                  <img
                    src={currentUrl}
                    alt={currentName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg border border-dashed border-neutral-300 dark:border-white/15 flex items-center justify-center bg-white dark:bg-[#1a2436] flex-shrink-0 text-neutral-400 dark:text-slate-500">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <input
                  type="url"
                  value={currentUrl}
                  onChange={(e) =>
                    handleFieldChange(key, { url: e.target.value, name: currentName })
                  }
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) =>
                    handleFieldChange(key, { url: currentUrl, name: e.target.value })
                  }
                  placeholder="Asset label / file name..."
                  className="w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-1">
              <span className="text-[10px] text-neutral-400 dark:text-slate-500 uppercase font-semibold block mb-1">
                Sample Image Presets:
              </span>
              <div className="flex flex-wrap gap-1">
                {DEMO_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      handleFieldChange(key, { url: preset.url, name: preset.name })
                    }
                    className="px-2 py-0.5 rounded border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a2436] text-[10px] text-neutral-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // 11. Lookup
      case 'lookup':
      case 'multilookup': {
        return (
          <div className="relative">
            <select
              value={value ?? ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 focus:border-blue-500 outline-none"
            >
              <option value="">-- Select related entity --</option>
              {DEMO_LOOKUP_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      }

      // 12. Taxonomy (Managed Metadata)
      case 'taxonomy': {
        const selectedTax: string[] = Array.isArray(value)
          ? value.map((v) => (typeof v === 'string' ? v : v.name || ''))
          : [];

        return (
          <div className="space-y-1.5 p-2 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
            <div className="flex flex-wrap gap-1">
              {DEMO_TAXONOMY_TAGS.map((tag) => {
                const isSelected = selectedTax.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const next = isSelected
                        ? selectedTax.filter((t) => t !== tag)
                        : [...selectedTax, tag];
                      handleFieldChange(key, next);
                    }}
                    className={`px-2 py-0.5 rounded-full text-[11px] border font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-[#1a2436] text-neutral-700 dark:text-slate-200 border-neutral-300 dark:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // Default fallback
      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:border-blue-500 outline-none"
            placeholder="Enter value..."
          />
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-row-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#131d2e] rounded-2xl shadow-2xl border border-neutral-200/90 dark:border-white/10 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-neutral-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-[#0f172a]/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 id="new-row-modal-title" className="text-sm font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
                <span>New Item</span>
                {listTitle && (
                  <span className="text-xs font-normal text-neutral-500 dark:text-slate-400">
                    in <strong>{listTitle}</strong>
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                Enter values to create a new row in this SharePoint list
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="new-row-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-xs text-neutral-500 dark:text-slate-400 pb-1 border-b border-neutral-100 dark:border-white/10 flex items-center justify-between">
            <span>
              <strong>{visibleColumns.length}</strong> visible view columns
              {hiddenColumns.length > 0 && ` • ${hiddenColumns.length} hidden schema fields available`}
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-slate-400">Schema-driven validation</span>
          </div>

          {/* Section 1: Visible / Selected View Columns */}
          <div className="space-y-4">
            {visibleColumns.map((col) => {
              const key = col.uniqueKey || col.name;
              const fieldType = detectSharePointFieldType(col);
              const error = errors[key];

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{col.displayName || col.name}</span>
                      {(col.required || col.name === 'Title') && (
                        <span className="text-rose-500" title="Required field">*</span>
                      )}
                    </label>
                    <div className="flex items-center gap-1.5">
                      {col.sourceListName && (
                        <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-white/10">
                          {col.sourceListName}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-neutral-400 dark:text-slate-400 uppercase">
                        {fieldType}
                      </span>
                    </div>
                  </div>

                  {renderFieldInput(col)}

                  {error && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 2: Hidden Schema Fields (revealed via Eye toggle) */}
          {hiddenColumns.length > 0 && (
            <div className="pt-3 border-t border-neutral-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowHiddenFields((prev) => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 dark:bg-[#0f172a] hover:bg-neutral-100/80 dark:hover:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-[#1a2436] border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-300 transition-colors">
                    {showHiddenFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>
                        {showHiddenFields ? 'Hide' : 'Show'} Additional Schema Fields ({hiddenColumns.length})
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-neutral-200/70 dark:bg-white/10 text-neutral-600 dark:text-slate-300">
                        Not in current table view
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-slate-400">
                      {showHiddenFields
                        ? 'Click to collapse hidden schema columns'
                        : 'Click eye to reveal and enter data for unselected list columns'}
                    </p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                  {showHiddenFields ? 'Collapse' : 'Expand'}
                </div>
              </button>

              {showHiddenFields && (
                <div className="mt-3 p-4 bg-neutral-50/50 dark:bg-[#0b1120]/60 rounded-xl border border-dashed border-neutral-300 dark:border-white/15 space-y-4 animate-in fade-in duration-150">
                  <div className="text-[11px] font-medium text-neutral-500 dark:text-slate-400 flex items-center gap-1.5 pb-2 border-b border-neutral-200/80 dark:border-white/10">
                    <Eye className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" />
                    <span>Full Schema Additional Fields (Saved with row data)</span>
                  </div>

                  {hiddenColumns.map((col) => {
                    const key = col.uniqueKey || col.name;
                    const fieldType = detectSharePointFieldType(col);
                    const error = errors[key];

                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-neutral-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{col.displayName || col.name}</span>
                            {col.required && (
                              <span className="text-rose-500" title="Required field">*</span>
                            )}
                          </label>
                          <div className="flex items-center gap-1.5">
                            {col.sourceListName && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-white/10">
                                {col.sourceListName}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-neutral-400 dark:text-slate-400 uppercase">
                              {fieldType}
                            </span>
                          </div>
                        </div>

                        {renderFieldInput(col)}

                        {error && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-50 dark:bg-[#0f172a] border-t border-neutral-200 dark:border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-white/15 text-xs font-medium text-neutral-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="btn-save-new-row"
            type="submit"
            form="new-row-form"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
