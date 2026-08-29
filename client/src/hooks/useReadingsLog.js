import { useState, useEffect } from 'react';
import { getReadingsLog } from '../services/api';

export default function useReadingsLog(page = 1, limit = 20) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchLog = async () => {
      try {
        const result = await getReadingsLog(page, limit);
        if (!cancelled) {
          setData(result.data || []);
          setTotalPages(result.totalPages || 1);
          setTotal(result.total || 0);
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
  }, [page, limit]);

  return { data, page, totalPages, total, loading, error };
}
