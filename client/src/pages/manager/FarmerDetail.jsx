import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Shell } from './Overview';
import ServerUnreachable from '../../components/common/ServerUnreachable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import useManagerFarmer from '../../hooks/useManagerFarmer';
import useDeviceStatus from '../../hooks/useDeviceStatus';
import { unlinkManagerDevice } from '../../services/api';
import { isServerUnreachable } from '../../utils/isServerUnreachable';

function DeviceRow({ device, farmerId, onUnlink, busy }) {
  const id = device.deviceId;
  const { status, lastUpdated } = useDeviceStatus(id, false);
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
          {status} · {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}
        </span>
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => onUnlink(device)}
        aria-label={`Unlink ${id}`}
        title="Unlink device"
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
      setUnlinkError(err.response?.data?.error?.message || 'Unable to unlink device');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <Shell title="Farmer">
        {isServerUnreachable(error) ? (
          <ServerUnreachable />
        ) : (
          <p className="rounded-lg border border-border-subtle bg-surface-white p-10 text-center text-secondary">
            {error.response?.status === 404 ? 'Farmer not found' : (error.response?.data?.error?.message || 'Unable to load farmer')}
          </p>
        )}
      </Shell>
    );
  }

  return (
    <Shell title={data ? `${data.firstName} ${data.lastName}` : 'Farmer'}>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border-subtle bg-surface-white p-6">
            <h2 className="font-headline-md font-bold">Farmer information</h2>
            <dl className="mt-5 space-y-3 text-body-sm">
              <div>
                <dt className="text-secondary">Name</dt>
                <dd>{data.firstName} {data.lastName}</dd>
              </div>
              <div>
                <dt className="text-secondary">Email</dt>
                <dd>{data.email}</dd>
              </div>
              <div>
                <dt className="text-secondary">Phone</dt>
                <dd>
                  {data.phone ? (
                    <a className="text-primary" href={`tel:${data.phone}`}>
                      <span className="material-symbols-outlined align-middle text-[18px]">call</span>{' '}
                      {data.phone}
                    </a>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-secondary">Location</dt>
                <dd>{data.district}, {data.division}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg border border-border-subtle bg-surface-white p-6">
            <h2 className="mb-3 font-headline-md font-bold">Devices</h2>
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
            {!data.devices?.length && <p className="mt-4 text-secondary">No approved devices.</p>}
          </section>
        </div>
      )}
      {unlinking && (
        <ConfirmDialog
          title={`Unlink ${unlinking.nickname ? `${unlinking.nickname} (${unlinking.deviceId})` : unlinking.deviceId}?`}
          message="This removes the device from the farmer's account, resolves open alerts, and allows it to be requested again."
          confirmLabel="Unlink"
          onCancel={() => setUnlinking(null)}
          onConfirm={handleUnlink}
          busy={busy}
        />
      )}
    </Shell>
  );
}
