import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SELECTED_DEVICE_KEY = 'prohori_selected_device';

const DeviceContext = createContext(null);

export function DeviceProvider({ children }) {
  const { user, token } = useAuth();
  const devices = user?.devices ?? [];

  const [preferredId, setPreferredId] = useState(() => localStorage.getItem(SELECTED_DEVICE_KEY));

  useEffect(() => {
    if (!token) {
      setPreferredId(null);
    }
  }, [token]);

  const isPreferredInDevices = Boolean(
    preferredId && devices.some((device) => device.deviceId === preferredId)
  );

  const selectedDeviceId = isPreferredInDevices
    ? preferredId
    : (devices[0]?.deviceId ?? null);

  const selectDevice = (id) => {
    setPreferredId(id);
    if (id) {
      localStorage.setItem(SELECTED_DEVICE_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_DEVICE_KEY);
    }
  };

  return (
    <DeviceContext.Provider value={{ devices, selectedDeviceId, selectDevice }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
