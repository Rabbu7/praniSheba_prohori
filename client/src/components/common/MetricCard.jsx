import React from 'react';

export default function MetricCard({ label, value, icon, tone = 'primary' }) {
  const tones = { primary: 'bg-primary', online: 'bg-status-online', warning: 'bg-status-warning', tertiary: 'bg-tertiary' };
  return (
    <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
      <div className={`absolute inset-y-0 left-0 w-1 ${tones[tone] || tones.primary}`} />
      <div className="flex items-start justify-between">
        <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">{label}</span>
        <span className="material-symbols-outlined text-secondary" aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-4 font-display-data text-display-data text-on-background">{value ?? '—'}</p>
    </div>
  );
}
