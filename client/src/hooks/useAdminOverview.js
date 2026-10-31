import { useEffect, useState } from 'react';
import { getAdminOverview } from '../services/api';
export default function useAdminOverview() {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  useEffect(() => { let cancelled = false; getAdminOverview().then((value) => { if (!cancelled) setData(value); }).catch((err) => { if (!cancelled) setError(err); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, []);
  return { data, loading, error };
}
