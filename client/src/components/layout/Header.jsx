import React from 'react';
import StatusBadge from '../common/StatusBadge';

function formatRelativeTime(date) {
  if (!date) return '—';
  if (typeof date === 'string' && !date.includes('T') && !date.includes('-')) {
    return date;
  }
  const now = new Date();
  const updated = new Date(date);
  const diffInSeconds = Math.floor((now - updated) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 60) return 'Just now';
  const mins = Math.floor(diffInSeconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Header({ title = 'Dashboard', deviceId = 'G3036', status = 'online', lastUpdated = null }) {
  const formattedTime = formatRelativeTime(lastUpdated);

  return (
    <>
      {/* Top App Bar (Mobile Only) */}
      <header className="md:hidden flex justify-between items-center px-container-padding py-4 w-full border-b border-border-subtle bg-surface-white absolute top-0 z-20 h-[64px]">
        <div className="flex items-center gap-2">
          <span className="font-headline-md text-headline-md font-bold text-on-background">Prohori</span>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant">
          <span className="material-symbols-outlined cursor-pointer hover:text-primary hover:scale-110 transition-transform">notifications</span>
          <span className="material-symbols-outlined cursor-pointer hover:text-primary hover:scale-110 transition-transform">account_circle</span>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex justify-between items-center px-container-padding py-4 w-full border-b border-border-subtle bg-surface-white sticky top-0 z-20 h-[72px]">
        <div className="flex items-center gap-4">
          <h2 className="font-headline-md text-headline-md font-bold text-on-background">{title}</h2>
          <div className="h-6 w-px bg-border-subtle"></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-body-sm text-body-sm text-secondary">Device:</span>
              <span className="font-body-sm text-body-sm font-medium">{deviceId}</span>
              <StatusBadge status={status} />
            </div>
            <div className="h-4 w-px bg-border-subtle"></div>
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-md border border-border-subtle">
              <span className="material-symbols-outlined text-[16px] text-secondary">update</span>
              <span className="font-body-sm text-body-sm font-medium text-on-background">
                Last updated: {formattedTime}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 ml-4 text-on-surface-variant">
            <span className="material-symbols-outlined cursor-pointer hover:text-primary hover:scale-110 transition-transform">notifications</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-primary hover:scale-110 transition-transform">account_circle</span>
          </div>
        </div>
      </header>
    </>
  );
}
