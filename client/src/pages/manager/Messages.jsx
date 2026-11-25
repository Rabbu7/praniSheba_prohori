import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import ChatThread from '../../components/messages/ChatThread';
import ServerUnreachable from '../../components/common/ServerUnreachable';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import useMessageThread from '../../hooks/useMessageThread';
import { MESSAGES_READ_EVENT } from '../../hooks/useUnreadMessages';
import { getManagerConversations } from '../../services/api';
import socket, { connectSocket } from '../../services/socket';
import { formatAbsoluteDate } from '../../utils/dateFormatter';
import { isServerUnreachable } from '../../utils/isServerUnreachable';

export default function ManagerMessages() {
  const { farmerId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t, language, translateLocation } = useLanguage();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active thread hook
  const {
    messages,
    hasMore,
    partner,
    loading: threadLoading,
    loadingMore,
    sending,
    error: threadError,
    loadMore,
    send
  } = useMessageThread({ role: 'manager', farmerId });

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getManagerConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Real-time updates for conversation list
  useEffect(() => {
    if (!token) return;
    connectSocket(token);

    const handleNewMessage = (newMsg) => {
      if (!newMsg) return;
      setConversations((prev) => {
        const msgFarmerId = (newMsg.farmerId || '').toString();
        const index = prev.findIndex((c) => c.farmer.id === msgFarmerId);

        if (index === -1) {
          // If a new farmer not yet in list, reload
          loadConversations();
          return prev;
        }

        const updated = [...prev];
        const target = { ...updated[index] };
        target.lastMessage = newMsg;

        if (newMsg.senderRole === 'farmer' && farmerId !== msgFarmerId) {
          target.unreadCount = (target.unreadCount || 0) + 1;
        }

        updated.splice(index, 1);
        return [target, ...updated];
      });
    };

    const handleMessagesRead = () => {
      loadConversations();
    };

    socket.on('new-message', handleNewMessage);
    window.addEventListener(MESSAGES_READ_EVENT, handleMessagesRead);

    return () => {
      socket.off('new-message', handleNewMessage);
      window.removeEventListener(MESSAGES_READ_EVENT, handleMessagesRead);
    };
  }, [token, farmerId, loadConversations]);

  // When farmerId changes, reset unread count locally for that conversation
  useEffect(() => {
    if (farmerId) {
      setConversations((prev) =>
        prev.map((c) => (c.farmer.id === farmerId ? { ...c, unreadCount: 0 } : c))
      );
    }
  }, [farmerId]);

  const activeFarmer =
    conversations.find((c) => c.farmer.id === farmerId)?.farmer || partner;

  const filteredConversations = conversations.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const fullName = `${c.farmer.firstName} ${c.farmer.lastName}`.toLowerCase();
    const phone = (c.farmer.phone || '').toLowerCase();
    return fullName.includes(query) || phone.includes(query);
  });

  const pageError = error || threadError;

  return (
    <div className="flex min-h-screen bg-background text-on-background font-body-sm antialiased">
      <Sidebar />
      <div className="flex-1 md:ml-sidebar-width flex flex-col h-screen overflow-hidden bg-background">
        <Header title={t('messages.title')} showDevice={false} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-hidden max-w-[1200px] w-full mx-auto flex flex-col pb-24 md:pb-6">
          {pageError && isServerUnreachable(pageError) ? (
            <ServerUnreachable />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0">
              {/* Left Column: Conversation List */}
              <div
                className={`md:col-span-4 lg:col-span-4 bg-surface-white rounded-lg border border-border-subtle shadow-xs flex flex-col overflow-hidden h-full ${
                  farmerId ? 'hidden md:flex' : 'flex'
                }`}
              >
                {/* Search Bar */}
                <div className="p-3 border-b border-border-subtle">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('messages.searchFarmers')}
                      className="w-full pl-9 pr-3 py-1.5 rounded-md border border-outline-variant bg-surface-container-low/50 text-body-sm text-on-background placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                {/* Farmer List */}
                <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/60">
                  {loading ? (
                    <div className="p-6 text-center text-secondary text-body-sm">
                      {t('common.loading')}
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-6 text-center text-secondary text-body-sm">
                      {t('messages.noConversations')}
                    </div>
                  ) : (
                    filteredConversations.map((item) => {
                      const isSelected = item.farmer.id === farmerId;
                      return (
                        <button
                          key={item.farmer.id}
                          type="button"
                          onClick={() => navigate(`/manager/messages/${item.farmer.id}`)}
                          className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors hover:bg-surface-container-low/70 ${
                            isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                            {item.farmer.firstName?.[0] || 'F'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-semibold text-on-background truncate text-body-sm">
                                {item.farmer.firstName} {item.farmer.lastName}
                              </h4>
                              {item.lastMessage && (
                                <span className="font-mono text-[10px] text-secondary shrink-0">
                                  {formatAbsoluteDate(item.lastMessage.createdAt, language)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-secondary truncate mt-0.5">
                              {item.lastMessage
                                ? item.lastMessage.body
                                : translateLocation(item.farmer.district, 'district')}
                            </p>
                          </div>
                          {item.unreadCount > 0 && (
                            <span
                              title={t('messages.unreadBadge', { count: item.unreadCount })}
                              className="bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center"
                            >
                              {item.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Chat Thread */}
              <div
                className={`md:col-span-8 lg:col-span-8 flex flex-col h-full min-h-0 ${
                  farmerId ? 'flex' : 'hidden md:flex'
                }`}
              >
                {farmerId ? (
                  <ChatThread
                    partner={activeFarmer}
                    messages={messages}
                    hasMore={hasMore}
                    loading={threadLoading}
                    loadingMore={loadingMore}
                    sending={sending}
                    currentUserId={user?._id || user?.id}
                    onLoadMore={loadMore}
                    onSend={send}
                    onBack={() => navigate('/manager/messages')}
                    title={
                      activeFarmer
                        ? `${activeFarmer.firstName} ${activeFarmer.lastName}`
                        : t('messages.title')
                    }
                    subtitle={
                      activeFarmer?.district
                        ? translateLocation(activeFarmer.district, 'district')
                        : null
                    }
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-surface-white rounded-lg border border-border-subtle shadow-xs text-secondary">
                    <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-3xl text-secondary">chat</span>
                    </div>
                    <h3 className="font-headline-md text-base font-bold text-on-background mb-1">
                      {t('messages.conversations')}
                    </h3>
                    <p className="text-body-sm max-w-xs">{t('messages.selectConversation')}</p>
                    <p className="text-xs text-secondary mt-1">{t('messages.managerSubtitle')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
