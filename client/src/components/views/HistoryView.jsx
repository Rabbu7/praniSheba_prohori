import React, { useEffect, useState } from 'react';
import useReadingsLog from '../../hooks/useReadingsLog';
import HistoryTable from '../dashboard/HistoryTable';
import ServerUnreachable from '../common/ServerUnreachable';
import { exportReadingsCsv } from '../../services/api';
import { getDhakaToday } from '../../utils/dateFormatter';
import { isServerUnreachable } from '../../utils/isServerUnreachable';
import { useLanguage } from '../../context/LanguageContext';

function formatDhakaDateInput(today, offsetDays = 0) {
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offsetDays));
  return date.toISOString().slice(0, 10);
}

export default function HistoryView({ deviceId }) {
  const { t, translateError } = useLanguage();
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [fromDate, setFromDate] = useState(() => formatDhakaDateInput(getDhakaToday(), -6));
  const [toDate, setToDate] = useState(() => formatDhakaDateInput(getDhakaToday(), 0));
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportNotice, setExportNotice] = useState('');

  useEffect(() => setPage(1), [deviceId]);
  const { data, loading, error } = useReadingsLog(page, 20, deviceId);

  const handleExport = async (e) => {
    e.preventDefault();
    setExportError('');
    setExportNotice('');
    if (!fromDate || !toDate) {
      setExportError(t('log.selectDates'));
      return;
    }
    if (fromDate > toDate) {
      setExportError(t('log.selectDates'));
      return;
    }

    setExportBusy(true);
    try {
      const { blob, headers } = await exportReadingsCsv({
        from: fromDate,
        to: toDate,
        deviceId
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prohori-${deviceId || 'device'}-${fromDate}-to-${toDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      if (headers && headers['x-export-truncated'] === 'true') {
        const cap = headers['x-export-row-cap'] || '5000';
        setExportNotice(t('log.truncatedNotice', { count: cap }));
      }
      setExportOpen(false);
    } catch (err) {
      let message = t('common.failed');
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.error) {
            message = translateError({ response: { data: parsed } });
          }
        } catch {
          // Keep fallback message
        }
      } else if (err.response?.data?.error) {
        message = translateError(err);
      }
      setExportError(message);
    } finally {
      setExportBusy(false);
    }
  };

  if (error) {
    if (isServerUnreachable(error)) {
      return <ServerUnreachable />;
    }
    return (
      <div className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">
        {translateError(error, 'log.noReadingsFound')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {exportNotice ? (
          <p className="text-xs text-secondary">{exportNotice}</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => {
            setExportError('');
            setExportOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-white px-4 py-2 text-body-sm font-semibold text-on-background transition-colors hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            download
          </span>
          {t('log.exportCsv')}
        </button>
      </div>

      <HistoryTable
        data={data?.data || []}
        loading={loading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
      />

      {exportOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sidebar-bg/40 p-4">
          <form
            onSubmit={handleExport}
            className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-white p-6 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md font-bold text-on-background">
                {t('log.exportCsv')}
              </h3>
              <button
                type="button"
                aria-label={t('common.close')}
                disabled={exportBusy}
                onClick={() => setExportOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="mb-4 text-body-sm text-secondary">
              {t('log.rowCapNotice')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-body-sm font-semibold text-on-background">
                {t('log.startDate')}
                <input
                  type="date"
                  required
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
                />
              </label>
              <label className="text-body-sm font-semibold text-on-background">
                {t('log.endDate')}
                <input
                  type="date"
                  required
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
                />
              </label>
            </div>
            {exportError && <p className="mt-3 text-xs text-error">{exportError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={exportBusy}
                onClick={() => setExportOpen(false)}
                className="rounded-md border border-border-subtle px-4 py-2 text-body-sm font-semibold text-on-background"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={exportBusy}
                className="rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary disabled:opacity-50"
              >
                {exportBusy ? t('log.exporting') : t('log.exportCsv')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
