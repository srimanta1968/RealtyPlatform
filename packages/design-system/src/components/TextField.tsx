import { forwardRef, type InputHTMLAttributes } from 'react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, className = '', id, ...props },
  ref,
) {
  const fieldId = id ?? props.name ?? 'field';
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={[
          'mt-1 w-full rounded-lg border px-3 py-2 text-slate-900',
          'focus:outline-none focus:ring-2 focus:ring-kiana-primary/30',
          error ? 'border-red-400' : 'border-slate-300 focus:border-kiana-primary',
          className,
        ].join(' ')}
        {...props}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
