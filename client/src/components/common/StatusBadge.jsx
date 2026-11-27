import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function StatusBadge({ status = 'online' }) {
  const { t } = useLanguage();
  const isOnline = status === 'online';

  if (isOnline) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-status-online/10 text-on-background border border-status-online/30 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-status-online mr-1.5 animate-glow-pulse" />
        {t('common.online')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-status-offline/10 text-on-background border border-status-offline/30 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-status-offline mr-1.5"></span>
      {t('common.offline')}
    </span>
  );
}
