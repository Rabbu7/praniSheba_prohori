import { useState, useEffect } from 'react';
import { getLocations } from '../services/api';

let cachedLocations = null;
let pendingPromise = null;

export default function useLocations() {
  const [locations, setLocations] = useState(cachedLocations);
  const [loading, setLoading] = useState(!cachedLocations);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (cachedLocations) {
      setLocations(cachedLocations);
      setLoading(false);
      return undefined;
    }

    if (!pendingPromise) {
      pendingPromise = getLocations()
        .then((data) => {
          cachedLocations = data;
          return data;
        })
        .finally(() => {
          pendingPromise = null;
        });
    }

    pendingPromise
      .then((data) => {
        if (!cancelled) {
          setLocations(data);
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

  return { locations, loading, error };
}

