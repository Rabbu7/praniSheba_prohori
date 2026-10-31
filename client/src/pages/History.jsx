import React from 'react';
import { useDevice } from '../context/DeviceContext';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import useDeviceStatus from '../hooks/useDeviceStatus';
import HistoryView from '../components/views/HistoryView';

export default function History() {
  const { selectedDeviceId } = useDevice();
  const { status, lastUpdated } = useDeviceStatus();

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        <Header title="Reading Log" status={status} lastUpdated={lastUpdated} mobileSwitcher />
        <div className="p-container-padding md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
          <HistoryView deviceId={selectedDeviceId} />
        </div>
      </main>
    </div>
  );
}