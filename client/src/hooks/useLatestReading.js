import { useState, useEffect } from 'react';
import { getLatestReading } from '../services/api';
import socket, { connectSocket, disconnectSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

export default function useLatestReading() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const deviceId = user?.device?.deviceId;

  useEffect(() => {
    let cancelled = false;

    if (!token || !deviceId) {
      disconnectSocket();
      setData(null);
      setLoading(false);
      return undefined;
    }

    connectSocket(token);

    const fetchLatest = async () => {
      try {
        const result = await getLatestReading();
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
      if (!cancelled) {
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
  }, [token, deviceId]);

  return { data, loading, error };
}
