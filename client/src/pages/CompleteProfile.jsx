import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import LocationSelect from '../components/location/LocationSelect';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
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
      setError('First name and last name are required.');
      return;
    }

    if (!form.division.trim() || !form.district.trim()) {
      setError('Division and district are required.');
      return;
    }

    const trimmedPhone = form.phone.trim();
    if (trimmedPhone) {
      const sanitizedPhone = trimmedPhone.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{10,15}$/.test(sanitizedPhone)) {
        setError('Invalid phone number format.');
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
      setError(requestError.response?.data?.error?.message || 'Unable to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="One more step"
      title="Complete your profile"
      footer={<span>Please provide your details to continue using Prohori.</span>}
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
              First name
            </label>
            <input
              className={inputClass}
              id="complete-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              value={form.firstName}
              onChange={updateField}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="complete-last-name">
              Last name
            </label>
            <input
              className={inputClass}
              id="complete-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              value={form.lastName}
              onChange={updateField}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="complete-phone">
            Phone number (optional)
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
          {submitting ? 'Saving profile...' : 'Save and continue'}
        </button>
      </form>
    </AuthShell>
  );
}

