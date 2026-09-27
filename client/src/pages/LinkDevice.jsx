import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/AuthContext';
import { linkDevice } from '../services/api';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function LinkDevice() {
  const navigate = useNavigate();
  const { token, setUser } = useAuth();
  const [form, setForm] = useState({ deviceId: '', deviceCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.deviceId.trim() || !form.deviceCode.trim()) {
      setError('Invalid device ID or code');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await linkDevice({ deviceId: form.deviceId, deviceCode: form.deviceCode });
      setUser(response.user);
      navigate('/');
    } catch {
      setError('Invalid device ID or code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="One more step"
      title="Connect your Prohori device"
      footer={<span>Use the device ID and code provided with your Prohori monitor.</span>}
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error && <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</div>}
        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="device-id">Device ID</label>
          <input className={inputClass} id="device-id" name="deviceId" type="text" autoComplete="off" placeholder="e.g. G3036" value={form.deviceId} onChange={updateField} />
        </div>
        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="device-code">Device code</label>
          <input className={inputClass} id="device-code" name="deviceCode" type="text" autoComplete="off" placeholder="Enter your device code" value={form.deviceCode} onChange={updateField} />
        </div>
        <button className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting || !token}>
          {submitting ? 'Connecting device...' : 'Connect device'}
        </button>
      </form>
    </AuthShell>
  );
}
