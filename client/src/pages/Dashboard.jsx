import React from 'react';
import useLatestReading from '../hooks/useLatestReading';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import StatusBadge from '../components/common/StatusBadge';
import ReadingsPanel from '../components/dashboard/ReadingsPanel';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

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
  const { data: reading, error } = useLatestReading();

  const isOnline = reading?.created_at
    ? Date.now() - new Date(reading.created_at).getTime() < ONLINE_THRESHOLD_MS
    : false;

  const status = isOnline ? 'online' : 'offline';
  const lastUpdatedDate = reading?.created_at ? new Date(reading.created_at) : null;

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        {/* Sticky Header */}
        <Header deviceId="G3036" status={status} lastUpdated={lastUpdatedDate} />

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
          {error ? (
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

              {/* Right Column: Chart & History Section Placeholder (Stage 7b) */}
              <div className="lg:col-span-9">
                <div className="bg-surface-white border border-[#D1D5DB] rounded-lg p-6 flex items-center justify-center min-h-[400px] text-secondary font-medium">
                  Chart & History Panel Placeholder (Stage 7b)
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
