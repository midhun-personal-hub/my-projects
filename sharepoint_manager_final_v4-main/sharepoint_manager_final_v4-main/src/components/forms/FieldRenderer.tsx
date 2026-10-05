import React from 'react';
import {
  UseFormRegister,
  FieldErrors,
  Control,
  Controller,
} from 'react-hook-form';
import { ColumnConfig } from '../../types';
import { PeoplePicker } from './PeoplePicker';
import { LookupSelect } from './LookupSelect';
import {
  AlertCircle,
  HelpCircle,
  Check,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';

export interface FieldRendererProps {
  /** Metadata definition driving field controls and layout */
  column: ColumnConfig;
  /** React Hook Form register handler */
  register: UseFormRegister<any>;
  /** React Hook Form validation errors map */
  errors: FieldErrors<any>;
  /** React Hook Form control instance for custom controlled components */
  control: Control<any>;
  /** Optional override flag to disable input */
  disabled?: boolean;
}

/**
 * Staff-Architect Grade Dynamic FieldRenderer Dispatcher
 *
 * Translates abstract SharePoint Column Configuration schemas into Tailwind-styled React inputs.
 * Strictly avoids dangerous string evaluation (`eval()`) or `dangerouslySetInnerHTML` to prevent XSS/RCE vectors.
 */
export const FieldRenderer: React.FC<FieldRendererProps> = ({
  column,
  register,
  errors,
  control,
  disabled = false,
}) => {
  const isRequired = Boolean(column.required);
  const isDisabled = disabled || Boolean(column.readOnly);
  const fieldError = errors[column.key];
  const errorMessage = fieldError?.message ? String(fieldError.message) : null;
  const inputId = `field-${column.key}`;

  // Common border and focus ring classes based on error state
  const baseInputStyles = `w-full px-3.5 py-2 text-xs rounded-xl border transition-all ${
    errorMessage
      ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/40'
      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'
  } ${isDisabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`;

  return (
    <div className="space-y-1.5 w-full">
      {/* Field Label & Required Indicator */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1"
        >
          <span>{column.label}</span>
          {isRequired && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {column.description && (
          <span
            className="text-[10px] text-slate-400 flex items-center gap-1"
            title={column.description}
          >
            <HelpCircle className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[160px]">
              {column.description}
            </span>
          </span>
        )}
      </div>

      {/* Dynamic Field Type Dispatcher Switch */}
      {(() => {
        const fieldType = String(column.type || 'text').toLowerCase();
        switch (fieldType) {
          case 'number':
          case 'currency':
            return (
              <input
                id={inputId}
                type="number"
                step="any"
                disabled={isDisabled}
                placeholder={`Enter ${column.label.toLowerCase()}...`}
                {...register(column.key, { valueAsNumber: true })}
                className={baseInputStyles}
              />
            );

          case 'note':
          case 'multiline':
            return (
              <textarea
                id={inputId}
                rows={3}
                disabled={isDisabled}
                placeholder={`Enter ${column.label.toLowerCase()}...`}
                {...register(column.key)}
                className={`${baseInputStyles} resize-y min-h-[72px]`}
              />
            );

          case 'url':
            return (
              <input
                id={inputId}
                type="url"
                disabled={isDisabled}
                placeholder={`https://...`}
                {...register(column.key)}
                className={baseInputStyles}
              />
            );

          case 'choice':
            return (
              <select
                id={inputId}
                disabled={isDisabled}
                {...register(column.key)}
                className={`${baseInputStyles} cursor-pointer`}
              >
                <option value="">-- Select {column.label} --</option>
                {(column.choices || []).map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            );

          case 'multichoice':
            return (
              <Controller
                name={column.key}
                control={control}
                defaultValue={column.defaultValue || []}
                render={({ field }) => {
                  const selectedValues: string[] = Array.isArray(field.value)
                    ? field.value
                    : [];

                  const toggleChoice = (choice: string) => {
                    if (isDisabled) return;
                    const updated = selectedValues.includes(choice)
                      ? selectedValues.filter((v) => v !== choice)
                      : [...selectedValues, choice];
                    field.onChange(updated);
                  };

                  return (
                    <div
                      id={inputId}
                      className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 min-h-[42px]"
                    >
                      {(column.choices || []).map((choice) => {
                        const isSelected = selectedValues.includes(choice);
                        return (
                          <button
                            key={choice}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => toggleChoice(choice)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                              isSelected
                                ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{choice}</span>
                          </button>
                        );
                      })}
                      {(column.choices || []).length === 0 && (
                        <span className="text-xs text-slate-400 p-1">
                          No choice options configured
                        </span>
                      )}
                    </div>
                  );
                }}
              />
            );

          case 'date':
            return (
              <input
                id={inputId}
                type="date"
                disabled={isDisabled}
                {...register(column.key)}
                className={baseInputStyles}
              />
            );

          case 'datetime':
            return (
              <input
                id={inputId}
                type="datetime-local"
                disabled={isDisabled}
                {...register(column.key)}
                className={baseInputStyles}
              />
            );

          case 'boolean':
            return (
              <Controller
                name={column.key}
                control={control}
                defaultValue={Boolean(column.defaultValue ?? false)}
                render={({ field }) => (
                  <label
                    htmlFor={inputId}
                    className="inline-flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer w-full select-none"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={Boolean(field.value)}
                      disabled={isDisabled}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30 cursor-pointer accent-brand-600"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Enable {column.label}
                    </span>
                  </label>
                )}
              />
            );

          case 'person':
            return (
              <Controller
                name={column.key}
                control={control}
                defaultValue={column.defaultValue ?? null}
                render={({ field }) => (
                  <PeoplePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={`Search Entra ID users for ${column.label}...`}
                    disabled={isDisabled}
                    error={errorMessage ?? undefined}
                  />
                )}
              />
            );

          case 'lookup':
            return (
              <Controller
                name={column.key}
                control={control}
                defaultValue={column.defaultValue ?? null}
                render={({ field }) => (
                  <LookupSelect
                    targetListId={column.lookupListId || 'list-active-projects-id'}
                    lookupDisplayField={column.lookupColumnName || 'Title'}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={`Select ${column.label} from lookup list...`}
                    disabled={isDisabled}
                    error={errorMessage ?? undefined}
                  />
                )}
              />
            );

          case 'attachment':
          case 'image':
            return (
              <div className="relative">
                {column.type === 'image' ? (
                  <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                ) : (
                  <Paperclip className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                )}
                <input
                  id={inputId}
                  type="text"
                  disabled={isDisabled}
                  placeholder={`Enter URL or attachment file reference...`}
                  {...register(column.key)}
                  className={`${baseInputStyles} pl-9`}
                />
              </div>
            );

          case 'text':
          default:
            return (
              <input
                id={inputId}
                type="text"
                disabled={isDisabled}
                placeholder={`Enter ${column.label.toLowerCase()}...`}
                {...register(column.key)}
                className={baseInputStyles}
              />
            );
        }
      })()}

      {/* Validation Error Banner / Message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px] font-medium pt-0.5 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
