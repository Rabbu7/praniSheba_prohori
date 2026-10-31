import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Shell } from './Overview';
import useManagerFarmer from '../../hooks/useManagerFarmer';
import DashboardView from '../../components/views/DashboardView';
import HistoryView from '../../components/views/HistoryView';
import CalendarView from '../../components/views/CalendarView';
import socket, { connectSocket, disconnectSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
export default function FarmerDevice() {
  const { farmerId, deviceId } = useParams(); const { token } = useAuth(); const { data: farmer, error } = useManagerFarmer(farmerId); const [tab, setTab] = useState('dashboard');
  useEffect(() => {
    if (!token) return undefined;
    socket.io.opts.reconnection = false;
    connectSocket(token);
    return () => {
      disconnectSocket();
      socket.io.opts.reconnection = true;
    };
  }, [token]);
  const owns = farmer?.devices?.some((device) => device.deviceId === deviceId);
  if (error || (farmer && !owns)) return <Shell title="Device"><p className="rounded-lg border border-border-subtle bg-surface-white p-10 text-center text-secondary">Device not found</p></Shell>;
  return <Shell title="Device"><div className="mb-6 flex flex-wrap items-center gap-3"><Link to={`/manager/farmers/${farmerId}`} className="text-primary hover:underline">← Back to farmer</Link><span className="text-secondary">/</span><div><h1 className="font-headline-lg text-headline-lg font-bold">{farmer?.firstName} {farmer?.lastName}</h1><p className="font-mono text-body-sm text-secondary">{deviceId}</p></div></div><div className="mb-6 flex gap-6 border-b border-border-subtle">{[['dashboard', 'Dashboard'], ['log', 'Reading Log'], ['calendar', 'Calendar']].map(([value, label]) => <button key={value} type="button" className={`border-b-2 px-1 pb-3 text-body-sm font-semibold ${tab === value ? 'border-primary text-primary' : 'border-transparent text-secondary'}`} onClick={() => setTab(value)}>{label}</button>)}</div>{tab === 'dashboard' && <DashboardView deviceId={deviceId} />}{tab === 'log' && <HistoryView deviceId={deviceId} />}{tab === 'calendar' && <CalendarView deviceId={deviceId} />}</Shell>;
}
