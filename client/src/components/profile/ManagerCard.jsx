import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function ManagerCard({ manager, district }) {
  const { t, translateLocation } = useLanguage();

  const getInitials = (first = '', last = '') => {
    const f = first.trim().charAt(0) || '';
    const l = last.trim().charAt(0) || '';
    return (f + l).toUpperCase() || 'M';
  };

  return (
    <div className="bg-surface-white border border-border-subtle rounded-lg p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md font-bold text-on-background leading-tight">
              {t('profile.managerInfo')}
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              {t('profile.managerHelpTitle')}
            </p>
          </div>
        </div>
        {manager && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed/40 text-on-primary-fixed">
            <span className="w-1.5 h-1.5 rounded-full bg-status-online animate-glow-pulse" />
            {t('common.active')}
          </span>
        )}
      </div>

      {manager ? (
        <div className="pt-5 space-y-4">
          {/* Manager Identity Header */}
          <div className="flex items-center gap-3.5 bg-surface-container-low/70 rounded-lg p-3.5 border border-border-subtle/60">
            <div className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm tracking-wide shadow-xs shrink-0">
              {getInitials(manager.firstName, manager.lastName)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
                {t('profile.managerName')}
              </span>
              <h4 className="font-body-lg text-body-lg font-bold text-on-background capitalize truncate">
                {manager.firstName} {manager.lastName}
              </h4>
              <span className="text-xs text-secondary font-medium block">
                {t('profile.manager')}
              </span>
            </div>
          </div>

          {/* Structured Details */}
          <div className="space-y-3">
            {/* District Tile */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-white">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">location_on</span>
                <div>
                  <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
                    {t('auth.district')}
                  </span>
                  <span className="text-body-sm font-semibold text-on-background">
                    {translateLocation(district, 'district') || '—'}
                  </span>
                </div>
              </div>
              <span className="text-xs text-secondary px-2 py-0.5 rounded bg-surface-container-low border border-border-subtle">
                {t('profile.assignedDistrict')}
              </span>
            </div>

            {/* Contact / Phone Tile */}
            <div className="p-3 rounded-lg border border-border-subtle bg-surface-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">call</span>
                  <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    {t('auth.phone')}
                  </span>
                </div>
                <span className="text-xs text-secondary">
                  {t('profile.directLine')}
                </span>
              </div>
              <a
                href={`tel:${manager.phone}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-md bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-body-sm transition-colors cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">call</span>
                <span>{manager.phone}</span>
                <span className="text-xs font-normal opacity-80">· {t('profile.callManager')}</span>
              </a>
            </div>
          </div>

          {/* Context Notice */}
          <p className="text-xs text-secondary leading-relaxed bg-surface-container-low/40 rounded-md p-2.5 border border-border-subtle/50">
            {t('profile.managerHelp')}
          </p>
        </div>
      ) : (
        /* Empty State */
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-container-high mx-auto flex items-center justify-center text-secondary mb-3">
            <span className="material-symbols-outlined text-2xl">person_off</span>
          </div>
          <h4 className="font-semibold text-on-background text-body-sm">
            {t('profile.noManagerAssigned')}
          </h4>
          <p className="text-xs text-secondary mt-1 max-w-[260px] mx-auto leading-relaxed">
            {t('profile.noManagerDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
