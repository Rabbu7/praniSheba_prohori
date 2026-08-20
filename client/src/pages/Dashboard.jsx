import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import SensorCard from '../components/dashboard/SensorCard';

export default function Dashboard() {
  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        {/* Sticky Header */}
        <Header deviceId="G3036" status="online" lastUpdated="2 mins ago" />

        {/* Content Container */}
        <div className="p-container-padding md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
          {/* Mobile Header Sub-Bar */}
          <div className="md:hidden flex flex-col gap-2 mb-stack-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md font-bold text-on-background">Dashboard</h2>
              <span className="flex items-center px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-status-online mr-1.5 animate-glow-pulse"></span>
                Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body-sm text-body-sm text-secondary">Device: G3036</span>
              <span className="font-body-sm text-body-sm text-secondary font-medium">Updated: 2 mins ago</span>
            </div>
          </div>

          {/* Main Grid Layout for Mock Verification */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: 4 Sensor Cards rendered in isolation */}
            <div className="lg:col-span-3 space-y-4">
              <SensorCard
                label="Ammonia (NH3)"
                value={12.4}
                unit="ppm"
                zone="warning"
                icon="science"
                trend={{ direction: 'up', delta: 1.2, message: 'vs last hour' }}
              />

              <SensorCard
                label="Methane (CH4)"
                value={4.1}
                unit="ppm"
                zone="safe"
                icon="co2"
                trend="Stable trend detected"
              />

              <SensorCard
                label="Humidity"
                value={68}
                unit="%"
                zone="safe"
                icon="water_drop"
                trend="Within target: 60-70%"
              />

              <SensorCard
                label="Temperature"
                value={74.2}
                unit="°F"
                zone="safe"
                icon="thermostat"
                trend="Optimal conditions"
              />
            </div>

            {/* Right Column: Placeholder for future chart/table */}
            <div className="lg:col-span-9">
              <div className="bg-surface-white border border-[#D1D5DB] rounded-lg p-6 flex items-center justify-center min-h-[400px] text-secondary font-medium">
                Chart & History Panel Placeholder
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
