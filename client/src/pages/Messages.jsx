import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import ChatThread from '../components/messages/ChatThread';
import ServerUnreachable from '../components/common/ServerUnreachable';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import useMessageThread from '../hooks/useMessageThread';
import { isServerUnreachable } from '../utils/isServerUnreachable';

export default function Messages() {
  const { user } = useAuth();
  const { t, translateError } = useLanguage();
  const {
    messages,
    hasMore,
    partner,
    loading,
    loadingMore,
    sending,
    error,
    loadMore,
    send
  } = useMessageThread({ role: 'farmer' });

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      <Sidebar />
      <div className="flex-1 md:ml-sidebar-width flex flex-col h-screen overflow-hidden bg-background">
        <Header title={t('messages.title')} showDevice={false} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-hidden max-w-[1200px] w-full mx-auto flex flex-col pb-24 md:pb-6">
          {error ? (
            isServerUnreachable(error) ? (
              <ServerUnreachable />
            ) : (
              <p className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">
                {translateError(error, 'common.failed')}
              </p>
            )
          ) : (
            <ChatThread
              partner={partner}
              messages={messages}
              hasMore={hasMore}
              loading={loading}
              loadingMore={loadingMore}
              sending={sending}
              disabled={!loading && !error && !partner}
              currentUserId={user?._id || user?.id}
              onLoadMore={loadMore}
              onSend={send}
              title={partner ? `${partner.firstName} ${partner.lastName}` : t('messages.title')}
              subtitle={partner ? t('profile.manager') : t('messages.subtitle')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
