import { useCallback, useEffect, useState } from 'react';
import { getManagerFarmer } from '../services/api';

export default function useManagerFarmer(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const value = await getManagerFarmer(id);
      setData(value);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    getManagerFarmer(id)
      .then((value) => {
        if (!cancelled) {
          setData(value);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, loading, error, reload };
}
