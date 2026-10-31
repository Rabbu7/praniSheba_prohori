import React, { useState } from 'react';
import { changePassword } from '../../services/api';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function PasswordForm() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('All password fields are required.');
      return;
    }

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-white border border-border-subtle rounded-lg p-6 shadow-xs">
      <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-4">
        Change Password
      </h3>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {success && (
          <div className="rounded-lg border border-primary/20 bg-primary-fixed/30 px-4 py-3 text-sm text-on-primary-fixed flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">check</span>
            <span>Password updated successfully</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="password-current">
            Current password
          </label>
          <input
            className={inputClass}
            id="password-current"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={updateField}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="password-new">
              New password
            </label>
            <input
              className={inputClass}
              id="password-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={form.newPassword}
              onChange={updateField}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="password-confirm">
              Confirm new password
            </label>
            <input
              className={inputClass}
              id="password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat new password"
              value={form.confirmPassword}
              onChange={updateField}
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}

