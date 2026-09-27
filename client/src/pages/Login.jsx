import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/AuthContext';

const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary/10';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      navigate(user.device ? '/' : '/link-device');
    } catch {
      setError('Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Prohori"
      footer={<>Don&apos;t have an account? <Link className="font-semibold text-primary hover:underline" to="/register">Register</Link></>}
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error && <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</div>}
        <div>
          <label className="text-sm font-semibold text-on-background" htmlFor="login-email">Email address</label>
          <input className={inputClass} id="login-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={updateField} />
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-semibold text-on-background" htmlFor="login-password">Password</label>
          </div>
          <input className={inputClass} id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={updateField} />
        </div>
        <button className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3.5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
