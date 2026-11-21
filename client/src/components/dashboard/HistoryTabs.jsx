import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function HistoryTabs({ range = '7d', onChange }) {
  const { t } = useLanguage();
  const is7d = range === '7d';

  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={() => onChange && onChange('7d')}
        aria-label={t('dashboard.range7dLabel')}
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
        aria-label={t('dashboard.range30dLabel')}
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
