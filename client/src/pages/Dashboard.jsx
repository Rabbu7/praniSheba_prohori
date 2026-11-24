import React from 'react';
import { useDevice } from '../context/DeviceContext';
import { useLanguage } from '../context/LanguageContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import DashboardView from '../components/views/DashboardView';
import useDeviceStatus from '../hooks/useDeviceStatus';

export default function Dashboard() {
  const { selectedDeviceId } = useDevice();
  const { status, lastUpdated } = useDeviceStatus();
  const { t } = useLanguage();

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-sidebar-width h-full overflow-y-auto w-full bg-background relative">
        {/* Sticky Header */}
        <Header title={t('nav.dashboard')} status={status} lastUpdated={lastUpdated} />

        {/* Content Container */}
        <div className="p-container-padding md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
          <DashboardView deviceId={selectedDeviceId} />
        </div>
      </main>
    </div>
  );
}
