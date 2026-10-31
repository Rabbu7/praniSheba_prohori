import { useCallback, useEffect, useState } from 'react';
import { getManagerOverview } from '../services/api';

export default function useManagerOverview(enabled = true) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const reload = useCallback(async () => { if (!enabled) return; setLoading(true); try { setData(await getManagerOverview()); setError(null); } catch (err) { setError(err); } finally { setLoading(false); } }, [enabled]);
  useEffect(() => { let cancelled = false; if (!enabled) { setLoading(false); return undefined; } getManagerOverview().then((value) => { if (!cancelled) { setData(value); setError(null); } }).catch((err) => { if (!cancelled) setError(err); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [enabled]);
  return { data, loading, error, reload };
}
