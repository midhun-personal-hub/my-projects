import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
