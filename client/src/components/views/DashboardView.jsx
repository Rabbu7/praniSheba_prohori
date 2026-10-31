import React, { useState } from 'react';
import useDeviceStatus from '../../hooks/useDeviceStatus';
import useDailyAverages from '../../hooks/useDailyAverages';
import StatusBadge from '../common/StatusBadge';
import ReadingsPanel from '../dashboard/ReadingsPanel';
import HistoryTabs from '../dashboard/HistoryTabs';
import TrendChart from '../dashboard/TrendChart';

export default function DashboardView({ deviceId }) {
  const { reading, status, lastUpdated, error } = useDeviceStatus(deviceId);
  const [range, setRange] = useState('7d');
  const { data, loading } = useDailyAverages(range, deviceId);
  if (error) return <div className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">Unable to reach Prohori server</div>;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-3"><ReadingsPanel reading={reading} /></div>
      <section className="flex flex-col rounded-lg border border-border-subtle bg-surface-white p-6 lg:col-span-9">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-headline-md text-headline-md font-bold text-on-background"><span className="material-symbols-outlined text-primary">monitoring</span>Environmental Trends Analysis</h3>
          <div className="flex items-center gap-3"><StatusBadge status={status} /><HistoryTabs range={range} onChange={setRange} /></div>
        </div>
        <TrendChart data={data} loading={loading} range={range} />
        <span className="sr-only">Last updated {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'never'}</span>
      </section>
    </div>
  );
}
