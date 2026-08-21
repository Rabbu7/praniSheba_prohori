import React from 'react';

export default function HistoryTabs({ range = '7d', onChange }) {
  const is7d = range === '7d';

  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={() => onChange && onChange('7d')}
        className={
          is7d
            ? 'font-body-sm text-body-sm font-medium text-primary border-b-2 border-primary pb-1 relative cursor-pointer'
            : 'font-body-sm text-body-sm text-secondary hover:text-on-background pb-1 border-b-2 border-transparent transition-colors tab-underline cursor-pointer'
        }
      >
        7d
      </button>
      <button
        type="button"
        onClick={() => onChange && onChange('30d')}
        className={
          !is7d
            ? 'font-body-sm text-body-sm font-medium text-primary border-b-2 border-primary pb-1 relative cursor-pointer'
            : 'font-body-sm text-body-sm text-secondary hover:text-on-background pb-1 border-b-2 border-transparent transition-colors tab-underline cursor-pointer'
        }
      >
        30d
      </button>
    </div>
  );
}
