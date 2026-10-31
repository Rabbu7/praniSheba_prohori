import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyDeviceRequests } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export default function useFarmerSync() {
  const { user, token, refreshUser } = useAuth();
  const isFarmer = user?.role === 'farmer';
  const [hasPending, setHasPending] = useState(false);

  const deviceIdsStr = (user?.devices || []).map((d) => d.deviceId).sort().join(',');
  const prevDeviceIdsRef = useRef(deviceIdsStr);

  const checkPending = useCallback(async () => {
    if (!isFarmer || !token) return;
    try {
      const requests = await getMyDeviceRequests();
      const pending = (requests || []).some((r) => r.status === 'pending');
      setHasPending(pending);
    } catch {
      // ignore network errors
    }
  }, [isFarmer, token]);

  // Check pending status on mount and whenever devices change
  useEffect(() => {
    checkPending();
  }, [checkPending, deviceIdsStr]);

  // When the set of user.devices IDs changes, reconnect socket
  useEffect(() => {
    if (!isFarmer || !token) return;
    if (prevDeviceIdsRef.current !== deviceIdsStr) {
      prevDeviceIdsRef.current = deviceIdsStr;
      disconnectSocket();
      if (deviceIdsStr) {
        connectSocket(token);
      }
    }
  }, [isFarmer, token, deviceIdsStr]);

  // While farmer has any pending request, poll /me every 30s and on visibilitychange
  useEffect(() => {
    if (!isFarmer || !hasPending || !token) return undefined;

    const sync = async () => {
      await refreshUser();
      await checkPending();
    };

    const intervalId = setInterval(sync, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFarmer, hasPending, token, refreshUser, checkPending]);
}

