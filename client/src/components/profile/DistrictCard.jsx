import React from 'react';

export default function DistrictCard({ division, district, farmerCount, deviceCount }) {
  return (
    <div className="bg-surface-white border border-border-subtle rounded-lg p-6 shadow-xs">
      <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-4">
        Your district
      </h3>
      <div className="space-y-3">
        <div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
            District
          </span>
          <p className="font-body-lg text-body-lg font-bold text-on-background mt-0.5">
            {district || '—'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-3">
          <div><span className="text-xs font-semibold uppercase tracking-wider text-secondary">Farmers</span><p className="font-display-data text-display-data-mobile">{farmerCount ?? '—'}</p></div>
          <div><span className="text-xs font-semibold uppercase tracking-wider text-secondary">Devices</span><p className="font-display-data text-display-data-mobile">{deviceCount ?? '—'}</p></div>
        </div>
        <div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
            Division
          </span>
          <p className="text-body-sm text-secondary mt-0.5">
            {division || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
