import React from 'react';

interface InputProps {
  label?: string;
  type?: string;
  id?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  multiline?: boolean;
  rows?: number;
  icon?: React.ReactNode;
}

export function Input({
  label,
  type = 'text',
  id,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  multiline = false,
  rows = 3,
  icon,
}: InputProps) {
  const baseInputClasses = `
    w-full rounded-lg border
    px-4 py-2.5
    text-sm text-ui-text-primary
    placeholder:text-ui-text-tertiary
    transition-all duration-200
    focus:outline-none
    focus:border-whatsapp-primary
    focus:ring-2 focus:ring-whatsapp-primary/20
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-ui-border'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}
  `;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ui-text-secondary mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ui-text-tertiary">
            {icon}
          </div>
        )}

        {multiline ? (
          <textarea
            id={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            rows={rows}
            className={`${baseInputClasses} resize-none ${icon ? 'pl-10' : ''}`}
          />
        ) : (
          <input
            type={type}
            id={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`${baseInputClasses} ${icon ? 'pl-10' : ''}`}
          />
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-ui-text-tertiary">{helperText}</p>}
    </div>
  );
}
