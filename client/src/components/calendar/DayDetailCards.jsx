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

export default function DayDetailCards({
  date = null,
  detail = null,
  loading = false,
  error = null
}) {
  if (!date) {
    return (
      <div className="mt-6 bg-surface-white border border-[#D1D5DB] rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm">
        <span className="material-symbols-outlined text-secondary text-3xl mb-2">
          calendar_today
        </span>
        <p className="text-secondary text-body-sm">Select a day to view details</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 bg-surface-white border border-error/30 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm">
        <span className="material-symbols-outlined text-error text-3xl mb-2">cloud_off</span>
        <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-1">
          Unable to load day details
        </h3>
        <p className="text-secondary text-body-sm">Please try again.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-6 bg-surface-white border border-[#D1D5DB] rounded-lg p-6 shadow-sm">
        <div className="text-center text-secondary text-body-sm">Loading day details…</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mt-6 bg-surface-white border border-[#D1D5DB] rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm">
        <span className="material-symbols-outlined text-secondary text-3xl mb-2">
          info
        </span>
        <p className="text-secondary text-body-sm">No readings for {date}</p>
      </div>
    );
  }

  // Render 4 cards: ammonia, methane, humidity, temperature
  const cards = [
    {
      label: 'Ammonia',
      unit: 'ppm',
      icon: 'science',
      minKey: 'ammonia_min',
      maxKey: 'ammonia_max',
      minZoneKey: 'ammonia_min_zone',
      maxZoneKey: 'ammonia_max_zone'
    },
    {
      label: 'Methane',
      unit: 'ppm',
      icon: 'gas_meter',
      minKey: 'methane_min',
      maxKey: 'methane_max',
      minZoneKey: 'methane_min_zone',
      maxZoneKey: 'methane_max_zone'
    },
    {
      label: 'Humidity',
      unit: '%',
      icon: 'water_drop',
      minKey: 'humidity_min',
      maxKey: 'humidity_max',
      minZoneKey: 'humidity_min_zone',
      maxZoneKey: 'humidity_max_zone'
    },
    {
      label: 'Temperature',
      unit: '°F',
      icon: 'thermometer',
      minKey: 'temperature_min',
      maxKey: 'temperature_max',
      minZoneKey: 'temperature_min_zone',
      maxZoneKey: 'temperature_max_zone'
    }
  ];

  return (
    <div className="mt-6">
      <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-4">
        {date}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const minVal = detail[card.minKey];
          const maxVal = detail[card.maxKey];
          const minZone = detail[card.minZoneKey] || 'safe';
          const maxZone = detail[card.maxZoneKey] || 'safe';
          const minColor = zoneColorMap[minZone] || zoneColorMap.safe;
          const maxColor = zoneColorMap[maxZone] || zoneColorMap.safe;

          const displayMin = minVal !== null && minVal !== undefined ? minVal.toFixed(1) : '—';
          const displayMax = maxVal !== null && maxVal !== undefined ? maxVal.toFixed(1) : '—';

          return (
            <div
              key={card.label}
              className="bg-surface-white border border-[#D1D5DB] rounded-lg p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300"
            >
              {/* Left indicator bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${minColor.bg}`}
              ></div>

              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">
                  {card.label}
                </span>
                <span className="material-symbols-outlined text-secondary">{card.icon}</span>
              </div>

              {/* Min/Max Values */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-secondary text-body-sm font-medium">Min:</span>
                  <span className={`font-display-data-mobile text-display-data-mobile md:text-display-data ${minColor.text}`}>
                    {displayMin}
                  </span>
                  <span className="font-unit-label text-unit-label text-secondary">{card.unit}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-secondary text-body-sm font-medium">Max:</span>
                  <span className={`font-display-data-mobile text-display-data-mobile md:text-display-data ${maxColor.text}`}>
                    {displayMax}
                  </span>
                  <span className="font-unit-label text-unit-label text-secondary">{card.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
