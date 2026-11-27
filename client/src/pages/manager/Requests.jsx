import React, { useState } from 'react';
import { approveRequest, rejectRequest } from '../../services/api';
import useManagerRequests from '../../hooks/useManagerRequests';
import { Shell } from './Overview';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ServerUnreachable from '../../components/common/ServerUnreachable';
import { formatDate } from '../../utils/dateFormatter';
import { formatRequestNote } from '../../utils/formatRequestNote';
import { isServerUnreachable } from '../../utils/isServerUnreachable';
import { useLanguage } from '../../context/LanguageContext';

export default function Requests() {
  const { t, language, translateError } = useLanguage();
  const [status, setStatus] = useState('pending');
  const { data, loading, error, reload } = useManagerRequests(status);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');

  const decide = async (request, action) => {
    setBusy(request.id || request._id);
    setMessage(null);
    try {
      if (action === 'approve') {
        await approveRequest(request.id || request._id);
      } else {
        await rejectRequest(request.id || request._id, note);
      }
      setMessage({ ok: true, text: t('common.success') });
      setRejecting(null);
      setNote('');
      await reload();
    } catch (err) {
      setMessage({ ok: false, text: translateError(err, 'common.failed') });
      await reload();
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <Shell title={t('nav.requests')}>
        {isServerUnreachable(error) ? (
          <ServerUnreachable onRetry={reload} />
        ) : (
          <p className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">
            {translateError(error, 'manager.noRequestsFound')}
          </p>
        )}
      </Shell>
    );
  }

  const statusFilters = [
    { value: 'pending', label: t('manager.pendingFilter') },
    { value: 'approved', label: t('manager.approvedFilter') },
    { value: 'rejected', label: t('manager.rejectedFilter') },
  ];

  return (
    <Shell title={t('nav.requests')}>
      <div className="mb-6 flex gap-5 border-b border-border-subtle">
        {statusFilters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`border-b-2 px-1 pb-3 text-body-sm font-semibold transition-colors cursor-pointer ${
              status === value ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-background'
            }`}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p className={`mb-4 rounded-md p-3 text-body-sm border ${message.ok ? 'bg-status-online/10 text-on-background border-status-online/30' : 'bg-error/10 text-error border-error/30'}`}>
          {message.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-white">
        <table className="w-full text-left text-body-sm">
          <thead className="bg-surface-container-low text-label-caps uppercase text-secondary">
            <tr>
              <th className="p-4">{t('manager.requestedBy')}</th>
              <th className="p-4">{t('dashboard.deviceId')}</th>
              <th className="p-4">{t('manager.requestedAt')}</th>
              <th className="p-4">{status === 'pending' ? t('common.actions') : t('manager.decisionAt')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((request) => (
              <tr key={request.id || request._id} className="border-t border-border-subtle hover:bg-surface-container-low/50 transition-colors">
                <td className="p-4 font-medium text-on-background">
                  {request.farmer?.firstName} {request.farmer?.lastName}
                </td>
                <td className="p-4 font-mono font-bold text-on-background">{request.deviceId}</td>
                <td className="p-4 text-secondary">{formatDate(request.requestedAt, language)}</td>
                <td className="p-4">
                  {status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
                        onClick={() => decide(request, 'approve')}
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        {t('manager.approve')}
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1 rounded-md border border-error px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 transition-colors disabled:opacity-50 cursor-pointer"
                        onClick={() => setRejecting(request)}
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        {t('manager.reject')}
                      </button>
                    </div>
                  ) : (
                    <span className="text-secondary">
                      {formatDate(request.decidedAt, language)}
                      {request.note ? ` · ${formatRequestNote(request.note, t)}` : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data.length === 0 && (
          <p className="p-8 text-center text-secondary">{t('manager.noRequestsFound')}</p>
        )}
      </div>

      {rejecting && (
        <ConfirmDialog
          title={t('manager.rejectTitle')}
          message={t('manager.rejectReasonLabel')}
          confirmLabel={t('manager.reject')}
          onCancel={() => setRejecting(null)}
          onConfirm={() => decide(rejecting, 'reject')}
          busy={busy !== null}
        >
          <textarea
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-4 min-h-20 w-full rounded-md border border-outline-variant p-3 outline-none focus:border-primary text-body-sm"
            placeholder={t('manager.rejectReasonPlaceholder')}
            aria-label={t('manager.rejectReasonLabel')}
          />
        </ConfirmDialog>
      )}
    </Shell>
  );
}
