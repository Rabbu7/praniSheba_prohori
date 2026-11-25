import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatAbsoluteDate } from '../../utils/dateFormatter';

export default function ChatThread({
  partner = null,
  messages = [],
  hasMore = false,
  loading = false,
  loadingMore = false,
  sending = false,
  disabled = false,
  disabledMessage = null,
  currentUserId,
  onLoadMore,
  onSend,
  onBack,
  title,
  subtitle
}) {
  const { t, language, translateError } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  // Auto-scroll logic: scroll to bottom on initial load and when new messages are added to the end
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      // If we loaded older messages at the top, don't jump to the bottom
      const wasAtBottom =
        !scrollContainerRef.current ||
        scrollContainerRef.current.scrollHeight - scrollContainerRef.current.scrollTop - scrollContainerRef.current.clientHeight < 120;

      if (prevMessagesLengthRef.current === 0 || wasAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending || disabled) return;

    setSendError('');
    try {
      await onSend(trimmed);
      setInputText('');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err) {
      setSendError(translateError(err, 'common.failed'));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-white rounded-lg border border-border-subtle shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t('messages.backToConversations')}
              className="md:hidden p-1 rounded-md text-secondary hover:text-on-background hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-headline-md text-base font-bold text-on-background truncate leading-tight">
              {title || (partner ? `${partner.firstName} ${partner.lastName}` : t('messages.title'))}
            </h3>
            {subtitle ? (
              <p className="text-xs text-secondary truncate">{subtitle}</p>
            ) : partner?.phone ? (
              <a
                href={`tel:${partner.phone}`}
                className="text-xs text-primary hover:underline flex items-center gap-1 leading-tight mt-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">call</span>
                <span>{partner.phone}</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface/30 min-h-0"
      >
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="text-xs text-primary hover:underline disabled:opacity-50 font-medium py-1 px-3 rounded bg-surface-white border border-border-subtle shadow-2xs"
            >
              {loadingMore ? t('common.loading') : t('messages.loadOlder')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="h-full flex items-center justify-center text-secondary text-body-sm">
            {t('messages.loading')}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-secondary">
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-2xl text-secondary">chat</span>
            </div>
            <p className="text-body-sm font-medium">{t('messages.noMessages')}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn =
              currentUserId && msg.senderId
                ? msg.senderId.toString() === currentUserId.toString()
                : false;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`rounded-lg px-4 py-2.5 max-w-[85%] sm:max-w-[70%] text-body-sm break-words whitespace-pre-wrap ${
                    isOwn
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low border border-border-subtle text-on-background shadow-xs'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="font-mono text-[11px] text-secondary mt-1 px-1">
                  {formatAbsoluteDate(msg.createdAt, language)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Error Notice */}
      {sendError && (
        <div className="px-4 py-2 bg-error-container text-on-error-container text-xs border-t border-border-subtle">
          {sendError}
        </div>
      )}

      {/* Composer Area */}
      {disabled ? (
        <div className="p-4 border-t border-border-subtle bg-surface-container-low/50">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-white border border-border-subtle text-secondary text-body-sm">
            <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">info</span>
            <div>
              <p className="font-medium text-on-background">{t('messages.noManagerTitle')}</p>
              <p className="text-xs mt-0.5">{disabledMessage || t('messages.noManagerDesc')}</p>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-border-subtle bg-surface-white flex items-center gap-2 shrink-0"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('messages.typePlaceholder')}
            maxLength={1000}
            rows={1}
            disabled={sending}
            className="flex-1 rounded-lg border border-outline-variant bg-surface-white px-3 py-2 text-body-sm text-on-background placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 resize-none min-h-[40px] max-h-28"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            aria-label={t('messages.send')}
            className="rounded-lg bg-primary px-4 py-2 text-on-primary hover:bg-primary-container disabled:opacity-50 font-medium text-body-sm flex items-center justify-center gap-1.5 shrink-0 h-10 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span className="hidden sm:inline">{sending ? t('messages.sending') : t('messages.send')}</span>
          </button>
        </form>
      )}
    </div>
  );
}
