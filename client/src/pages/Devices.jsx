import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import RequestStatusBadge from '../components/common/RequestStatusBadge';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { getMyDeviceRequests } from '../services/api';
import { formatAbsoluteDate } from '../utils/dateFormatter';

export default function Devices() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectDevice } = useDevice();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const deviceKey = user?.devices?.map((d) => d.deviceId).sort().join(',') || '';

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getMyDeviceRequests();
      setRequests(data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load device requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [deviceKey]);

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
  const showRequestSentBanner = Boolean(location.state?.requestSent);

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        <Header title="My Devices" showDevice={hasApprovedDevices} />

        <div className="p-container-padding md:p-8 max-w-[1200px] mx-auto pb-24 md:pb-8">
          {/* Header Action row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="font-headline-md text-headline-md font-bold text-on-background">
                My Devices
              </h2>
              <p className="text-secondary text-body-sm mt-1">
                Manage your Prohori monitors and view device request statuses.
              </p>
            </div>
            <Link
              to="/link-device"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Request device</span>
            </Link>
          </div>

          {/* Request sent success banner */}
          {showRequestSentBanner && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary-fixed/30 p-4 text-on-primary-fixed flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">check</span>
              <span className="text-body-sm font-medium">
                Request sent. Your manager will review it.
              </span>
            </div>
          )}

          {/* Unmanaged district info banner */}
          {isUnmanagedDistrict && (
            <div className="mb-6 rounded-lg border border-status-warning/30 bg-amber-50 p-4 text-amber-900 flex items-center gap-3">
              <span className="material-symbols-outlined text-status-warning">info</span>
              <span className="text-body-sm font-medium">
                No manager is assigned to your district yet. Your requests will be reviewed once a manager is available.
              </span>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-6 rounded-lg border border-error/30 bg-error-container p-4 text-on-error-container text-body-sm">
              {error}
            </div>
          )}

          {/* Device list / Table */}
          {loading ? (
            <div className="bg-surface-white border border-border-subtle rounded-lg p-12 text-center text-secondary text-body-sm">
              Loading devices...
            </div>
          ) : dedupedItems.length === 0 ? (
            <div className="bg-surface-white border border-border-subtle rounded-lg p-12 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-secondary text-5xl mb-3">devices</span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-1">
                You have no devices yet.
              </h3>
              <p className="text-secondary text-body-sm max-w-sm mb-6">
                Request a Prohori sensor device using its device ID and security code.
              </p>
              <Link
                to="/link-device"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Request device</span>
              </Link>
            </div>
          ) : (
            <div className="bg-surface-white border border-border-subtle rounded-lg overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-container-low text-xs font-semibold text-secondary uppercase tracking-wider">
                      <th className="py-3 px-4">Device ID</th>
                      <th className="py-3 px-4">Requested on</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Note</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {dedupedItems.map((item) => (
                      <tr key={item.id || item.deviceId} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-on-background">
                          {item.deviceId}
                        </td>
                        <td className="py-4 px-4 text-secondary text-body-sm">
                          {formatAbsoluteDate(item.requestedAt)}
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
                              <span>Open dashboard</span>
                            </button>
                          ) : (
                            <span className="text-secondary text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

