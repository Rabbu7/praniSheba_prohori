import { useCallback, useEffect, useState } from 'react';
import { getManagerFarmers } from '../services/api';
export default function useManagerFarmers() {
  const [data, setData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const normalize = (value) => value?.farmers || value || [];
  const reload = useCallback(async () => { setLoading(true); try { setData(normalize(await getManagerFarmers())); setError(null); } catch (err) { setError(err); } finally { setLoading(false); } }, []);
  useEffect(() => { let cancelled = false; getManagerFarmers().then((value) => { if (!cancelled) { setData(normalize(value)); setError(null); } }).catch((err) => { if (!cancelled) setError(err); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, []);
  return { data, loading, error, reload };
}
