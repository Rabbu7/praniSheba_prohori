import React, { useState, useEffect } from 'react';
import LocationSelect from '../location/LocationSelect';
import { updateProfile } from '../../services/api';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';
const readonlyInputClass = 'mt-2 w-full rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 text-body-lg text-secondary outline-none cursor-not-allowed';

export default function ProfileForm({ user, setUser }) {
  const role = user?.role || 'farmer';
  const isFarmer = role === 'farmer';
  const isManager = role === 'manager';

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    division: user?.division || '',
    district: user?.district || '',
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        division: user.division || '',
        district: user.district || '',
      });
    }
  }, [user]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setSuccess(false);
  };

  const handleLocationChange = ({ division, district }) => {
    setForm((current) => ({ ...current, division, district }));
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (isFarmer && (!form.division.trim() || !form.district.trim())) {
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
    } else if (isManager) {
      setError('Phone number is required for managers.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: trimmedPhone || '',
      };

      if (isFarmer) {
        payload.division = form.division.trim();
        payload.district = form.district.trim();
      }

      const updated = await updateProfile(payload);
      setUser(updated);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-white border border-border-subtle rounded-lg p-6 shadow-xs">
      <h3 className="font-headline-md text-headline-md font-bold text-on-background mb-4">
        Personal Information
      </h3>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {success && (
          <div className="rounded-lg border border-primary/20 bg-primary-fixed/30 px-4 py-3 text-sm text-on-primary-fixed flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">check</span>
            <span>Profile updated</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="profile-first-name">
              First name
            </label>
            <input
              className={inputClass}
              id="profile-first-name"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={updateField}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="profile-last-name">
              Last name
            </label>
            <input
              className={inputClass}
              id="profile-last-name"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={updateField}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="profile-email">
            Email address (read-only)
          </label>
          <input
            className={readonlyInputClass}
            id="profile-email"
            name="email"
            type="email"
            value={form.email}
            disabled
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="profile-phone">
            Phone number {isManager ? '(required)' : '(optional)'}
          </label>
          <input
            className={inputClass}
            id="profile-phone"
            name="phone"
            type="tel"
            placeholder="+8801XXXXXXXXX"
            value={form.phone}
            onChange={updateField}
          />
        </div>

        {isFarmer && (
          <LocationSelect
            division={form.division}
            district={form.district}
            onChange={handleLocationChange}
            idPrefix="profile"
          />
        )}

        {isManager && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-on-background" htmlFor="profile-division-ro">
                Division (assigned by admin)
              </label>
              <input
                className={readonlyInputClass}
                id="profile-division-ro"
                value={form.division || '—'}
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-on-background" htmlFor="profile-district-ro">
                District (assigned by admin)
              </label>
              <input
                className={readonlyInputClass}
                id="profile-district-ro"
                value={form.district || '—'}
                disabled
              />
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

