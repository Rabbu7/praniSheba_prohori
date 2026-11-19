import { useCallback, useEffect, useState } from 'react';
import { getAdminManagers } from '../services/api';

export default function useAdminManagers(status = 'active') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalize = (value) => value?.managers || value || [];

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(normalize(await getAdminManagers(status)));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminManagers(status)
      .then((value) => {
        if (!cancelled) {
          setData(normalize(value));
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
  }, [status]);

  return { data, loading, error, reload };
}
