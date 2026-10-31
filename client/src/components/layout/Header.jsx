import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import DeviceSwitcher from './DeviceSwitcher';

function formatRelativeTime(date) {
  if (!date) return '—';
  if (typeof date === 'string' && !date.includes('T') && !date.includes('-')) {
    return date;
  }
  const now = new Date();
  const updated = new Date(date);
  const diffInSeconds = Math.floor((now - updated) / 1000);

  if (Number.isNaN(diffInSeconds) || diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 60) return 'Just now';
  const mins = Math.floor(diffInSeconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Header({
  title = 'Dashboard',
  status = 'online',
  lastUpdated = null,
  mobileSwitcher = false,
  showDevice = true,
}) {
  const formattedTime = formatRelativeTime(lastUpdated);

  return (
    <>
      {/* Top App Bar (Mobile Only) */}
      <header className="md:hidden flex justify-between items-center px-container-padding py-4 w-full border-b border-border-subtle bg-surface-white absolute top-0 z-20 h-[64px]">
        <div className="flex items-center gap-2">
          <span className="font-headline-md text-headline-md font-bold text-on-background">Prohori</span>
          {showDevice && mobileSwitcher && (
            <div className="ml-2">
              <DeviceSwitcher />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant">
          <span className="material-symbols-outlined">notifications</span>
          <Link
            to="/profile"
            title="Profile"
            aria-label="Profile"
            className="flex items-center text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </Link>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex justify-between items-center px-container-padding py-4 w-full border-b border-border-subtle bg-surface-white sticky top-0 z-20 h-[72px]">
        <div className="flex items-center gap-4">
          <h2 className="font-headline-md text-headline-md font-bold text-on-background">{title}</h2>
          {showDevice && (
            <>
              <div className="h-6 w-px bg-border-subtle" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-body-sm text-body-sm text-secondary">Device:</span>
                  <DeviceSwitcher />
                  <StatusBadge status={status} />
                </div>
                <div className="h-4 w-px bg-border-subtle" />
                <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-md border border-border-subtle">
                  <span className="material-symbols-outlined text-[16px] text-secondary">update</span>
                  <span className="font-body-sm text-body-sm font-medium text-on-background">
                    Last updated: {formattedTime}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 ml-4 text-on-surface-variant">
            <span className="material-symbols-outlined">notifications</span>
            <Link
              to="/profile"
              title="Profile"
              aria-label="Profile"
              className="flex items-center text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">account_circle</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
