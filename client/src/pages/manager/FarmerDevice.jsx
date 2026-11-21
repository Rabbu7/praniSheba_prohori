import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Shell } from './Overview';
import useManagerFarmer from '../../hooks/useManagerFarmer';
import DashboardView from '../../components/views/DashboardView';
import HistoryView from '../../components/views/HistoryView';
import CalendarView from '../../components/views/CalendarView';
import socket, { connectSocket, disconnectSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function FarmerDevice() {
  const { farmerId, deviceId } = useParams();
  const { token } = useAuth();
  const { t } = useLanguage();
  const { data: farmer, error } = useManagerFarmer(farmerId);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    if (!token) return undefined;
    socket.io.opts.reconnection = false;
    connectSocket(token);
    return () => {
      disconnectSocket();
      socket.io.opts.reconnection = true;
    };
  }, [token]);

  const linkedDevice = farmer?.devices?.find((device) => device.deviceId === deviceId);

  if (error || (farmer && !linkedDevice)) {
    return (
      <Shell title={t('dashboard.deviceStatus')}>
        <p className="rounded-lg border border-border-subtle bg-surface-white p-10 text-center text-secondary">
          {t('errors.DEVICE_NOT_FOUND')}
        </p>
      </Shell>
    );
  }

  const tabs = [
    ['dashboard', t('nav.dashboard')],
    ['log', t('nav.readingLog')],
    ['calendar', t('nav.calendar')],
  ];

  return (
    <Shell title={t('dashboard.deviceStatus')}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to={`/manager/farmers/${farmerId}`} className="text-primary hover:underline">
          ← {t('common.back')}
        </Link>
        <span className="text-secondary">/</span>
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold">
            {farmer?.firstName} {farmer?.lastName}
          </h1>
          <p className="text-body-sm text-secondary">
            {linkedDevice?.nickname ? (
              <>
                <span className="font-semibold text-on-background">{linkedDevice.nickname}</span> · <span className="font-mono">{deviceId}</span>
              </>
            ) : (
              <span className="font-mono">{deviceId}</span>
            )}
          </p>
        </div>
      </div>
      <div className="mb-6 flex gap-6 border-b border-border-subtle">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`border-b-2 px-1 pb-3 text-body-sm font-semibold transition-colors cursor-pointer ${
              tab === value ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-background'
            }`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <DashboardView deviceId={deviceId} />}
      {tab === 'log' && <HistoryView deviceId={deviceId} />}
      {tab === 'calendar' && <CalendarView deviceId={deviceId} />}
    </Shell>
  );
}
