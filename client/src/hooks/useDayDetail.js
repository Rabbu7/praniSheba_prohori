import { useState, useEffect } from 'react';
import { getDayDetail } from '../services/api';

export default function useDayDetail(date, deviceId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date || !deviceId) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setData(null);
    setLoading(true);

    const fetchDetail = async () => {
      try {
        const result = await getDayDetail(date, deviceId);
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

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [date, deviceId]);

  return { data, loading, error };
}
