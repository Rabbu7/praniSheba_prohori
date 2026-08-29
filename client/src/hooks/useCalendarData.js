import { useState, useEffect } from 'react';
import { getCalendarMonth } from '../services/api';

export default function useCalendarData(month) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchMonth = async () => {
      try {
        const result = await getCalendarMonth(month);
        if (!cancelled) {
          setDays(Array.isArray(result) ? result : []);
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
  }, [month]);

  return { days, loading, error };
}
