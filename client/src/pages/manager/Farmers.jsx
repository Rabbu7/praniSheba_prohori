import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from './Overview';
import ServerUnreachable from '../../components/common/ServerUnreachable';
import useManagerFarmers from '../../hooks/useManagerFarmers';
import { isServerUnreachable } from '../../utils/isServerUnreachable';
import { useLanguage } from '../../context/LanguageContext';

export default function Farmers() {
  const { data, loading, error } = useManagerFarmers();
  const { t, translateError } = useLanguage();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      data.filter((farmer) =>
        `${farmer.firstName} ${farmer.lastName} ${farmer.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data, query],
  );

  if (error) {
    return (
      <Shell title={t('nav.farmers')}>
        {isServerUnreachable(error) ? (
          <ServerUnreachable />
        ) : (
          <p className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">
            {translateError(error, 'manager.noFarmersFound')}
          </p>
        )}
      </Shell>
    );
  }

  return (
    <Shell title={t('nav.farmers')}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-headline-lg text-headline-lg font-bold">
          {t('manager.farmersList')}
        </h1>
        <label className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-white px-3 py-2">
          <span className="material-symbols-outlined text-secondary">search</span>
          <input
            aria-label={t('common.search')}
            className="w-full bg-transparent outline-none"
            placeholder={t('common.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-white">
        <table className="w-full text-left text-body-sm">
          <thead className="bg-surface-container-low text-label-caps uppercase text-secondary">
            <tr>
              <th className="p-4">{t('manager.farmerName')}</th>
              <th className="p-4">{t('manager.farmerEmail')}</th>
              <th className="p-4">{t('manager.farmerPhone')}</th>
              <th className="p-4">{t('manager.farmerDevices')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((farmer) => (
              <tr
                key={farmer.id}
                className="cursor-pointer border-t border-border-subtle hover:bg-surface-container-low"
              >
                <td className="p-4">
                  <Link className="font-semibold text-primary hover:underline" to={`/manager/farmers/${farmer.id}`}>
                    {farmer.firstName} {farmer.lastName}
                  </Link>
                </td>
                <td className="p-4 text-secondary">{farmer.email}</td>
                <td className="p-4">
                  {farmer.phone ? (
                    <a
                      href={`tel:${farmer.phone}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[18px]">call</span>
                      {farmer.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-4 font-medium">{farmer.deviceCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="p-8 text-center text-secondary">{t('manager.noFarmersFound')}</p>
        )}
      </div>
    </Shell>
  );
}
