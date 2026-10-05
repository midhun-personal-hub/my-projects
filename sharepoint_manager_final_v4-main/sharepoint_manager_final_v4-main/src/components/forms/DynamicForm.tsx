import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ListConfig } from '../../types';
import { generateZodSchema } from '../../utils/schemaGenerator';
import { FieldRenderer } from './FieldRenderer';
import {
  AlertTriangle,
  X,
  CheckCircle2,
  Loader2,
  Save,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';

export interface DynamicFormProps {
  /** Complete SharePoint List configuration contract */
  config: ListConfig;
  /** Initial record dataset mapping for Edit operations */
  initialData?: Record<string, any>;
  /** Async submission handler receiving validated form dataset */
  onSubmit: (data: any) => Promise<void>;
  /** Cancel button callback handler */
  onCancel: () => void;
  /** Loading state indicator provided by parent mutation */
  isSubmitting?: boolean;
  /** Custom submit button label text */
  submitLabel?: string;
  /** Custom node rendered on the left side of footer actions */
  customFooterLeft?: React.ReactNode;
  /** Hide top header bar if hosted inside parent container */
  hideHeader?: boolean;
}

/**
 * Enterprise DynamicForm Master Container
 *
 * Coordinates React Hook Form state, validates dynamic Zod schemas on the fly,
 * and renders a multi-column responsive grid layout of dynamic fields.
 */
export const DynamicForm: React.FC<DynamicFormProps> = ({
  config,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
  customFooterLeft,
  hideHeader = false,
}) => {
  // Global submission error state banner
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Dynamically generate Zod schema from current column configuration
  const validationSchema = generateZodSchema(config);

  // Construct default values object
  const defaultValues: Record<string, any> = {};
  config.columns.forEach((col) => {
    if (initialData && initialData[col.key] !== undefined) {
      defaultValues[col.key] = initialData[col.key];
    } else {
      defaultValues[col.key] = col.defaultValue ?? (col.type === 'multichoice' ? [] : '');
    }
  });

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting: formIsSubmitting },
  } = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues,
    mode: 'onTouched',
  });

  const loading = isSubmitting || formIsSubmitting;

  // Handle Form Submission wrapping async callbacks with error boundaries
  const handleFormSubmit = async (formData: any) => {
    try {
      setGlobalError(null);
      await onSubmit(formData);
    } catch (err: any) {
      const msg =
        err?.message ||
        'An unexpected error occurred while saving the item to SharePoint.';
      setGlobalError(msg);
    }
  };

  // Filter columns to display (visible columns that are not internal metadata keys)
  const formColumns = config.columns.filter((col) => col.visible !== false);

  const isEdit = Boolean(initialData && Object.keys(initialData).length > 0);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-colors">
      {/* Form Header */}
      {!hideHeader && (
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-brand-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isEdit ? `Edit Record` : `Create New Record`}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target SharePoint List: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{config.title}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Form Body */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
        {/* Global Exception / Validation Failure Error Banner */}
        {globalError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-100 text-xs flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-rose-800 dark:text-rose-200 mb-0.5">
                  Submission Failed
                </strong>
                <span>{globalError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              className="p-1 rounded-lg text-rose-400 hover:text-rose-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dynamic Fields Multi-Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {formColumns.map((col) => (
            <FieldRenderer
              key={col.key}
              column={col}
              register={register}
              errors={errors}
              control={control}
              disabled={loading}
            />
          ))}
        </div>

        {/* Form Action Buttons Footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            {customFooterLeft}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-60 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{submitLabel || (isEdit ? 'Update Record' : 'Save Record')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
