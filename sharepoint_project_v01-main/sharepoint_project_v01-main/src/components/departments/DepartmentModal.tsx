import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useConnectionsStore } from '../../state/connectionsStore';
import type { DepartmentFormData } from '../../types/connections';

const PRESET_DEPARTMENT_IMAGES = [
  {
    title: 'Modern Architecture',
    category: 'Corporate / PMO',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
  },
  {
    title: 'Server Topology',
    category: 'IT / Infrastructure',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
  },
  {
    title: 'People & Teamwork',
    category: 'Human Resources',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
  },
  {
    title: 'Global Digital Network',
    category: 'Innovation / Governance',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
  },
  {
    title: 'Finance & Analytics',
    category: 'Accounting / Treasury',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
  },
  {
    title: 'Engineering & Lab',
    category: 'R&D / Product',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
  },
];

export function DepartmentModal() {
  const {
    departmentModalState,
    closeDepartmentModal,
    departments,
    addDepartment,
    updateDepartment,
  } = useConnectionsStore();

  const { isOpen, mode, departmentId } = departmentModalState;

  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: '',
    imageUrl: PRESET_DEPARTMENT_IMAGES[0].url,
  });

  const [imageTab, setImageTab] = useState<'presets' | 'url' | 'upload'>('presets');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && departmentId) {
        const existing = departments.find((d) => d.id === departmentId);
        if (existing) {
          setFormData({
            name: existing.name,
            description: existing.description,
            imageUrl: existing.imageUrl || PRESET_DEPARTMENT_IMAGES[0].url,
          });
          setImageTab('url');
        }
      } else {
        setFormData({
          name: '',
          description: '',
          imageUrl: PRESET_DEPARTMENT_IMAGES[0].url,
        });
        setImageTab('presets');
      }
      setErrors({});
      setImageLoadError(false);
    }
  }, [isOpen, mode, departmentId, departments]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    }
    if (!formData.imageUrl.trim()) {
      newErrors.imageUrl = 'Please provide an image thumbnail';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, imageUrl: 'Selected file must be an image' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
        setImageLoadError(false);
        setErrors((prev) => {
          const next = { ...prev };
          delete next.imageUrl;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (mode === 'create') {
      addDepartment(formData);
    } else if (mode === 'edit' && departmentId) {
      updateDepartment(departmentId, formData);
    }
  };

  return (
    <div
      id="department-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeDepartmentModal}
    >
      <div
        id="department-modal-content"
        className="bg-white dark:bg-[#131d2e] rounded-2xl shadow-2xl border border-neutral-200/90 dark:border-white/15 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/60">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-slate-100">
                {mode === 'create' ? 'Add Department Card' : 'Edit Department Card'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-slate-400">
                {mode === 'create'
                  ? 'Create a new departmental workspace with its own scoped SharePoint views'
                  : 'Update department details, thumbnail, and description'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDepartmentModal}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Department Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="dept-name-input"
              className="block text-xs font-semibold text-neutral-700 dark:text-slate-200"
            >
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="dept-name-input"
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }
              }}
              placeholder="e.g., PMO & Strategic Operations"
              className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 shadow-xs focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-200 focus:border-rose-400'
                  : 'border-neutral-300 dark:border-white/15 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500'
              }`}
            />
            {errors.name && (
              <p className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Department Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="dept-description-input"
              className="block text-xs font-semibold text-neutral-700 dark:text-slate-200"
            >
              Description
            </label>
            <textarea
              id="dept-description-input"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief summary of this department's functions and SharePoint lists..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Department Thumbnail Image */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-200">
                Thumbnail Image <span className="text-rose-500">*</span>
              </label>

              {/* Tab Selector */}
              <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-[#0f172a] rounded-lg text-[11px] font-medium text-neutral-600 dark:text-slate-400 border border-neutral-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setImageTab('presets')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    imageTab === 'presets' ? 'bg-white dark:bg-[#1a2436] text-blue-700 dark:text-blue-400 shadow-xs font-semibold' : 'hover:text-neutral-900 dark:hover:text-slate-200'
                  }`}
                >
                  Presets
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    imageTab === 'url' ? 'bg-white dark:bg-[#1a2436] text-blue-700 dark:text-blue-400 shadow-xs font-semibold' : 'hover:text-neutral-900 dark:hover:text-slate-200'
                  }`}
                >
                  Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    imageTab === 'upload' ? 'bg-white dark:bg-[#1a2436] text-blue-700 dark:text-blue-400 shadow-xs font-semibold' : 'hover:text-neutral-900 dark:hover:text-slate-200'
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>

            {/* Tab: Presets */}
            {imageTab === 'presets' && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {PRESET_DEPARTMENT_IMAGES.map((preset, idx) => {
                  const isSelected = formData.imageUrl === preset.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, imageUrl: preset.url }));
                        setImageLoadError(false);
                      }}
                      className={`relative group rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="h-16 w-full bg-neutral-100 dark:bg-slate-800 relative">
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-1.5 bg-white dark:bg-[#1a2436]">
                        <p className="text-[10px] font-semibold text-neutral-800 dark:text-slate-200 truncate">
                          {preset.title}
                        </p>
                        <p className="text-[9px] text-neutral-500 dark:text-slate-400 truncate">{preset.category}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab: Image URL */}
            {imageTab === 'url' && (
              <div className="space-y-1.5 pt-1">
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
                  <input
                    id="dept-image-url-input"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, imageUrl: e.target.value }));
                      setImageLoadError(false);
                    }}
                    placeholder="https://example.com/department-banner.jpg"
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#1a2436] text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Tab: Upload File */}
            {imageTab === 'upload' && (
              <div className="pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="dept-image-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-neutral-300 dark:border-white/15 hover:border-blue-400 dark:hover:border-blue-400 rounded-xl p-4 text-center bg-neutral-50/50 dark:bg-[#0f172a]/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer group"
                >
                  <Upload className="w-5 h-5 mx-auto text-neutral-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1.5" />
                  <p className="text-xs font-semibold text-neutral-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                    Click to browse an image file
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-slate-400 mt-0.5">PNG, JPG, WebP, or SVG</p>
                </button>
              </div>
            )}

            {/* Live Thumbnail Preview */}
            <div className="mt-2 flex items-center gap-3 p-2.5 bg-neutral-50 dark:bg-[#0f172a] rounded-xl border border-neutral-200/80 dark:border-white/10">
              <div className="w-16 h-12 rounded-lg bg-neutral-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0 border border-neutral-300/60 dark:border-white/10 shadow-xs">
                {formData.imageUrl && !imageLoadError ? (
                  <img
                    src={formData.imageUrl}
                    alt="Department thumbnail preview"
                    onError={() => setImageLoadError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-neutral-400 dark:text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-neutral-800 dark:text-slate-200 truncate">
                  {formData.name || 'Department Name Preview'}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-slate-400 truncate">
                  {formData.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer inside form */}
          <div className="pt-3 border-t border-neutral-200 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeDepartmentModal}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-white/20 text-xs font-medium text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-department"
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              {mode === 'create' ? 'Create Department' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
