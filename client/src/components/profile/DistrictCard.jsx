import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function DistrictCard({ division, district, farmerCount, deviceCount }) {
  const { t, translateLocation } = useLanguage();

  return (
    <div className="bg-surface-white border border-border-subtle rounded-lg p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">map</span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md font-bold text-on-background leading-tight">
              {t('profile.assignedDistrict')}
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              {translateLocation(division, 'division') || '—'}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed/40 text-on-primary-fixed">
          <span className="w-1.5 h-1.5 rounded-full bg-status-online animate-glow-pulse" />
          {t('common.active')}
        </span>
      </div>

      <div className="pt-5 space-y-4">
        {/* District Highlight */}
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-container-low/70">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-secondary text-[20px]">location_on</span>
            <div>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
                {t('auth.district')}
              </span>
              <span className="font-body-lg text-body-lg font-bold text-on-background">
                {translateLocation(district, 'district') || '—'}
              </span>
            </div>
          </div>
          <span className="text-xs text-secondary px-2 py-0.5 rounded bg-surface-white border border-border-subtle">
            {translateLocation(division, 'division') || '—'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg border border-border-subtle bg-surface-white">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary block">
              {t('manager.totalFarmers')}
            </span>
            <p className="font-display-data text-display-data-mobile text-on-background mt-1">
              {farmerCount ?? '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border-subtle bg-surface-white">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary block">
              {t('manager.totalDevices')}
            </span>
            <p className="font-display-data text-display-data-mobile text-on-background mt-1">
              {deviceCount ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
