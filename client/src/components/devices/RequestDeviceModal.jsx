import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createDeviceRequest } from '../../services/api';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function RequestDeviceModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ deviceId: '', deviceCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const deviceIdInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    setForm({ deviceId: '', deviceCode: '' });
    setError('');
    deviceIdInputRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const deviceId = form.deviceId.trim();
    const deviceCode = form.deviceCode.trim();

    if (!deviceId || !deviceCode) {
      setError('Invalid device ID or code');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await createDeviceRequest({ deviceId, deviceCode });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid device ID or code');
      setSubmitting(false);
      return;
    }

    setForm({ deviceId: '', deviceCode: '' });
    setError('');
    setSubmitting(false);
    onSuccess();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-sidebar-bg/40 p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-white p-6 shadow-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-device-title"
          aria-describedby="request-device-hint"
        >
          <h2
            id="request-device-title"
            className="font-headline-md text-headline-md font-bold text-on-background"
          >
            Request a Prohori device
          </h2>
          <p id="request-device-hint" className="mt-2 text-body-sm text-secondary">
            Use the device ID and code provided with your Prohori monitor.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
            {error && (
              <div
                className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
                role="alert"
              >
                {error}
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-on-background" htmlFor="request-device-id">
                Device ID
              </label>
              <input
                ref={deviceIdInputRef}
                className={inputClass}
                id="request-device-id"
                name="deviceId"
                type="text"
                autoComplete="off"
                placeholder="e.g. G3036"
                value={form.deviceId}
                onChange={updateField}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-on-background" htmlFor="request-device-code">
                Device code
              </label>
              <input
                className={inputClass}
                id="request-device-code"
                name="deviceCode"
                type="text"
                autoComplete="off"
                placeholder="Enter your device code"
                value={form.deviceCode}
                onChange={updateField}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-outline-variant px-4 py-2 text-body-sm text-on-background hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? 'Sending request...' : 'Request device'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
