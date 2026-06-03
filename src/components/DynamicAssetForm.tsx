import type { FieldDefinition } from '../types/categoryTypes';
import { cn } from '../lib/utils';

export interface DynamicAssetFormProps {
  fields: FieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string>;
  className?: string;
  title?: string;
}

export default function DynamicAssetForm({
  fields,
  values,
  onChange,
  errors = {},
  className,
  title = 'Type-specific details',
}: DynamicAssetFormProps) {
  if (!fields.length) return null;

  return (
    <section className={cn('space-y-4', className)}>
      <h3 className="label-caps flex items-center gap-2 text-blue-600">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => {
          const err = errors[field.key];
          const value = values[field.key] ?? '';
          const label = (
            <label className="label-caps block mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
          );

          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="md:col-span-2 space-y-1">
                {label}
                <textarea
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full input-geometric min-h-[88px]"
                />
                {err && <p className="text-xs text-red-500 font-bold">{err}</p>}
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <div key={field.key} className="space-y-1">
                {label}
                <select
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="w-full input-geometric bg-white"
                >
                  <option value="">Select…</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {err && <p className="text-xs text-red-500 font-bold">{err}</p>}
              </div>
            );
          }

          if (field.type === 'checkbox') {
            return (
              <div key={field.key} className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  checked={value === 'Yes' || value === 'true'}
                  onChange={(e) => onChange(field.key, e.target.checked ? 'Yes' : 'No')}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                {label}
                {err && <p className="text-xs text-red-500 font-bold">{err}</p>}
              </div>
            );
          }

          const inputType =
            field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text';

          return (
            <div key={field.key} className="space-y-1">
              {label}
              <input
                type={inputType}
                value={value}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full input-geometric"
              />
              {err && <p className="text-xs text-red-500 font-bold">{err}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Validate required dynamic fields */
export function validateDynamicFields(
  fields: FieldDefinition[],
  values: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.required && !String(values[f.key] ?? '').trim()) {
      errors[f.key] = `${f.label} is required`;
    }
  }
  return errors;
}
