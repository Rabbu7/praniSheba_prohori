import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import LocationSelect from '../components/location/LocationSelect';
import { useAuth } from '../context/AuthContext';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
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
      setError('All fields are required.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
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
      setError(requestError.response?.data?.error?.message || 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your Prohori account"
      footer={(
        <>
          Already have an account?{' '}
          <Link className="font-semibold text-primary hover:underline" to="/login">
            Log in
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
              First name
            </label>
            <input
              className={inputClass}
              id="register-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              value={form.firstName}
              onChange={updateField}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-on-background" htmlFor="register-last-name">
              Last name
            </label>
            <input
              className={inputClass}
              id="register-last-name"
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
          <label className="text-sm font-semibold text-on-background" htmlFor="register-email">
            Email address
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
            Password
          </label>
          <input
            className={inputClass}
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={updateField}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="register-confirm-password">
            Confirm password
          </label>
          <input
            className={inputClass}
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={updateField}
          />
        </div>

        <button
          className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
