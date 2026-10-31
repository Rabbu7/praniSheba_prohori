import { useCallback, useEffect, useState } from 'react';
import { getAdminManagers } from '../services/api';
export default function useAdminManagers() {
  const [data, setData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const normalize = (value) => value?.managers || value || [];
  const reload = useCallback(async () => { setLoading(true); try { setData(normalize(await getAdminManagers())); setError(null); } catch (err) { setError(err); } finally { setLoading(false); } }, []);
  useEffect(() => { let cancelled = false; getAdminManagers().then((value) => { if (!cancelled) setData(normalize(value)); }).catch((err) => { if (!cancelled) setError(err); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, []);
  return { data, loading, error, reload };
}
