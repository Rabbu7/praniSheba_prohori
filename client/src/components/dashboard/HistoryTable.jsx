import React from 'react';
import { formatAbsoluteDate } from '../../utils/dateFormatter';

const zoneTextColor = {
  safe: 'text-status-online font-medium',
  warning: 'text-status-warning font-medium',
  danger: 'text-status-danger font-medium',
};

export default function HistoryTable({ data = [], loading = false, page = 1, totalPages = 1, onPageChange = () => {} }) {

  return (
    <div className="bg-surface-white border border-[#D1D5DB] rounded-lg p-6">
      <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-4">
        Readings Log
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-secondary font-label-caps text-label-caps uppercase tracking-wider">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Ammonia (ppm)</th>
              <th className="py-3 px-4">Methane (ppm)</th>
              <th className="py-3 px-4">Humidity (%)</th>
              <th className="py-3 px-4">Temperature (°F)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-body-sm text-body-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-secondary">
                  Loading history…
                </td>
              </tr>
            ) : !Array.isArray(data) || data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-secondary">
                  No readings available
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={row._id || index} className="even:bg-surface-container-low/50 hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-4 font-mono text-on-background">
                    {formatAbsoluteDate(row.created_at)}
                  </td>
                  <td className={`py-3 px-4 ${zoneTextColor[row.ammonia_zone] || 'text-on-background'}`}>
                    {row.ammonia ?? '—'}
                  </td>
                  <td className={`py-3 px-4 ${zoneTextColor[row.methane_zone] || 'text-on-background'}`}>
                    {row.methane ?? '—'}
                  </td>
                  <td className={`py-3 px-4 ${zoneTextColor[row.humidity_zone] || 'text-on-background'}`}>
                    {row.humidity ?? '—'}
                  </td>
                  <td className={`py-3 px-4 ${zoneTextColor[row.temperature_zone] || 'text-on-background'}`}>
                    {row.temperature ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-subtle mt-4 pt-4 text-secondary text-sm">
          <button
            type="button"
            className="px-3 py-2 rounded-md hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            ‹ Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="px-3 py-2 rounded-md hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
