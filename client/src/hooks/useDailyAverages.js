import { useEffect, useState } from 'react';
import { getDailyAverages } from '../services/api';

export default function useDailyAverages(range, deviceId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!deviceId) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setData(null);
    setLoading(true);

    const fetchAverages = async () => {
      try {
        const result = await getDailyAverages(range, deviceId);
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

    fetchAverages();

    return () => {
      cancelled = true;
    };
  }, [range, deviceId]);

  return { data, loading, error };
}
