import { useCallback, useEffect, useRef, useState } from 'react';
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

  const requestIdRef = useRef(0);

  const isFarmer = role === 'farmer';
  const effectiveFarmerId = isFarmer ? (user?._id || user?.id) : farmerId;

  // Load initial messages
  const loadInitial = useCallback(async () => {
    if (!token) return;
    if (!isFarmer && !farmerId) return;

    const requestId = ++requestIdRef.current;
    setMessages([]);
    setHasMore(false);
    setPartner(null);
    setLoading(true);
    setError(null);

    try {
      if (isFarmer) {
        const data = await getFarmerMessages({ limit: 30 });
        if (requestId !== requestIdRef.current) return;
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
        setPartner(data.manager || null);
        if ((data.messages || []).some((m) => m.senderRole === 'manager' && !m.readAt)) {
          await markFarmerMessagesRead();
          if (requestId !== requestIdRef.current) return;
          notifyMessagesRead();
        }
      } else {
        const data = await getManagerFarmerMessages(farmerId, { limit: 30 });
        if (requestId !== requestIdRef.current) return;
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
        setPartner(data.farmer || null);
        if ((data.messages || []).some((m) => m.senderRole === 'farmer' && !m.readAt)) {
          await markManagerFarmerMessagesRead(farmerId);
          if (requestId !== requestIdRef.current) return;
          notifyMessagesRead();
        }
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
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

    const startedFarmerId = farmerId;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      if (isFarmer) {
        const data = await getFarmerMessages({ limit: 30, before: oldestId });
        if (requestId !== requestIdRef.current) return;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOlder = (data.messages || []).filter((m) => !existingIds.has(m.id));
          return [...newOlder, ...prev];
        });
        setHasMore(data.hasMore || false);
      } else {
        const data = await getManagerFarmerMessages(startedFarmerId, { limit: 30, before: oldestId });
        if (requestId !== requestIdRef.current || farmerId !== startedFarmerId) return;
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
      if (requestId === requestIdRef.current && (isFarmer || farmerId === startedFarmerId)) {
        setLoadingMore(false);
      }
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
