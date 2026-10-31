import { useState, useEffect } from 'react';
import { getLatestReading } from '../services/api';
import socket, { connectSocket, disconnectSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';

export default function useLatestReading(deviceIdOverride, connect = true) {
  const { token } = useAuth();
  const { devices, selectedDeviceId } = useDevice();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        if (!cancelled) setError(err);
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
  }, [token, selectedDeviceId, devices.length, deviceIdOverride, connect]);

  return { data, loading, error };
}
