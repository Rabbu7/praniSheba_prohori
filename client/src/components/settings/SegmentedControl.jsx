import React, { useRef } from 'react';

export default function SegmentedControl({
  name,
  label,
  options = [],
  value,
  onChange,
  className = '',
}) {
  const containerRef = useRef(null);

  const handleKeyDown = (e, index) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      targetIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      targetIndex = (index - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = options.length - 1;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      const targetOption = options[targetIndex];
      onChange(targetOption.value);
      const buttons = containerRef.current?.querySelectorAll('button[role="radio"]');
      buttons?.[targetIndex]?.focus();
    }
  };

  return (
    <div className={className}>
      {label && (
        <div className="font-body-sm text-body-sm font-medium text-on-background mb-2">
          {label}
        </div>
      )}
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label={label || name}
        className="inline-flex flex-wrap p-1 rounded-lg bg-surface-container-low border border-border-subtle gap-1"
      >
        {options.map((opt, idx) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-high/50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
