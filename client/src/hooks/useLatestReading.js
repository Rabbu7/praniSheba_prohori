import { useState, useEffect } from 'react';
import { getLatestReading } from '../services/api';

const POLL_INTERVAL_MS = 12000;

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
        // Only clear loading on the very first fetch
        if (!cancelled) setLoading(false);
      }
    };

    fetchLatest();

    const interval = setInterval(fetchLatest, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}
