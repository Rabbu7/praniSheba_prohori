import React, { useState } from 'react';
import {
  createManager,
  deleteManager,
  restoreManager,
  resetManagerPassword
} from '../../services/api';
import { Shell } from '../../pages/manager/Overview';
import useAdminManagers from '../../hooks/useAdminManagers';
import LocationSelect from '../../components/location/LocationSelect';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ServerUnreachable from '../../components/common/ServerUnreachable';
import { formatDate } from '../../utils/dateFormatter';

const initial = { firstName: '', lastName: '', email: '', phone: '', division: '', district: '', password: '' };

export default function Managers() {
  const [statusFilter, setStatusFilter] = useState('active');
  const { data, loading, error, reload } = useAdminManagers(statusFilter);
  const [form, setForm] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [banner, setBanner] = useState('');
  const [selected, setSelected] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [tempPassword, setTempPassword] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    setBanner('');
    if (Object.values(form).some((value) => !value.trim()) || form.password.length < 8) {
      setFormError('All fields are required and the password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await createManager(form);
      setOpen(false);
      setForm(initial);
      await reload();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Unable to create manager');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setFormError('');
    setBanner('');
    try {
      await deleteManager(selected.id);
      setSelected(null);
      await reload();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Unable to delete manager');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!restoring) return;
    setBusy(true);
    setFormError('');
    setBanner('');
    try {
      await restoreManager(restoring.id);
      setBanner(`Restored ${restoring.firstName} ${restoring.lastName} to ${restoring.district}.`);
      setRestoring(null);
      await reload();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Unable to restore manager');
      setRestoring(null);
    } finally {
      setBusy(false);
    }
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    if (!resetTarget) return;
    setFormError('');
    setBanner('');
    if (tempPassword.length < 8) {
      setFormError('Temporary password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await resetManagerPassword(resetTarget.id, tempPassword);
      setBanner(`Temporary password set for ${resetTarget.firstName} ${resetTarget.lastName}. They must change it on next login.`);
      setResetTarget(null);
      setTempPassword('');
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Unable to reset password');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Shell title="Managers"><ServerUnreachable onRetry={reload} /></Shell>;

  return (
    <Shell title="Managers">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-headline-lg text-headline-lg font-bold">Managers</h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-on-primary"
          onClick={() => { setFormError(''); setOpen(true); }}
        >
          <span className="material-symbols-outlined">add</span>
          Add manager
        </button>
      </div>

      <div className="mb-5 flex gap-5 border-b border-border-subtle">
        {['active', 'removed'].map((value) => (
          <button
            key={value}
            type="button"
            className={`border-b-2 px-1 pb-3 text-body-sm font-semibold capitalize ${
              statusFilter === value ? 'border-primary text-primary' : 'border-transparent text-secondary'
            }`}
            onClick={() => {
              setFormError('');
              setBanner('');
              setStatusFilter(value);
            }}
          >
            {value}
          </button>
        ))}
      </div>

      {banner && (
        <p className="mb-4 rounded-md bg-status-online/10 p-3 text-body-sm text-status-online">
          {banner}
        </p>
      )}
      {formError && <p className="mb-4 rounded-md bg-error/10 p-3 text-error">{formError}</p>}

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-white">
        <table className="w-full min-w-[900px] text-left text-body-sm">
          <thead className="bg-surface-container-low text-label-caps uppercase text-secondary">
            <tr>
              {['Name', 'Email', 'Phone', 'Division', 'District', 'Farmers', 'Created on', ''].map((head) => (
                <th className="p-4" key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((manager) => (
              <tr key={manager.id} className="border-t border-border-subtle">
                <td className="p-4 font-semibold">{manager.firstName} {manager.lastName}</td>
                <td className="p-4">{manager.email}</td>
                <td className="p-4">
                  {manager.phone ? <a href={`tel:${manager.phone}`} className="text-primary">{manager.phone}</a> : '—'}
                </td>
                <td className="p-4">{manager.division}</td>
                <td className="p-4">{manager.district}</td>
                <td className="p-4">{manager.farmerCount}</td>
                <td className="p-4">{formatDate(manager.createdAt)}</td>
                <td className="p-4">
                  {statusFilter === 'active' ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setFormError('');
                          setTempPassword('');
                          setResetTarget(manager);
                        }}
                        aria-label={`Reset password for ${manager.firstName} ${manager.lastName}`}
                        title="Reset password"
                        className="rounded p-1 text-secondary hover:bg-surface-container-low hover:text-primary disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined">lock_reset</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded p-1 text-error hover:bg-error/10 disabled:opacity-50"
                        onClick={() => setSelected(manager)}
                        aria-label={`Delete ${manager.firstName} ${manager.lastName}`}
                        title="Remove manager"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRestoring(manager)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">restore</span>
                        Restore
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data.length === 0 && (
          <p className="p-8 text-center text-secondary">
            {statusFilter === 'active' ? 'No managers yet.' : 'No removed managers.'}
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-sidebar-bg/40 p-4">
          <form onSubmit={submit} className="mx-auto mt-8 max-w-xl rounded-lg border border-border-subtle bg-surface-white p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md font-bold">Add manager</h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {['firstName', 'lastName', 'email', 'phone', 'password'].map((field) => (
                <label key={field} className="text-body-sm font-semibold capitalize">
                  {field.replace('Name', ' name')}
                  <input
                    type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                    required
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4">
              <LocationSelect division={form.division} district={form.district} onChange={(value) => setForm({ ...form, ...value })} required idPrefix="manager" />
            </div>
            {formError && <p className="mt-4 text-error">{formError}</p>}
            <button disabled={busy} className="mt-6 w-full rounded-md bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-50">
              {busy ? 'Saving...' : 'Create manager'}
            </button>
          </form>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sidebar-bg/40 p-4">
          <form onSubmit={submitResetPassword} className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md font-bold">
                Reset password
              </h2>
              <button type="button" aria-label="Close" disabled={busy} onClick={() => setResetTarget(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="mb-4 text-body-sm text-secondary">
              Set a temporary password for {resetTarget.firstName} {resetTarget.lastName}. They will be forced to change it on next login.
            </p>
            <label className="block text-body-sm font-semibold">
              Temporary password
              <input
                type="password"
                minLength={8}
                required
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
              />
            </label>
            {formError && <p className="mt-3 text-xs text-error">{formError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setResetTarget(null)}
                className="rounded-md border border-border-subtle px-4 py-2 text-body-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Reset password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <ConfirmDialog
          title={`Delete ${selected.firstName} ${selected.lastName}?`}
          message="Their district will have no manager until a new one is added. Farmers and devices are not affected."
          confirmLabel="Delete"
          onCancel={() => setSelected(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}

      {restoring && (
        <ConfirmDialog
          title={`Restore ${restoring.firstName} ${restoring.lastName}?`}
          message={`This will reactivate them as the manager for ${restoring.district} if the district has no active manager.`}
          confirmLabel="Restore"
          onCancel={() => setRestoring(null)}
          onConfirm={restore}
          busy={busy}
        />
      )}
    </Shell>
  );
}
