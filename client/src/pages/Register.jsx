import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import LocationSelect from '../components/location/LocationSelect';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t, translateError } = useLanguage();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    division: '',
    district: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleLocationChange = ({ division, district }) => {
    setForm((current) => ({ ...current, division, district }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.firstName.trim()
      || !form.lastName.trim()
      || !form.email.trim()
      || !form.division.trim()
      || !form.district.trim()
      || !form.password
      || !form.confirmPassword
    ) {
      setError(t('errors.FIELD_REQUIRED'));
      return;
    }

    if (form.password.length < 8) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await register(
        form.firstName.trim(),
        form.lastName.trim(),
        form.email.trim(),
        form.password,
        form.division.trim(),
        form.district.trim(),
      );
      navigate('/devices');
    } catch (requestError) {
      setError(translateError(requestError, 'errors.UNKNOWN_ERROR'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t('auth.registerTitle')}
      title={`${t('auth.signUp')} - ${t('common.appName')}`}
      footer={(
        <>
          <Link className="font-semibold text-primary hover:underline" to="/login">
            {t('auth.alreadyHaveAccount')}
          </Link>
        </>
      )}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="register-first-name">
              {t('auth.firstName')}
            </label>
            <input
              className={inputClass}
              id="register-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder={t('auth.firstName')}
              value={form.firstName}
              onChange={updateField}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="register-last-name">
              {t('auth.lastName')}
            </label>
            <input
              className={inputClass}
              id="register-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder={t('auth.lastName')}
              value={form.lastName}
              onChange={updateField}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="register-email">
            {t('auth.email')}
          </label>
          <input
            className={inputClass}
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={updateField}
          />
        </div>

        <LocationSelect
          division={form.division}
          district={form.district}
          onChange={handleLocationChange}
          idPrefix="register"
        />

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="register-password">
            {t('auth.password')}
          </label>
          <input
            className={inputClass}
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={updateField}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="register-confirm-password">
            {t('auth.confirmPassword')}
          </label>
          <input
            className={inputClass}
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={updateField}
          />
        </div>

        <button
          className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? t('auth.registering') : t('auth.signUp')}
        </button>
      </form>
    </AuthShell>
  );
}
