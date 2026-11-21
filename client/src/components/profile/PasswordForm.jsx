import React, { useState } from 'react';
import { changePassword } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function PasswordForm({ onSuccess, bare = false }) {
  const { t, translateError } = useLanguage();
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
      setError(t('errors.FIELD_REQUIRED'));
      return;
    }

    if (form.newPassword.length < 8) {
      setError(t('errors.PASSWORD_TOO_SHORT'));
      return;
    }

    if (form.newPassword === form.currentPassword) {
      setError(t('errors.PASSWORD_UNCHANGED'));
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const updatedUser = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      onSuccess?.(updatedUser);
    } catch (err) {
      setError(translateError(err, 'errors.UNKNOWN_ERROR'));
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <>
      {!bare && (
        <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-4">
          {t('profile.changePassword')}
        </h3>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {success && (
          <div className="rounded-lg border border-primary/20 bg-primary-fixed/30 px-4 py-3 text-sm text-on-primary-fixed flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">check</span>
            <span>{t('profile.passwordChanged')}</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="password-current">
            {t('auth.currentPassword')}
          </label>
          <input
            className={inputClass}
            id="password-current"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.currentPassword}
            onChange={updateField}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="password-new">
              {t('auth.newPassword')}
            </label>
            <input
              className={inputClass}
              id="password-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.newPassword}
              onChange={updateField}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="password-confirm">
              {t('auth.confirmPassword')}
            </label>
            <input
              className={inputClass}
              id="password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
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
            {submitting ? t('auth.updating') : t('auth.updatePassword')}
          </button>
        </div>
      </form>
    </>
  );

  if (bare) {
    return formContent;
  }

  return (
    <div className="bg-surface-white border border-border-subtle rounded-lg p-6 shadow-xs">
      {formContent}
    </div>
  );
}

