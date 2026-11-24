import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Shell } from './Overview';
import ServerUnreachable from '../../components/common/ServerUnreachable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import useManagerFarmer from '../../hooks/useManagerFarmer';
import useDeviceStatus from '../../hooks/useDeviceStatus';
import { unlinkManagerDevice } from '../../services/api';
import { isServerUnreachable } from '../../utils/isServerUnreachable';
import { useLanguage } from '../../context/LanguageContext';
import { formatRelativeTime } from '../../utils/dateFormatter';

function DeviceRow({ device, farmerId, onUnlink, busy }) {
  const id = device.deviceId;
  const { status, lastUpdated } = useDeviceStatus(id, false);
  const { t, language } = useLanguage();

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border-subtle py-3">
      <Link
        to={`/manager/farmers/${farmerId}/devices/${id}`}
        className="flex flex-1 items-center justify-between gap-3 hover:text-primary"
      >
        <div>
          {device.nickname && (
            <div className="font-semibold text-on-background">{device.nickname}</div>
          )}
          <span className="font-mono text-body-sm">{id}</span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            status === 'online'
              ? 'bg-status-online/10 text-status-online'
              : 'bg-status-offline/10 text-secondary'
          }`}
        >
          {t(`common.${status}`)} · {lastUpdated ? formatRelativeTime(lastUpdated, language, t('common.justNow')) : '—'}
        </span>
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => onUnlink(device)}
        aria-label={t('manager.unlinkDeviceAria', { deviceId: id })}
        title={t('devices.unlink')}
        className="rounded-md p-1.5 text-error hover:bg-error/10 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]">link_off</span>
      </button>
    </div>
  );
}

export default function FarmerDetail() {
  const { farmerId } = useParams();
  const { data, loading, error, reload } = useManagerFarmer(farmerId);
  const { t, translateLocation, translateError } = useLanguage();
  const [unlinking, setUnlinking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');

  const handleUnlink = async () => {
    if (!unlinking) return;
    setBusy(true);
    setUnlinkError('');
    try {
      await unlinkManagerDevice(farmerId, unlinking.deviceId);
      setUnlinking(null);
      await reload();
    } catch (err) {
      setUnlinkError(translateError(err, 'common.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <Shell title={t('manager.farmerDetailsTitle')}>
        {isServerUnreachable(error) ? (
          <ServerUnreachable />
        ) : (
          <p className="rounded-lg border border-border-subtle bg-surface-white p-10 text-center text-secondary">
            {translateError(error, 'manager.noFarmersFound')}
          </p>
        )}
      </Shell>
    );
  }

  const farmerName = data ? `${data.firstName} ${data.lastName}` : '';

  return (
    <Shell title={farmerName || t('manager.farmerDetailsTitle')}>
      {loading ? (
        <p className="p-8 text-center text-secondary">{t('common.loading')}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border-subtle bg-surface-white p-6">
            <h2 className="font-headline-md font-bold">{t('manager.farmerDetailsTitle')}</h2>
            <dl className="mt-5 space-y-3 text-body-sm">
              <div>
                <dt className="text-secondary">{t('manager.farmerName')}</dt>
                <dd className="font-medium text-on-background">{data.firstName} {data.lastName}</dd>
              </div>
              <div>
                <dt className="text-secondary">{t('manager.farmerEmail')}</dt>
                <dd className="text-on-background">{data.email}</dd>
              </div>
              <div>
                <dt className="text-secondary">{t('manager.farmerPhone')}</dt>
                <dd>
                  {data.phone ? (
                    <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`tel:${data.phone}`}>
                      <span className="material-symbols-outlined align-middle text-[18px]">call</span>{' '}
                      {data.phone}
                    </a>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-secondary">{t('auth.district')}, {t('auth.division')}</dt>
                <dd className="text-on-background">{translateLocation(data.district, 'district')}, {translateLocation(data.division, 'division')}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg border border-border-subtle bg-surface-white p-6">
            <h2 className="mb-3 font-headline-md font-bold">{t('manager.farmerDevices')}</h2>
            {unlinkError && <p className="mb-3 rounded-md bg-error/10 p-3 text-xs text-error">{unlinkError}</p>}
            {(data.devices || []).map((device) => (
              <DeviceRow
                key={device.deviceId}
                device={device}
                farmerId={farmerId}
                onUnlink={setUnlinking}
                busy={busy}
              />
            ))}
            {!data.devices?.length && <p className="mt-4 text-secondary">{t('devices.noDevicesMessage')}</p>}
          </section>
        </div>
      )}
      {unlinking && (
        <ConfirmDialog
          title={t('manager.unlinkDeviceTitle', {
            deviceId: unlinking.nickname ? `${unlinking.nickname} (${unlinking.deviceId})` : unlinking.deviceId,
          })}
          message={t('manager.unlinkFarmerDeviceConfirm', {
            deviceId: unlinking.deviceId,
            farmerName,
          })}
          confirmLabel={t('devices.unlink')}
          onCancel={() => setUnlinking(null)}
          onConfirm={handleUnlink}
          busy={busy}
        />
      )}
    </Shell>
  );
}
