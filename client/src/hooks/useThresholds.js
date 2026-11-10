import { useState, useEffect } from 'react';
import { getThresholds } from '../services/api';

let cachedThresholds = null;
let pendingPromise = null;

export default function useThresholds() {
  const [thresholds, setThresholds] = useState(cachedThresholds);
  const [loading, setLoading] = useState(!cachedThresholds);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (cachedThresholds) {
      setThresholds(cachedThresholds);
      setLoading(false);
      return undefined;
    }

    if (!pendingPromise) {
      pendingPromise = getThresholds()
        .then((data) => {
          cachedThresholds = data;
          return data;
        })
        .finally(() => {
          pendingPromise = null;
        });
    }

    pendingPromise
      .then((data) => {
        if (!cancelled) {
          setThresholds(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { thresholds, loading, error };
}

