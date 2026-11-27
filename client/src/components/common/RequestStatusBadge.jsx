import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function RequestStatusBadge({ status }) {
  const { t } = useLanguage();

  if (status === 'approved') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-status-online/10 text-on-background border border-status-online/30 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-online mr-1.5" />
        {t('common.approved')}
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-status-danger/10 text-on-background border border-status-danger/30 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-danger mr-1.5" />
        {t('common.rejected')}
      </span>
    );
  }

  if (status === 'unlinked') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-status-offline/10 text-on-background border border-status-offline/30 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-offline mr-1.5" />
        {t('common.unlinked')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-status-warning/10 text-on-background border border-status-warning/30 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-status-warning mr-1.5 animate-pulse" />
      {t('common.pending')}
    </span>
  );
}

