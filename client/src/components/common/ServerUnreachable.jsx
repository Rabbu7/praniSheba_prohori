import React from 'react';

export default function ServerUnreachable({ onRetry, message = 'Unable to reach Prohori server' }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-error/30 bg-surface-white p-8 text-center"
    >
      <span className="material-symbols-outlined mb-2 text-3xl text-error" aria-hidden="true">
        cloud_off
      </span>
      <p className="text-sm font-medium text-error">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-on-background transition-colors hover:bg-surface-hover"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            refresh
          </span>
          Try again
        </button>
      )}
    </div>
  );
}
