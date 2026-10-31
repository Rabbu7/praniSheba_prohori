import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

export default function AdminOverview({ title = 'Overview' }) {
  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        <Header title={title} showDevice={false} />

        <div className="p-container-padding md:p-8 max-w-[1200px] mx-auto pb-24 md:pb-8">
          <div className="bg-surface-white border border-border-subtle rounded-lg p-12 text-center">
            <h2 className="font-headline-md text-headline-md font-bold text-on-background mb-2">
              {title}
            </h2>
            <p className="text-secondary text-body-sm">
              Coming in the next stage
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

