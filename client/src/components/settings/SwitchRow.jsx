import React from 'react';

export default function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${className}`}>
      <div>
        <label htmlFor={id} className="font-body-sm text-body-sm font-medium text-on-background cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-secondary text-body-sm mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          checked ? 'bg-primary' : 'bg-surface-container-high'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
