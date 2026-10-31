import { useCallback, useEffect, useState } from 'react';
import { getManagerRequests } from '../services/api';
export default function useManagerRequests(status) {
  const [data, setData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const normalize = (value) => value?.requests || value || [];
  const reload = useCallback(async () => { setLoading(true); try { setData(normalize(await getManagerRequests(status))); setError(null); } catch (err) { setError(err); } finally { setLoading(false); } }, [status]);
  useEffect(() => { let cancelled = false; getManagerRequests(status).then((value) => { if (!cancelled) { setData(normalize(value)); setError(null); } }).catch((err) => { if (!cancelled) setError(err); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [status]);
  return { data, loading, error, reload };
}
