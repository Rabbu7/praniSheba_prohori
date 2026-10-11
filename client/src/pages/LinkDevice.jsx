import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { linkDevice } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function LinkDevice() {
  const navigate = useNavigate();
  const { user, token, setUser } = useAuth();
  const { selectDevice } = useDevice();
  const [form, setForm] = useState({ deviceId: '', deviceCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasDevices = Boolean(user?.devices?.length);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedDeviceId = form.deviceId.trim();
    const trimmedDeviceCode = form.deviceCode.trim();

    if (!trimmedDeviceId || !trimmedDeviceCode) {
      setError('Invalid device ID or code');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await linkDevice({ deviceId: trimmedDeviceId, deviceCode: trimmedDeviceCode });
      setUser(response.user);
      selectDevice(trimmedDeviceId);
      disconnectSocket();
      connectSocket(token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid device ID or code');
    } finally {
      setSubmitting(false);
    }
  };

  const title = hasDevices ? 'Add another device' : 'Connect your Prohori device';
  const buttonLabel = submitting
    ? (hasDevices ? 'Adding device...' : 'Connecting device...')
    : (hasDevices ? 'Add device' : 'Connect device');

  return (
    <AuthShell
      eyebrow="One more step"
      title={title}
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
          {buttonLabel}
        </button>
        {hasDevices && (
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </Link>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
