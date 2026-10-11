import { useState, useEffect } from 'react';
import { getCalendarMonth } from '../services/api';

export default function useCalendarData(month, deviceId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!deviceId) {
      setData([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setData([]);
    setLoading(true);

    const fetchMonth = async () => {
      try {
        const result = await getCalendarMonth(month, deviceId);
        if (!cancelled) {
          setData(Array.isArray(result) ? result : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMonth();

    return () => {
      cancelled = true;
    };
  }, [month, deviceId]);

  return { data, loading, error };
}
