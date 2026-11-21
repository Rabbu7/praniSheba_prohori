import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import LocationSelect from '../components/location/LocationSelect';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { updateProfile } from '../services/api';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { t, translateError } = useLanguage();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    division: user?.division || '',
    district: user?.district || '',
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

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(t('errors.FIELD_REQUIRED'));
      return;
    }

    if (!form.division.trim() || !form.district.trim()) {
      setError(t('errors.INVALID_LOCATION'));
      return;
    }

    const trimmedPhone = form.phone.trim();
    if (trimmedPhone) {
      const sanitizedPhone = trimmedPhone.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{10,15}$/.test(sanitizedPhone)) {
        setError(t('errors.PHONE_INVALID'));
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        division: form.division.trim(),
        district: form.district.trim(),
      };
      if (trimmedPhone) {
        payload.phone = trimmedPhone;
      }

      const updatedUser = await updateProfile(payload);
      setUser(updatedUser);

      if (updatedUser.devices && updatedUser.devices.length > 0) {
        navigate('/');
      } else {
        navigate('/devices');
      }
    } catch (requestError) {
      setError(translateError(requestError, 'errors.UNKNOWN_ERROR'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t('auth.completeProfileTitle')}
      title={t('auth.completeProfileTitle')}
      footer={<span>{t('auth.completeProfileSubtitle')}</span>}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="complete-first-name">
              {t('auth.firstName')}
            </label>
            <input
              className={inputClass}
              id="complete-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder={t('auth.firstName')}
              value={form.firstName}
              onChange={updateField}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="complete-last-name">
              {t('auth.lastName')}
            </label>
            <input
              className={inputClass}
              id="complete-last-name"
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
          <label className="text-sm font-semibold text-on-background" htmlFor="complete-phone">
            {t('auth.phone')}
          </label>
          <input
            className={inputClass}
            id="complete-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+8801XXXXXXXXX"
            value={form.phone}
            onChange={updateField}
          />
        </div>

        <LocationSelect
          division={form.division}
          district={form.district}
          onChange={handleLocationChange}
          idPrefix="complete"
        />

        <button
          className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? t('auth.updating') : t('auth.saveAndContinue')}
        </button>
      </form>
    </AuthShell>
  );
}

