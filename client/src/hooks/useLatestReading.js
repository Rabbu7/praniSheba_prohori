import { useState, useEffect } from 'react';
import { getLatestReading } from '../services/api';
import socket from '../services/socket';

export default function useLatestReading() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

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
  }, []);

  return { data, loading, error };
}
