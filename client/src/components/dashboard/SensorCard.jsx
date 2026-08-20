import React from 'react';

const zoneColorMap = {
  safe: {
    bg: 'bg-status-online',
    text: 'text-status-online'
  },
  warning: {
    bg: 'bg-status-warning',
    text: 'text-status-warning'
  },
  danger: {
    bg: 'bg-status-danger',
    text: 'text-status-danger'
  }
};

export default function SensorCard({
  label = 'Metric',
  value = null,
  unit = '',
  zone = 'safe',
  icon = 'analytics',
  trend = null,
  changed = false
}) {
  const zoneConfig = zoneColorMap[zone] || zoneColorMap.safe;
  const isWarning = zone === 'warning';
  const displayValue = value !== null && value !== undefined ? value : '—';

  return (
    <div
      className={`bg-surface-white border border-[#D1D5DB] rounded-lg p-5 relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-300 ease-in-out cursor-default ${
        changed ? 'card-highlight-flash' : ''
      }`}
    >
      {/* Left indicator bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${zoneConfig.bg} ${
          isWarning ? 'animate-border-pulse' : ''
        }`}
      ></div>

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">
            {label}
          </span>
          <div className={`w-2 h-2 rounded-full ${zoneConfig.bg}`}></div>
        </div>
        <span className="material-symbols-outlined text-secondary">{icon}</span>
      </div>

      {/* Value & Unit */}
      <div className="flex items-baseline gap-2 mt-1">
        <span className="font-display-data text-display-data-mobile md:text-display-data text-on-background">
          {displayValue}
        </span>
        {unit && <span className="font-unit-label text-unit-label text-secondary">{unit}</span>}
      </div>

      {/* Footer / Trend */}
      <div className="mt-3 flex items-center text-sm border-t border-border-subtle pt-3">
        {trend && typeof trend === 'object' && trend.delta !== undefined ? (
          <>
            <span className={`material-symbols-outlined ${zoneConfig.text} text-[16px] mr-1`}>
              {trend.direction === 'down' ? 'trending_down' : 'trending_up'}
            </span>
            <span className={`${zoneConfig.text} font-medium mr-2`}>
              {trend.delta > 0 ? `+${trend.delta}` : trend.delta}
            </span>
            <span className="text-secondary text-xs">{trend.message || 'vs last hour'}</span>
          </>
        ) : (
          <span className="text-secondary text-xs">
            {typeof trend === 'string'
              ? trend
              : zone === 'safe'
              ? 'Within normal threshold'
              : zone === 'warning'
              ? 'Elevated level detected'
              : 'Critical threshold exceeded'}
          </span>
        )}
      </div>
    </div>
  );
}
