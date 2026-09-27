import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/AuthContext';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.username.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      setError('Username, email, and password are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const user = await register(form.username, form.email, form.password);
      navigate(user.device ? '/' : '/link-device');
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
      footer={<>Already have an account? <Link className="font-semibold text-primary hover:underline" to="/login">Log in</Link></>}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error && <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</div>}
        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="register-username">Username</label>
          <input className={inputClass} id="register-username" name="username" type="text" autoComplete="username" placeholder="Choose a username" value={form.username} onChange={updateField} />
        </div>
        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="register-email">Email address</label>
          <input className={inputClass} id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={updateField} />
        </div>
        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="register-password">Password</label>
          <input className={inputClass} id="register-password" name="password" type="password" autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={updateField} />
        </div>
        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="register-confirm-password">Confirm password</label>
          <input className={inputClass} id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat your password" value={form.confirmPassword} onChange={updateField} />
        </div>
        <button className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
