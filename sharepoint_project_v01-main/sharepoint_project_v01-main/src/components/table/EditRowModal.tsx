import { useState, useEffect } from 'react';
import {
  X,
  Save,
  Pencil,
  AlertCircle,
  ExternalLink,
  User,
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  Tag,
  Database,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  SharePointColumnDefinition,
  SharePointListItem,
  SharePointFieldType,
  SharePointPersonValue,
  SharePointHyperlinkValue,
  SharePointAttachmentValue,
  SharePointLookupValue,
  SharePointTaxonomyValue,
} from '../../types/sharepoint';
import { detectSharePointFieldType } from './fieldRenderers';

interface EditRowModalProps {
  row: SharePointListItem | null;
  columns?: SharePointColumnDefinition[];
  visibleColumns?: SharePointColumnDefinition[];
  hiddenColumns?: SharePointColumnDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (rowId: string, updatedFields: Record<string, any>) => void;
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

// Preset image thumbnails for Image/Attachment replacement
const DEMO_IMAGE_PRESETS = [
  {
    name: 'Cloud Topology',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Enterprise Server Rack',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mobile Workstation',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Security Shield',
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

export function EditRowModal({
  row,
  columns,
  visibleColumns,
  hiddenColumns,
  isOpen,
  onClose,
  onSave,
}: EditRowModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTagInput, setNewTagInput] = useState('');
  const [showHiddenFields, setShowHiddenFields] = useState<boolean>(false);

  const effectiveVisibleCols = visibleColumns || columns || [];
  const effectiveHiddenCols = hiddenColumns || [];

  // Initialize form data from current row values across full schema
  useEffect(() => {
    if (row && isOpen) {
      const initial: Record<string, any> = {};
      const allCols = [...effectiveVisibleCols, ...effectiveHiddenCols];

      allCols.forEach((col) => {
        const key = col.uniqueKey || col.name;
        // Prioritize namespaced key then base name
        const val = row.fields[key] !== undefined ? row.fields[key] : row.fields[col.name];
        initial[key] = val !== undefined ? val : '';
        if (col.name !== key && row.fields[col.name] !== undefined && initial[col.name] === undefined) {
          initial[col.name] = row.fields[col.name];
        }
      });

      setFormData(initial);
      setErrors({});
      setShowHiddenFields(false);
    }
  }, [row, effectiveVisibleCols, effectiveHiddenCols, isOpen]);

  if (!isOpen || !row) return null;

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Basic client-side validation according to field type
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const allCols = [...effectiveVisibleCols, ...effectiveHiddenCols];

    allCols.forEach((col) => {
      const key = col.uniqueKey || col.name;
      const val = formData[key];
      const fieldType = detectSharePointFieldType(col);

      // Required validation (Title is always required)
      if ((col.required || col.name === 'Title') && (val === undefined || val === null || String(val).trim() === '')) {
        newErrors[key] = `${col.displayName || col.name} is required`;
        return;
      }

      // Numeric validation
      if ((fieldType === 'number' || fieldType === 'currency') && val !== '' && val !== null && val !== undefined) {
        if (isNaN(Number(val))) {
          newErrors[key] = 'Must be a valid number';
        }
      }

      // Hyperlink validation
      if (fieldType === 'hyperlink' && val) {
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

    // Start with all existing row fields so any untouched fields keep their stored values
    const updatedPayload: Record<string, any> = { ...row.fields, ...formData };
    const allCols = [...effectiveVisibleCols, ...effectiveHiddenCols];

    allCols.forEach((col) => {
      const uniqueKey = col.uniqueKey || col.name;
      const val = formData[uniqueKey];
      if (val !== undefined) {
        updatedPayload[uniqueKey] = val;
        if (col.name !== uniqueKey) {
          updatedPayload[col.name] = val;
        }
      }
    });

    onSave(row.id, updatedPayload);
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
            className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 outline-none transition-all ${
              error
                ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 ring-1 ring-rose-500/20'
                : 'border-neutral-300 dark:border-white/15 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
            }`}
          />
        );

      // 2. Multiline / Rich Text (note)
      case 'note':
        return (
          <div className="space-y-1">
            <textarea
              rows={col.text?.linesForEditing || 3}
              value={
                typeof value === 'string'
                  ? value.replace(/<[^>]+>/g, '') // Show clean text for quick editing
                  : ''
              }
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={`Enter multiline note for ${col.displayName || col.name}...`}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 outline-none transition-all resize-y ${
                error
                  ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 ring-1 ring-rose-500/20'
                  : 'border-neutral-300 dark:border-white/15 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
              }`}
            />
            <p className="text-[10px] text-neutral-400 dark:text-slate-500">Plain text / rich formatted note</p>
          </div>
        );

      // 3. Choice (single)
      case 'choice': {
        const choices = col.choice?.choices || ['Active', 'In Review', 'Completed', 'On Hold', 'Blocked'];
        return (
          <select
            value={value ?? ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer"
          >
            <option value="">— Select an option —</option>
            {choices.map((c) => (
              <option key={c} value={c} className="bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100">
                {c}
              </option>
            ))}
          </select>
        );
      }

      // 4. Choice (multi-select)
      case 'multichoice': {
        const available = col.choice?.choices || ['Cloud', 'Security', 'DevOps', 'Frontend', 'Compliance', 'AI/ML'];
        const selectedList: string[] = Array.isArray(value)
          ? value
          : typeof value === 'string'
          ? value.split(';#').filter(Boolean)
          : [];

        const toggleChoice = (choice: string) => {
          if (selectedList.includes(choice)) {
            handleFieldChange(
              key,
              selectedList.filter((c) => c !== choice)
            );
          } else {
            handleFieldChange(key, [...selectedList, choice]);
          }
        };

        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
              {available.map((choice) => {
                const isChecked = selectedList.includes(choice);
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => toggleChoice(choice)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white dark:bg-[#1a2436] text-neutral-600 dark:text-slate-300 border-neutral-300 dark:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                    <span>{choice}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-neutral-400 dark:text-slate-500">Click badges to toggle multi-choice values</p>
          </div>
        );
      }

      // 5. Person / Group (single or multi)
      case 'person':
      case 'multiperson': {
        const isMulti = fieldType === 'multiperson' || col.personOrGroup?.allowMultipleSelection;
        const currentPersons: SharePointPersonValue[] = Array.isArray(value)
          ? value
          : value
          ? [value]
          : [];

        return (
          <div className="space-y-2 p-2.5 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
            {/* Current Person(s) Preview */}
            <div className="flex flex-wrap gap-1.5">
              {currentPersons.length > 0 ? (
                currentPersons.map((p, pIdx) => (
                  <div
                    key={pIdx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#1a2436] border border-neutral-200 dark:border-white/15 rounded-lg text-xs"
                  >
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.displayName}
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-neutral-500 dark:text-slate-400" />
                    )}
                    <span className="font-medium text-neutral-800 dark:text-slate-200">{p.displayName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isMulti) {
                          handleFieldChange(
                            key,
                            currentPersons.filter((_, idx) => idx !== pIdx)
                          );
                        } else {
                          handleFieldChange(key, null);
                        }
                      }}
                      className="text-neutral-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 ml-1 p-0.5"
                      title="Remove person"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-xs text-neutral-400 dark:text-slate-500 italic">No person assigned</span>
              )}
            </div>

            {/* Quick Demo Pickers */}
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Quick Select Directory Member:
              </span>
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1">
                {DEMO_PERSONAS.map((persona) => (
                  <button
                    key={persona.email}
                    type="button"
                    onClick={() => {
                      if (isMulti) {
                        if (!currentPersons.some((p) => p.email === persona.email)) {
                          handleFieldChange(key, [...currentPersons, persona]);
                        }
                      } else {
                        handleFieldChange(key, persona);
                      }
                    }}
                    className="flex items-center gap-1.5 p-1 text-left rounded bg-white dark:bg-[#1a2436] hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-neutral-200/80 dark:border-white/10 transition-colors text-xs cursor-pointer"
                  >
                    {persona.avatarUrl ? (
                      <img
                        src={persona.avatarUrl}
                        alt={persona.displayName}
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500 flex-shrink-0" />
                    )}
                    <span className="truncate text-neutral-800 dark:text-slate-200 text-[11px]">
                      {persona.displayName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // 6. Date / DateTime
      case 'datetime': {
        const isDateTime = col.dateTime?.format === 'dateTime';
        let dateVal = '';
        if (value) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            dateVal = isDateTime
              ? d.toISOString().slice(0, 16)
              : d.toISOString().slice(0, 10);
          }
        }

        return (
          <div className="relative">
            <input
              type={isDateTime ? 'datetime-local' : 'date'}
              value={dateVal}
              onChange={(e) => {
                const entered = e.target.value;
                if (!entered) {
                  handleFieldChange(key, '');
                } else {
                  handleFieldChange(key, new Date(entered).toISOString());
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
            />
          </div>
        );
      }

      // 7. Number / Currency
      case 'number':
      case 'currency': {
        const symbol = col.currency?.currencySymbol || '$';
        const isPercentage = col.number?.displayAs === 'percentage';

        return (
          <div className="relative flex items-center">
            {fieldType === 'currency' && (
              <span className="absolute left-3 text-xs font-mono text-neutral-400 dark:text-slate-500">
                {symbol}
              </span>
            )}
            <input
              type="number"
              step="any"
              value={value ?? ''}
              onChange={(e) => handleFieldChange(key, e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className={`w-full text-xs rounded-lg border bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 outline-none transition-all ${
                fieldType === 'currency' ? 'pl-7 pr-3 py-2' : 'px-3 py-2'
              } ${
                error
                  ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 ring-1 ring-rose-500/20'
                  : 'border-neutral-300 dark:border-white/15 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
              }`}
            />
            {isPercentage && (
              <span className="absolute right-3 text-xs font-mono text-neutral-400 dark:text-slate-500">%</span>
            )}
          </div>
        );
      }

      // 8. Yes/No (boolean)
      case 'boolean': {
        const isChecked = Boolean(value);
        return (
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => handleFieldChange(key, !isChecked)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isChecked ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={isChecked}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  isChecked ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-neutral-700 dark:text-slate-300">
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
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 focus:border-blue-500 outline-none"
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
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 focus:border-blue-500 outline-none"
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

        return (
          <div className="space-y-2 p-2.5 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              {currentUrl ? (
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] flex-shrink-0">
                  <img
                    src={currentUrl}
                    alt="Thumbnail"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg border border-dashed border-neutral-300 dark:border-white/15 bg-neutral-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-neutral-400 dark:text-slate-500">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Replace with Demo Preset Asset:
                </span>
                <div className="flex flex-wrap gap-1">
                  {DEMO_IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        handleFieldChange(key, {
                          url: preset.url,
                          name: preset.name,
                          isImage: true,
                        })
                      }
                      className="px-2 py-0.5 rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-[11px] font-medium text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                  {currentUrl && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange(key, null)}
                      className="px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-[11px] font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // 11. Lookup
      case 'lookup':
      case 'multilookup': {
        const lookupText =
          typeof value === 'object' && value !== null
            ? (value as SharePointLookupValue).lookupValue
            : String(value || '');

        return (
          <div className="space-y-1">
            <select
              value={lookupText}
              onChange={(e) =>
                handleFieldChange(key, {
                  id: Math.floor(Math.random() * 1000) + 1,
                  lookupValue: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="">— Select lookup reference —</option>
              {DEMO_LOOKUP_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100">
                  {opt}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 dark:text-slate-500">Linked to target SharePoint list item</p>
          </div>
        );
      }

      // 12. Managed Metadata / Taxonomy
      case 'taxonomy': {
        const terms: string[] = Array.isArray(value)
          ? value.map((t) => (typeof t === 'object' ? t.label : String(t)))
          : value
          ? [typeof value === 'object' ? value.label : String(value)]
          : [];

        const addTag = (term: string) => {
          if (term && !terms.includes(term)) {
            handleFieldChange(key, {
              termGuid: `t-${Date.now()}`,
              label: term,
              path: term,
            });
          }
        };

        const removeTag = () => {
          handleFieldChange(key, null);
        };

        return (
          <div className="space-y-2 p-2.5 bg-neutral-50 dark:bg-[#0f172a] rounded-lg border border-neutral-200 dark:border-white/10">
            {/* Active Term Chip */}
            <div className="flex flex-wrap gap-1.5">
              {terms.length > 0 ? (
                terms.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/80"
                  >
                    <Tag className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={removeTag}
                      className="hover:text-rose-600 dark:hover:text-rose-400 ml-1 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-neutral-400 dark:text-slate-500 italic">No taxonomy classification set</span>
              )}
            </div>

            {/* Quick preset tags */}
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Select Enterprise Taxonomy:
              </span>
              <div className="flex flex-wrap gap-1">
                {DEMO_TAXONOMY_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="px-2 py-0.5 rounded border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-[11px] font-medium text-neutral-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/40 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    {tag.split('>').pop()?.trim() || tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-800 dark:text-slate-100 outline-none"
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#131d2e] rounded-xl shadow-2xl border border-neutral-200 dark:border-white/15 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-row-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-[#0f172a] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-lg">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-row-modal-title" className="text-sm font-bold text-neutral-900 dark:text-slate-100">
                Edit SharePoint Item
              </h3>
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                Editing fields for <span className="font-mono text-neutral-700 dark:text-slate-300">{row.id}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="edit-row-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-xs text-neutral-500 dark:text-slate-400 pb-1 border-b border-neutral-100 dark:border-white/10 flex items-center justify-between">
            <span>
              <strong>{effectiveVisibleCols.length}</strong> visible view columns
              {effectiveHiddenCols.length > 0 && ` • ${effectiveHiddenCols.length} hidden schema fields available`}
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-slate-500">Schema-driven validation</span>
          </div>

          {/* Section 1: Visible Columns (default view) */}
          <div className="space-y-4">
            {effectiveVisibleCols.map((col) => {
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
                        <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-white/10">
                          {col.sourceListName}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-neutral-400 dark:text-slate-500 uppercase">
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
          {effectiveHiddenCols.length > 0 && (
            <div className="pt-3 border-t border-neutral-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowHiddenFields((prev) => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 dark:bg-[#0f172a] hover:bg-neutral-100/80 dark:hover:bg-slate-800 border border-neutral-200 dark:border-white/10 rounded-xl transition-all text-left group cursor-pointer"
                title={showHiddenFields ? 'Collapse hidden schema fields' : 'Click to show additional schema fields'}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-[#1a2436] border border-neutral-200 dark:border-white/15 text-neutral-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-300 transition-colors">
                    {showHiddenFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>
                        {showHiddenFields ? 'Hide' : 'Show'} Additional Schema Fields ({effectiveHiddenCols.length})
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-neutral-200/70 dark:bg-white/10 text-neutral-600 dark:text-slate-300">
                        Not in current table view
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-slate-400">
                      {showHiddenFields
                        ? 'Click to collapse hidden schema columns'
                        : 'Click eye to reveal and edit pre-filled values for unselected list columns'}
                    </p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                  {showHiddenFields ? 'Collapse' : 'Expand'}
                </div>
              </button>

              {showHiddenFields && (
                <div className="mt-3 p-4 bg-neutral-50/50 dark:bg-[#0f172a]/50 rounded-xl border border-dashed border-neutral-300 dark:border-white/15 space-y-4 animate-in fade-in duration-150">
                  <div className="text-[11px] font-medium text-neutral-500 dark:text-slate-400 flex items-center gap-1.5 pb-2 border-b border-neutral-200/80 dark:border-white/10">
                    <Eye className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" />
                    <span>Full Schema Additional Fields (Pre-filled with stored item values)</span>
                  </div>

                  {effectiveHiddenCols.map((col) => {
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
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-white/10">
                                {col.sourceListName}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-neutral-400 dark:text-slate-500 uppercase">
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
            className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-white/20 text-xs font-medium text-neutral-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="btn-save-edit-row"
            type="submit"
            form="edit-row-form"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
