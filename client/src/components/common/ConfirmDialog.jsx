import React from 'react';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel, busy = false, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar-bg/40 p-4" role="presentation">
      <div className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-white p-6 shadow-lg" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="font-headline-md text-headline-md font-bold text-on-background">{title}</h2>
        <p className="mt-2 text-body-sm text-secondary">{message}</p>
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-md border border-outline-variant px-4 py-2 text-body-sm text-on-background hover:bg-surface-container-low" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60" onClick={onConfirm} disabled={busy}>{busy ? 'Working...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
