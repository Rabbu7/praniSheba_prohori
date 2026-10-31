import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import MetricCard from '../../components/common/MetricCard';
import useManagerOverview from '../../hooks/useManagerOverview';
import useManagerRequests from '../../hooks/useManagerRequests';
import { formatDate } from '../../utils/dateFormatter';
import { useAuth } from '../../context/AuthContext';

export default function ManagerOverview() {
  const { user } = useAuth(); const overview = useManagerOverview(); const requests = useManagerRequests('pending');
  return <Shell title="Overview"><p className="mb-6 text-body-sm text-secondary">{user?.district} · {user?.division} Division</p><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><MetricCard label="Farmers" value={overview.data?.farmerCount} icon="person" /><MetricCard label="Devices" value={overview.data?.deviceCount} icon="devices" tone="online" /><MetricCard label="Pending requests" value={overview.data?.pendingRequestCount} icon="pending_actions" tone="warning" /></div><section className="mt-8 rounded-lg border border-border-subtle bg-surface-white p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-headline-md text-headline-md font-bold">Pending requests</h2><Link className="text-body-sm font-semibold text-primary hover:underline" to="/manager/requests">View all</Link></div>{requests.data.slice(0, 5).map((request) => <div key={request.id || request._id} className="flex flex-wrap justify-between gap-2 border-t border-border-subtle py-3 text-body-sm"><span>{request.farmer?.firstName} {request.farmer?.lastName}</span><span className="font-mono text-secondary">{request.deviceId}</span><span className="text-secondary">{formatDate(request.requestedAt)}</span></div>)}{!requests.loading && requests.data.length === 0 && <p className="text-body-sm text-secondary">No pending requests</p>}</section></Shell>;
}
function Shell({ title, children }) { return <div className="flex h-screen overflow-hidden bg-background font-body-sm text-on-background"><Sidebar /><main className="relative mt-[64px] h-full w-full flex-1 overflow-y-auto md:ml-sidebar-width md:mt-0"><Header title={title} showDevice={false} /><div className="mx-auto max-w-[1200px] p-container-padding pb-24 md:p-8">{children}</div></main></div>; }
export { Shell };
