import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import MetricCard from '../../components/common/MetricCard';
import ServerUnreachable from '../../components/common/ServerUnreachable';
import useAdminOverview from '../../hooks/useAdminOverview';
import { isServerUnreachable } from '../../utils/isServerUnreachable';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminOverview() {
  const { data, error } = useAdminOverview();
  const { t, translateError } = useLanguage();

  return (
    <div className="flex h-screen overflow-hidden bg-background font-body-sm text-on-background">
      <Sidebar />
      <main className="relative h-full w-full flex-1 overflow-y-auto md:ml-sidebar-width">
        <Header title={t('nav.overview')} showDevice={false} />
        <div className="mx-auto max-w-[1200px] p-container-padding pb-24 md:p-8">
          {error ? (
            isServerUnreachable(error) ? (
              <ServerUnreachable />
            ) : (
              <p className="mb-4 text-error">{translateError(error, 'common.failed')}</p>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label={t('admin.totalManagers')} value={data?.managerCount} icon="group" />
              <MetricCard label={t('admin.totalFarmers')} value={data?.farmerCount} icon="person" tone="tertiary" />
              <MetricCard label={t('admin.totalDevices')} value={data?.deviceCount} icon="devices" tone="online" />
              <MetricCard label={t('admin.unmanagedDistricts')} value={data?.unmanagedDistrictCount} icon="location_on" tone="warning" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
