import React from 'react';
import { useForm } from 'react-hook-form';
import { SharePointColumnDefinition } from '../../types';
import { Upload, X, Calendar, UserCheck, DollarSign, Hash, CheckSquare } from 'lucide-react';

interface DynamicFormProps {
  columns: SharePointColumnDefinition[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  columns,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  // Helper to check if column is date/datetime
  const isDateCol = (type: string) => {
    const t = String(type).toLowerCase();
    return t === 'datetime' || t === 'date';
  };

  // Format DateTime/Date columns into YYYY-MM-DD for HTML input[type="date"]
  const preparedDefaultValues = React.useMemo(() => {
    if (!initialData) return {};
    const copy = { ...initialData };
    columns.forEach((col) => {
      if (isDateCol(col.type) && copy[col.name]) {
        const val = copy[col.name];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
          copy[col.name] = val.substring(0, 10);
        } else if (val) {
          try {
            const d = new Date(val as string | number | Date);
            if (!isNaN(d.getTime())) {
              copy[col.name] = d.toISOString().split('T')[0];
            }
          } catch {
            // Keep original
          }
        }
      }
    });
    return copy;
  }, [initialData, columns]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: preparedDefaultValues,
  });

  const handleFormSubmit = (data: Record<string, any>) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {columns
          .filter((col) => !col.readOnly && col.name !== 'ID')
          .map((col) => {
            const isFullWidth = col.type === 'Note' || col.type === 'Attachment';

            return (
              <div
                key={col.id}
                className={`flex flex-col gap-1.5 ${isFullWidth ? 'md:col-span-2' : ''}`}
              >
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>
                    {col.displayName}
                    {col.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">({col.type})</span>
                </label>

                {/* Render input based on Column Type */}
                {col.type === 'Text' && (
                  <input
                    type="text"
                    {...register(col.name, { required: col.required ? `${col.displayName} is required` : false })}
                    placeholder={`Enter ${col.displayName.toLowerCase()}...`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
                  />
                )}

                {col.type === 'Note' && (
                  <textarea
                    rows={3}
                    {...register(col.name, { required: col.required ? `${col.displayName} is required` : false })}
                    placeholder={`Enter ${col.displayName.toLowerCase()}...`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none resize-y"
                  />
                )}

                {col.type === 'Choice' && (
                  <select
                    {...register(col.name, { required: col.required ? `${col.displayName} is required` : false })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
                  >
                    <option value="">-- Select {col.displayName} --</option>
                    {(col.choices || []).map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                )}

                {(col.type === 'Number' || col.type === 'Currency') && (
                  <div className="relative">
                    {col.type === 'Currency' ? (
                      <DollarSign className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    ) : (
                      <Hash className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                    <input
                      type="number"
                      step={col.type === 'Currency' ? '0.01' : '1'}
                      {...register(col.name, {
                        required: col.required ? `${col.displayName} is required` : false,
                        valueAsNumber: true,
                      })}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
                    />
                  </div>
                )}

                {isDateCol(col.type) && (
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      {...register(col.name, { required: col.required ? `${col.displayName} is required` : false })}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
                    />
                  </div>
                )}

                {col.type === 'Person' && (
                  <div className="relative">
                    <UserCheck className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      {...register(col.name, { required: col.required ? `${col.displayName} is required` : false })}
                      placeholder="Select user (e.g. Sarah Jenkins)..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
                    />
                  </div>
                )}

                {col.type === 'Boolean' && (
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register(col.name)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Enable / Yes</span>
                  </label>
                )}

                {(col.type === 'Image' || col.type === 'image' || col.type === 'URL') && (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Upload className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        {...register(col.name, { required: col.required ? `${col.displayName} is required` : false })}
                        placeholder="Enter image URL (e.g. https://...)..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none"
                      />
                    </div>
                    {watch(col.name) && typeof watch(col.name) === 'string' && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <img
                          src={watch(col.name)}
                          alt="Preview"
                          className="w-9 h-9 object-cover rounded-md border border-slate-300 dark:border-slate-600 shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="text-[11px] text-slate-500 truncate">{watch(col.name)}</span>
                      </div>
                    )}
                  </div>
                )}

                {errors[col.name] && (
                  <span className="text-[11px] text-red-500 font-medium">
                    {String(errors[col.name]?.message)}
                  </span>
                )}
              </div>
            );
          })}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? 'Saving to SharePoint...' : 'Save Item'}
        </button>
      </div>
    </form>
  );
};
