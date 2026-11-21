import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function RequestStatusBadge({ status }) {
  const { t } = useLanguage();

  if (status === 'approved') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-online mr-1.5" />
        {t('common.approved')}
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-danger mr-1.5" />
        {t('common.rejected')}
      </span>
    );
  }

  if (status === 'unlinked') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container-low text-secondary border border-border-subtle text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-offline mr-1.5" />
        {t('common.unlinked')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-status-warning mr-1.5 animate-pulse" />
      {t('common.pending')}
    </span>
  );
}

