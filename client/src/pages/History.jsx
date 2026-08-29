import React, { useState } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import HistoryTable from '../components/dashboard/HistoryTable';
import useReadingsLog from '../hooks/useReadingsLog';

export default function History() {
  const [page, setPage] = useState(1);
  const { data, totalPages, loading, error } = useReadingsLog(page, 20);

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        <Header title="Reading Log" />
        <div className="p-container-padding md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
          {error ? (
            <div className="bg-surface-white border border-error/30 rounded-lg p-6 flex flex-col items-center justify-center text-center my-6 shadow-sm">
              <span className="material-symbols-outlined text-error text-4xl mb-2">cloud_off</span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-1">
                Unable to load Reading Log
              </h3>
              <p className="text-secondary text-body-sm max-w-md">
                Please check backend connectivity. Retrying automatically...
              </p>
            </div>
          ) : (
            <HistoryTable
              data={data}
              loading={loading}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      </main>
    </div>
  );
}