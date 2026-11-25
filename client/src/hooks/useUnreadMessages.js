import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFarmerUnreadMessageCount, getManagerUnreadMessageCount } from '../services/api';
import socket, { connectSocket } from '../services/socket';

export const MESSAGES_READ_EVENT = 'prohori:messages-read';

export function notifyMessagesRead() {
  window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
}

export default function useUnreadMessages(enabled = true) {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const role = user?.role;

  const fetchCount = useCallback(async () => {
    if (!enabled || !token || (role !== 'farmer' && role !== 'manager')) {
      return;
    }
    try {
      if (role === 'farmer') {
        const res = await getFarmerUnreadMessageCount();
        setUnreadCount(res.unreadCount || 0);
      } else if (role === 'manager') {
        const res = await getManagerUnreadMessageCount();
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // ignore network errors
    }
  }, [enabled, token, role]);

  useEffect(() => {
    if (!enabled || !token || (role !== 'farmer' && role !== 'manager')) {
      setUnreadCount(0);
      return;
    }

    // Ensure socket is connected so user room receives new-message events
    connectSocket(token);

    fetchCount();

    const handleNewMessage = (msg) => {
      if (!msg) return;
      if (role === 'farmer' && msg.senderRole === 'manager') {
        setUnreadCount((prev) => prev + 1);
      } else if (role === 'manager' && msg.senderRole === 'farmer') {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleMessagesRead = () => {
      fetchCount();
    };

    socket.on('new-message', handleNewMessage);
    window.addEventListener(MESSAGES_READ_EVENT, handleMessagesRead);

    const intervalId = setInterval(fetchCount, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off('new-message', handleNewMessage);
      window.removeEventListener(MESSAGES_READ_EVENT, handleMessagesRead);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, token, role, fetchCount]);

  return { unreadCount, refresh: fetchCount };
}
