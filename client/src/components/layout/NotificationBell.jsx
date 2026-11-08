import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { formatRelativeTime } from '../../utils/dateFormatter';

function capitalize(val) {
  if (!val || typeof val !== 'string') return '';
  return val.charAt(0).toUpperCase() + val.slice(1);
}

function getMetricUnit(metric) {
  if (metric === 'ammonia' || metric === 'methane') return 'ppm';
  if (metric === 'humidity') return '%';
  if (metric === 'temperature') return '°F';
  return '';
}

function getZoneDotClass(zone) {
  if (zone === 'danger') return 'bg-status-danger';
  if (zone === 'warning') return 'bg-status-warning';
  return 'bg-secondary';
}

export default function NotificationBell({
  alerts = [],
  unreadCount = 0,
  loading = false,
  error = null,
  onMarkRead,
  onMarkAllRead,
  variant = 'desktop',
}) {
  const { user } = useAuth();
  const { selectDevice } = useDevice();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        close();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, close]);

  // Keyboard navigation
  const handleMenuKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
        if (!items || items.length === 0) return;
        const activeIndex = Array.from(items).indexOf(document.activeElement);
        let nextIndex;
        if (e.key === 'ArrowDown') {
          nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
        } else {
          nextIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
        }
        items[nextIndex].focus();
      }
    },
    [close]
  );

  // Focus first item on open
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const items = menuRef.current.querySelectorAll('[role="menuitem"]');
    if (items.length > 0) {
      items[0].focus();
    }
  }, [open]);

  const handleRowClick = (alert) => {
    if (onMarkRead) {
      onMarkRead(alert.id);
    }
    close();
    if (user?.role === 'manager') {
      navigate('/manager/farmers');
    } else {
      if (alert.deviceId) {
        selectDevice(alert.deviceId);
      }
      navigate('/');
    }
  };

  const badgeText = unreadCount > 9 ? '9+' : unreadCount;
  const ariaLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1.5 bg-status-danger text-on-primary font-bold text-[10px] leading-none px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-[16px] min-h-[16px]">
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          aria-label="Notifications"
          onKeyDown={handleMenuKeyDown}
          className={`absolute top-full mt-2 z-50 bg-surface-white rounded-lg shadow-lg border border-border-subtle overflow-hidden flex flex-col ${
            variant === 'mobile'
              ? '-right-8 w-[calc(100vw-32px)] max-w-sm'
              : 'right-0 w-80 md:w-96'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface">
            <span className="font-headline-md text-body-sm font-semibold text-on-background">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="text-xs text-secondary font-medium">
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* List area */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
            {loading && alerts.length === 0 && (
              <div className="p-4 text-center text-body-sm text-secondary">Loading...</div>
            )}
            {error && alerts.length === 0 && (
              <div className="p-4 text-center text-body-sm text-error">Unable to load alerts</div>
            )}
            {!loading && !error && alerts.length === 0 && (
              <div className="p-4 text-center text-body-sm text-secondary">No alerts yet.</div>
            )}

            {alerts.slice(0, 10).map((alert) => {
              const dotClass = getZoneDotClass(alert.zone);
              const unit = getMetricUnit(alert.metric);
              const isUnread = !alert.read;

              return (
                <button
                  key={alert.id}
                  type="button"
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => handleRowClick(alert)}
                  className={`w-full text-left p-3 hover:bg-surface-container transition-colors flex items-start gap-3 focus:outline-none focus:bg-surface-container cursor-pointer ${
                    isUnread ? 'bg-primary-fixed/30' : ''
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${dotClass}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-body-sm text-on-background ${
                          isUnread ? 'font-semibold' : 'font-medium'
                        }`}
                      >
                        {capitalize(alert.metric)} {capitalize(alert.zone)}
                      </span>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                        {alert.deviceId}
                      </span>
                      {alert.resolvedAt && (
                        <span className="text-[11px] font-medium text-status-online bg-status-online/10 px-1.5 py-0.5 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-body-sm text-secondary mt-1">
                      <span>
                        {alert.value} {unit}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        {formatRelativeTime(alert.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border-subtle bg-surface flex justify-end">
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className="text-body-sm font-medium text-primary hover:underline disabled:text-outline disabled:no-underline disabled:cursor-not-allowed px-3 py-1.5 focus:outline-none"
            >
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
