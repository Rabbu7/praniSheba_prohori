import { useState, useEffect, useRef } from 'react';
import { getLatestReading } from '../services/api';
import socket, { connectSocket, disconnectSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';

export default function useLatestReading(deviceIdOverride, connect = true) {
  const { token, refreshUser } = useAuth();
  const { devices, selectedDeviceId } = useDevice();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshedForDeviceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const deviceId = deviceIdOverride || selectedDeviceId;
    if (!token || (!deviceIdOverride && devices.length === 0)) {
      disconnectSocket();
      setData(null);
      setLoading(false);
      return undefined;
    }

    if (connect) connectSocket(token);

    if (!deviceId) {
      setData(null);
      setLoading(false);
      return undefined;
    }

    setData(null);
    setLoading(true);

    const fetchLatest = async () => {
      try {
        const result = await getLatestReading(deviceId);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          const code = err.response?.data?.error?.code;
          if (
            err.response?.status === 403
            && (code === 'DEVICE_NOT_FOUND' || code === 'NO_DEVICE_LINKED')
            && refreshedForDeviceRef.current !== deviceId
          ) {
            refreshedForDeviceRef.current = deviceId;
            refreshUser();
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const handleNewReading = (payload) => {
      if (!cancelled && payload?.device_id === deviceId) {
        setData(payload);
        setError(null);
      }
    };

    fetchLatest();
    socket.on('new-reading', handleNewReading);

    return () => {
      cancelled = true;
      socket.off('new-reading', handleNewReading);
    };
  }, [token, selectedDeviceId, devices.length, deviceIdOverride, connect, refreshUser]);

  return { data, loading, error };
}
