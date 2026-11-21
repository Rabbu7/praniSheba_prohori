import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import DeviceSwitcher from './DeviceSwitcher';
import NotificationBell from './NotificationBell';
import LanguageToggle from '../common/LanguageToggle';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import useAlerts from '../../hooks/useAlerts';
import { formatRelativeTime } from '../../utils/dateFormatter';

export default function Header({
  title = 'Dashboard',
  status = 'online',
  lastUpdated = null,
  mobileSwitcher = false,
  showDevice = true,
}) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isAlertsRole = user?.role === 'farmer' || user?.role === 'manager';
  const alertsState = useAlerts(isAlertsRole);
  const formattedTime = formatRelativeTime(lastUpdated, language);

  return (
    <>
      {/* Top App Bar (Mobile Only) */}
      <header className="md:hidden flex justify-between items-center px-container-padding py-4 w-full border-b border-border-subtle bg-surface-white absolute top-0 z-20 h-[64px]">
        <div className="flex items-center gap-2">
          <span className="font-headline-md text-headline-md font-bold text-on-background">{t('common.appName')}</span>
          {showDevice && mobileSwitcher && (
            <div className="ml-2">
              <DeviceSwitcher />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <LanguageToggle />
          {isAlertsRole ? (
            <NotificationBell
              alerts={alertsState.alerts}
              unreadCount={alertsState.unreadCount}
              loading={alertsState.loading}
              error={alertsState.error}
              onMarkRead={alertsState.markRead}
              onMarkAllRead={alertsState.markAllRead}
              variant="mobile"
            />
          ) : (
            <span className="material-symbols-outlined">notifications</span>
          )}
          <Link
            to="/profile"
            title={t('nav.profile')}
            aria-label={t('nav.profile')}
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
                  <span className="font-body-sm text-body-sm text-secondary">{t('dashboard.deviceId')}:</span>
                  <DeviceSwitcher />
                  <StatusBadge status={status} />
                </div>
                <div className="h-4 w-px bg-border-subtle" />
                <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-md border border-border-subtle">
                  <span className="material-symbols-outlined text-[16px] text-secondary">update</span>
                  <span className="font-body-sm text-body-sm font-medium text-on-background">
                    {t('dashboard.lastUpdated')}: {formattedTime}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <div className="flex items-center gap-4 text-on-surface-variant">
            {isAlertsRole ? (
              <NotificationBell
                alerts={alertsState.alerts}
                unreadCount={alertsState.unreadCount}
                loading={alertsState.loading}
                error={alertsState.error}
                onMarkRead={alertsState.markRead}
                onMarkAllRead={alertsState.markAllRead}
                variant="desktop"
              />
            ) : (
              <span className="material-symbols-outlined">notifications</span>
            )}
            <Link
              to="/profile"
              title={t('nav.profile')}
              aria-label={t('nav.profile')}
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
