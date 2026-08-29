import { useState, useEffect } from 'react';
import { getDayDetail } from '../services/api';

export default function useDayDetail(date) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchDetail = async () => {
      try {
        const result = await getDayDetail(date);
        if (!cancelled) {
          setDetail(result);
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
  }, [date]);

  return { detail, loading, error };
}
