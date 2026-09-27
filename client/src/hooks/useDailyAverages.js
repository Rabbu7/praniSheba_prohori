import { useEffect, useState } from 'react';
import { getDailyAverages } from '../services/api';

export default function useDailyAverages(range) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchAverages = async () => {
      try {
        const result = await getDailyAverages(range);
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
  }, [range]);

  return { data, loading, error };
}
