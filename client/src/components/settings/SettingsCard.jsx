import React from 'react';

export default function SettingsCard({ icon, title, description, children, className = '' }) {
  return (
    <div className={`bg-surface-white border border-border-subtle rounded-lg p-6 shadow-xs ${className}`}>
      {(title || icon) && (
        <div className="flex items-start gap-3 mb-5">
          {icon && (
            <span className="material-symbols-outlined text-[24px] text-primary shrink-0 mt-0.5">
              {icon}
            </span>
          )}
          <div>
            {title && (
              <h3 className="font-headline-md text-headline-md font-bold text-on-background">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-secondary text-body-sm mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
