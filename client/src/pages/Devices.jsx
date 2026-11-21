import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import RequestStatusBadge from '../components/common/RequestStatusBadge';
import RequestDeviceModal from '../components/devices/RequestDeviceModal';
import ServerUnreachable from '../components/common/ServerUnreachable';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { useLanguage } from '../context/LanguageContext';
import { notifyDeviceRequestCreated } from '../hooks/useFarmerSync';
import { getMyDeviceRequests, updateDeviceNickname } from '../services/api';
import { formatAbsoluteDate } from '../utils/dateFormatter';
import { isServerUnreachable } from '../utils/isServerUnreachable';

export default function Devices() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { selectDevice } = useDevice();
  const { t, language, translateError } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [showRequestSentBanner, setShowRequestSentBanner] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameBusy, setNicknameBusy] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  const deviceKey = user?.devices?.map((d) => d.deviceId).sort().join(',') || '';

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getMyDeviceRequests();
      setRequests(data || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [deviceKey]);

  useEffect(() => {
    if (!location.state?.openRequest) return;

    setRequestModalOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  // Merge in user.devices that have no approved request record
  const userDevices = user?.devices || [];
  const syntheticApproved = userDevices
    .filter((ud) => !requests.some((r) => r.deviceId === ud.deviceId && r.status === 'approved'))
    .map((ud) => ({
      id: `approved-${ud.deviceId}`,
      deviceId: ud.deviceId,
      status: 'approved',
      requestedAt: ud.linkedAt || user?.createdAt || new Date().toISOString(),
      decidedAt: ud.linkedAt || null,
      note: null,
    }));

  const allItems = [...requests, ...syntheticApproved].sort((a, b) => {
    const timeA = new Date(a.requestedAt || 0).getTime();
    const timeB = new Date(b.requestedAt || 0).getTime();
    return timeB - timeA;
  });

  // Dedupe by deviceId, newest first
  const seenDeviceIds = new Set();
  const dedupedItems = [];
  for (const item of allItems) {
    if (!seenDeviceIds.has(item.deviceId)) {
      seenDeviceIds.add(item.deviceId);
      dedupedItems.push(item);
    }
  }

  const handleOpenDashboard = (deviceId) => {
    selectDevice(deviceId);
    navigate('/');
  };

  const hasApprovedDevices = userDevices.length > 0;
  const isUnmanagedDistrict = !user?.manager;
  const nicknameByDeviceId = new Map(userDevices.map((d) => [d.deviceId, d.nickname || '']));

  const openNicknameModal = (deviceId) => {
    setEditingDevice(deviceId);
    setNicknameInput(nicknameByDeviceId.get(deviceId) || '');
    setNicknameError('');
  };

  const saveNickname = async (e) => {
    e.preventDefault();
    if (!editingDevice) return;
    setNicknameBusy(true);
    setNicknameError('');
    try {
      const updatedUser = await updateDeviceNickname(editingDevice, nicknameInput.trim());
      setUser(updatedUser);
      setEditingDevice(null);
    } catch (err) {
      setNicknameError(translateError(err, 'errors.UNKNOWN_ERROR'));
    } finally {
      setNicknameBusy(false);
    }
  };

  const handleRequestSuccess = () => {
    setShowRequestSentBanner(true);
    loadRequests();
    notifyDeviceRequestCreated();
  };

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        <Header title={t('devices.title')} showDevice={hasApprovedDevices} />

        <div className="p-container-padding md:p-8 max-w-[1200px] mx-auto pb-24 md:pb-8">
          {/* Header Action row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="font-headline-md text-headline-md font-bold text-on-background">
                {t('devices.title')}
              </h2>
              <p className="text-secondary text-body-sm mt-1">
                {t('devices.subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>{t('devices.linkNewDevice')}</span>
            </button>
          </div>

          {/* Request sent success banner */}
          {showRequestSentBanner && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary-fixed/30 p-4 text-on-primary-fixed flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">check</span>
              <span className="text-body-sm font-medium">
                {t('devices.requestSuccess')}
              </span>
            </div>
          )}

          {/* Unmanaged district info banner */}
          {isUnmanagedDistrict && (
            <div className="mb-6 rounded-lg border border-status-warning/30 bg-amber-50 p-4 text-amber-900 flex items-center gap-3">
              <span className="material-symbols-outlined text-status-warning">info</span>
              <span className="text-body-sm font-medium">
                {t('profile.noManagerAssigned')}
              </span>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-6">
              {isServerUnreachable(error) ? (
                <ServerUnreachable onRetry={loadRequests} />
              ) : (
                <div className="rounded-lg border border-error/30 bg-error-container p-4 text-on-error-container text-body-sm">
                  {translateError(error, 'errors.UNKNOWN_ERROR')}
                </div>
              )}
            </div>
          )}

          {/* Device list / Table */}
          {loading ? (
            <div className="bg-surface-white border border-border-subtle rounded-lg p-12 text-center text-secondary text-body-sm">
              {t('common.loading')}
            </div>
          ) : dedupedItems.length === 0 ? (
            <div className="bg-surface-white border border-border-subtle rounded-lg p-12 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-secondary text-5xl mb-3">devices</span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-1">
                {t('devices.noDevicesMessage')}
              </h3>
              <p className="text-secondary text-body-sm max-w-sm mb-6">
                {t('devices.requestDeviceSubtitle')}
              </p>
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>{t('devices.linkNewDevice')}</span>
              </button>
            </div>
          ) : (
            <div className="bg-surface-white border border-border-subtle rounded-lg overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-container-low text-xs font-semibold text-secondary uppercase tracking-wider">
                      <th className="py-3 px-4">{t('devices.deviceIdLabel')}</th>
                      <th className="py-3 px-4">{t('devices.linkedAt')}</th>
                      <th className="py-3 px-4">{t('common.status')}</th>
                      <th className="py-3 px-4">{t('manager.note')}</th>
                      <th className="py-3 px-4 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {dedupedItems.map((item) => {
                      const nickname = nicknameByDeviceId.get(item.deviceId) || '';
                      return (
                      <tr key={item.id || item.deviceId} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              {nickname && (
                                <div className="font-semibold text-on-background">
                                  {nickname}
                                </div>
                              )}
                              <div className="font-mono font-bold text-on-background">
                                {item.deviceId}
                              </div>
                            </div>
                            {item.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => openNicknameModal(item.deviceId)}
                                aria-label={`Edit nickname for ${item.deviceId}`}
                                className="rounded p-1 text-secondary hover:bg-surface-container-low hover:text-primary transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-secondary text-body-sm">
                          {formatAbsoluteDate(item.requestedAt, language)}
                        </td>
                        <td className="py-4 px-4">
                          <RequestStatusBadge status={item.status} />
                        </td>
                        <td className="py-4 px-4 text-secondary text-body-sm">
                          {item.note || '—'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {item.status === 'approved' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDashboard(item.deviceId)}
                              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container transition-colors cursor-pointer"
                            >
                              <span>{t('devices.openDashboard')}</span>
                            </button>
                          ) : (
                            <span className="text-secondary text-xs">—</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <RequestDeviceModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={handleRequestSuccess}
      />
      {editingDevice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sidebar-bg/40 p-4">
          <form
            onSubmit={saveNickname}
            className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-white p-6 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md font-bold text-on-background">
                {t('devices.editNicknameTitle')}
              </h3>
              <button
                type="button"
                aria-label={t('common.close')}
                disabled={nicknameBusy}
                onClick={() => setEditingDevice(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="mb-3 font-mono text-xs text-secondary">{editingDevice}</p>
            <label className="block text-body-sm font-semibold text-on-background">
              {t('devices.editNickname')}
              <input
                type="text"
                maxLength={50}
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder={t('devices.nicknamePlaceholder')}
                className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
              />
            </label>
            {nicknameError && <p className="mt-3 text-xs text-error">{nicknameError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={nicknameBusy}
                onClick={() => setEditingDevice(null)}
                className="rounded-md border border-border-subtle px-4 py-2 text-body-sm font-semibold text-on-background"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={nicknameBusy}
                className="rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary disabled:opacity-50"
              >
                {nicknameBusy ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
