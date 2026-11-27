import React from 'react';
import useThresholds from '../../hooks/useThresholds';
import { useLanguage } from '../../context/LanguageContext';

const METRIC_KEYS = ['ammonia', 'methane', 'humidity', 'temperature'];

const ZONE_STYLES = {
  safe: {
    badge: 'bg-status-online/10 text-on-background border-status-online/30',
    dot: 'bg-status-online',
    labelKey: 'zones.safe',
  },
  warning: {
    badge: 'bg-status-warning/10 text-on-background border-status-warning/30',
    dot: 'bg-status-warning',
    labelKey: 'zones.warning',
  },
  danger: {
    badge: 'bg-status-danger/10 text-on-background border-status-danger/30',
    dot: 'bg-status-danger',
    labelKey: 'zones.danger',
  },
};

function formatRangeText(band, unit, t) {
  const min = band.min;
  const max = band.max;

  const minStr = min !== null && min !== undefined ? min.toLocaleString('en-US') : null;
  const maxStr = max !== null && max !== undefined ? max.toLocaleString('en-US') : null;

  if (minStr === null && maxStr !== null) {
    return `${t('settings.rangeBelow', { value: maxStr })} ${unit}`;
  }
  if (maxStr === null && minStr !== null) {
    return `${t('settings.rangeAbove', { value: minStr })} ${unit}`;
  }
  if (minStr !== null && maxStr !== null) {
    return `${minStr}–${maxStr} ${unit}`;
  }
  return `— ${unit}`;
}

export default function ThresholdGuide() {
  const { thresholds, loading, error } = useThresholds();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="py-6 text-center text-secondary text-body-sm">
        {t('common.loading')}
      </div>
    );
  }

  if (error || !thresholds) {
    return (
      <div className="py-6 text-center text-error text-body-sm">
        {t('settings.thresholdsLoadError')}
      </div>
    );
  }

  // Ensure check-i18n sees explicit literal calls
  const metricLabels = {
    ammonia: t('metrics.ammonia'),
    methane: t('metrics.methane'),
    humidity: t('metrics.humidity'),
    temperature: t('metrics.temperature'),
  };

  return (
    <div className="space-y-6">
      {METRIC_KEYS.map((metricId) => {
        const metricData = thresholds[metricId];
        if (!metricData) return null;

        const label = metricLabels[metricId] || metricId;
        const unit = metricData.unit || '';
        const bands = metricData.bands || [];

        return (
          <div key={metricId} className="border-b border-border-subtle pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline-md text-headline-md font-semibold text-on-background">
                {label}
              </h4>
              <span className="font-mono text-body-sm text-secondary">
                ({unit})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {bands.map((band, idx) => {
                const zone = band.zone || 'safe';
                const style = ZONE_STYLES[zone] || ZONE_STYLES.safe;
                const rangeText = formatRangeText(band, unit, t);

                return (
                  <div
                    key={`${zone}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-border-subtle"
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${style.dot}`} />
                      {t(style.labelKey)}
                    </span>
                    <span className="font-mono text-body-sm font-medium text-on-background">
                      {rangeText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
