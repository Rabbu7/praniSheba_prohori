import React, { useState } from 'react';
import useDeviceStatus from '../hooks/useDeviceStatus';
import useReadingsHistory from '../hooks/useReadingsHistory';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import StatusBadge from '../components/common/StatusBadge';
import ReadingsPanel from '../components/dashboard/ReadingsPanel';
import HistoryTabs from '../components/dashboard/HistoryTabs';
import TrendChart from '../components/dashboard/TrendChart';

function formatRelativeTime(date) {
  if (!date) return '—';
  const now = new Date();
  const updated = new Date(date);
  const diffInSeconds = Math.floor((now - updated) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 60) return 'Just now';
  const mins = Math.floor(diffInSeconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Dashboard() {
  const { reading, status, lastUpdated: lastUpdatedDate, error: latestError } = useDeviceStatus();
  const [range, setRange] = useState('7d');
  const { data: historyData, loading: historyLoading } = useReadingsHistory(range);

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        {/* Sticky Header */}
        <Header title="Dashboard" deviceId="G3036" status={status} lastUpdated={lastUpdatedDate} />

        {/* Content Container */}
        <div className="p-container-padding md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
          {/* Mobile Header Sub-Bar */}
          <div className="md:hidden flex flex-col gap-2 mb-stack-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md font-bold text-on-background">Dashboard</h2>
              <StatusBadge status={status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body-sm text-body-sm text-secondary">Device: G3036</span>
              <span className="font-body-sm text-body-sm text-secondary font-medium">
                Updated: {formatRelativeTime(lastUpdatedDate)}
              </span>
            </div>
          </div>

          {/* Inline Error State Handling */}
          {latestError ? (
            <div className="bg-surface-white border border-error/30 rounded-lg p-6 flex flex-col items-center justify-center text-center my-6 shadow-sm">
              <span className="material-symbols-outlined text-error text-4xl mb-2">cloud_off</span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-1">
                Unable to reach Prohori server
              </h3>
              <p className="text-secondary text-body-sm max-w-md">
                Please check backend connectivity or network connection. Re-trying automatically...
              </p>
            </div>
          ) : (
            /* Main Grid Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Current Readings Grid */}
              <div className="lg:col-span-3">
                <ReadingsPanel reading={reading} />
              </div>

              {/* Right Column: Analysis Panel (Chart + History Log) */}
              <div className="lg:col-span-9 space-y-6">
                {/* Trend Chart Section */}
                <section className="bg-surface-white border border-[#D1D5DB] rounded-lg p-6 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline-md text-headline-md font-bold text-on-background flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">monitoring</span>
                      Environmental Trends Analysis
                    </h3>
                    <HistoryTabs range={range} onChange={setRange} />
                  </div>
                  <TrendChart data={historyData} loading={historyLoading} range={range} />
                </section>

              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
