import { useCallback, useEffect, useRef, useState } from 'react';
import { getAlerts, markAlertRead, markAllAlertsRead } from '../services/api';
import socket from '../services/socket';

export default function useAlerts(enabled = true) {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const alertsRef = useRef(alerts);
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  const fetchAlerts = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await getAlerts({ limit: 10 });
      setAlerts(data.alerts || []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial fetch, 60s interval, and visibilitychange
  useEffect(() => {
    if (!enabled) {
      setAlerts([]);
      setUnreadCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    getAlerts({ limit: 10 })
      .then((data) => {
        if (cancelled) return;
        setAlerts(data.alerts || []);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.error?.message || err.message || 'Failed to fetch alerts');
        setLoading(false);
      });

    const intervalId = setInterval(() => {
      getAlerts({ limit: 10 })
        .then((data) => {
          if (cancelled) return;
          setAlerts(data.alerts || []);
          setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err?.response?.data?.error?.message || err.message || 'Failed to fetch alerts');
        });
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getAlerts({ limit: 10 })
          .then((data) => {
            if (cancelled) return;
            setAlerts(data.alerts || []);
            setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
            setError(null);
          })
          .catch((err) => {
            if (cancelled) return;
            setError(err?.response?.data?.error?.message || err.message || 'Failed to fetch alerts');
          });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  // Socket event listeners
  useEffect(() => {
    if (!enabled) return;

    const handleNewAlert = (alert) => {
      if (!alert || !alert.id) return;
      setAlerts((prev) => {
        if (prev.some((a) => a.id === alert.id)) {
          return prev;
        }
        const nextAlert = { ...alert, read: false };
        return [nextAlert, ...prev].slice(0, 10);
      });
      setUnreadCount((prev) => prev + 1);
    };

    const handleAlertResolved = (payload) => {
      if (!payload || !payload.id) return;
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === payload.id ? { ...a, resolvedAt: payload.resolvedAt } : a
        )
      );
    };

    socket.on('new-alert', handleNewAlert);
    socket.on('alert-resolved', handleAlertResolved);

    return () => {
      socket.off('new-alert', handleNewAlert);
      socket.off('alert-resolved', handleAlertResolved);
    };
  }, [enabled]);

  const markRead = useCallback(
    async (id) => {
      const target = alertsRef.current.find((a) => a.id === id);
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));

      try {
        await markAlertRead(id);
      } catch {
        fetchAlerts();
      }
    },
    [fetchAlerts]
  );

  const markAllRead = useCallback(async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setUnreadCount(0);

    try {
      await markAllAlertsRead();
    } catch {
      fetchAlerts();
    }
  }, [fetchAlerts]);

  return {
    alerts,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    reload: fetchAlerts,
  };
}

