import React, { useEffect, useState } from 'react';
import useReadingsLog from '../../hooks/useReadingsLog';
import HistoryTable from '../dashboard/HistoryTable';
export default function HistoryView({ deviceId }) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [deviceId]);
  const { data, loading, error } = useReadingsLog(page, 20, deviceId);
  if (error) return <div className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">Unable to load Reading Log</div>;
  return <HistoryTable data={data?.data || []} loading={loading} page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />;
}
