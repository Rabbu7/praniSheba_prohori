import { useState, useEffect } from 'react';
import { getReadingsLog } from '../services/api';

export default function useReadingsLog(page = 1, limit = 20, deviceId) {
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

    const fetchLog = async () => {
      try {
        const result = await getReadingsLog(page, limit, deviceId);
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

    fetchLog();

    return () => {
      cancelled = true;
    };
  }, [page, limit, deviceId]);

  return { data, loading, error };
}
