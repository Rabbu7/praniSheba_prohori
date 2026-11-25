import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getFarmerMessages,
  getManagerFarmerMessages,
  markFarmerMessagesRead,
  markManagerFarmerMessagesRead,
  sendFarmerMessage,
  sendManagerFarmerMessage
} from '../services/api';
import socket, { connectSocket } from '../services/socket';
import { notifyMessagesRead } from './useUnreadMessages';

export default function useMessageThread({ farmerId = null, role = 'farmer' } = {}) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const isFarmer = role === 'farmer';
  const effectiveFarmerId = isFarmer ? (user?._id || user?.id) : farmerId;

  // Load initial messages
  const loadInitial = useCallback(async () => {
    if (!token) return;
    if (!isFarmer && !farmerId) return;

    setLoading(true);
    setError(null);
    try {
      if (isFarmer) {
        const data = await getFarmerMessages({ limit: 30 });
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
        setPartner(data.manager || null);
        if ((data.messages || []).some((m) => m.senderRole === 'manager' && !m.readAt)) {
          await markFarmerMessagesRead();
          notifyMessagesRead();
        }
      } else {
        const data = await getManagerFarmerMessages(farmerId, { limit: 30 });
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
        setPartner(data.farmer || null);
        if ((data.messages || []).some((m) => m.senderRole === 'farmer' && !m.readAt)) {
          await markManagerFarmerMessagesRead(farmerId);
          notifyMessagesRead();
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token, isFarmer, farmerId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldestId = messages[0].id;
    if (!oldestId) return;

    setLoadingMore(true);
    try {
      if (isFarmer) {
        const data = await getFarmerMessages({ limit: 30, before: oldestId });
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOlder = (data.messages || []).filter((m) => !existingIds.has(m.id));
          return [...newOlder, ...prev];
        });
        setHasMore(data.hasMore || false);
      } else {
        const data = await getManagerFarmerMessages(farmerId, { limit: 30, before: oldestId });
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOlder = (data.messages || []).filter((m) => !existingIds.has(m.id));
          return [...newOlder, ...prev];
        });
        setHasMore(data.hasMore || false);
      }
    } catch {
      // silently keep current list
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, messages, isFarmer, farmerId]);

  // Send a message
  const send = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || sending) return null;

    setSending(true);
    try {
      let res;
      if (isFarmer) {
        res = await sendFarmerMessage(trimmed);
      } else {
        res = await sendManagerFarmerMessage(farmerId, trimmed);
      }
      const newMsg = res.message;
      if (newMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
      return newMsg;
    } finally {
      setSending(false);
    }
  }, [sending, isFarmer, farmerId]);

  // Realtime new messages
  useEffect(() => {
    if (!token) return;
    connectSocket(token);

    const handleNewMessage = (newMsg) => {
      if (!newMsg) return;
      const targetFarmerIdStr = (effectiveFarmerId || '').toString();
      const msgFarmerIdStr = (newMsg.farmerId || '').toString();

      if (msgFarmerIdStr !== targetFarmerIdStr) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Mark read if it is from the other party
      if (isFarmer && newMsg.senderRole === 'manager') {
        markFarmerMessagesRead().then(notifyMessagesRead).catch(() => {});
      } else if (!isFarmer && newMsg.senderRole === 'farmer') {
        markManagerFarmerMessagesRead(farmerId).then(notifyMessagesRead).catch(() => {});
      }
    };

    socket.on('new-message', handleNewMessage);
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [token, isFarmer, farmerId, effectiveFarmerId]);

  return {
    messages,
    hasMore,
    partner,
    loading,
    loadingMore,
    sending,
    error,
    loadMore,
    send,
    reload: loadInitial
  };
}
