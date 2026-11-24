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
import { isServerUnreachable } from '../../utils/isServerUnreachable';
import { useLanguage } from '../../context/LanguageContext';

const initial = { firstName: '', lastName: '', email: '', phone: '', division: '', district: '', password: '' };

export default function Managers() {
  const { t, language, translateLocation, translateError } = useLanguage();
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
      setFormError(t('errors.FIELD_REQUIRED'));
      return;
    }
    setBusy(true);
    try {
      await createManager(form);
      setBanner(t('admin.managerCreatedSuccess'));
      setOpen(false);
      setForm(initial);
      await reload();
    } catch (err) {
      setFormError(translateError(err, 'common.failed'));
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
      setFormError(translateError(err, 'common.failed'));
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
      setBanner(t('common.success'));
      setRestoring(null);
      await reload();
    } catch (err) {
      setFormError(translateError(err, 'common.failed'));
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
      setFormError(t('auth.passwordMinLength'));
      return;
    }
    setBusy(true);
    try {
      await resetManagerPassword(resetTarget.id, tempPassword);
      setBanner(t('common.success'));
      setResetTarget(null);
      setTempPassword('');
    } catch (err) {
      setFormError(translateError(err, 'common.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <Shell title={t('nav.managers')}>
        {isServerUnreachable(error) ? (
          <ServerUnreachable onRetry={reload} />
        ) : (
          <p className="rounded-lg border border-error/30 bg-surface-white p-8 text-center text-error">
            {translateError(error, 'admin.noManagersFound')}
          </p>
        )}
      </Shell>
    );
  }

  const tableHeaders = [
    t('admin.managerName'),
    t('admin.managerEmail'),
    t('admin.managerPhone'),
    t('auth.division'),
    t('auth.district'),
    t('admin.farmerCount'),
    t('admin.createdAt'),
    t('common.actions'),
  ];

  return (
    <Shell title={t('nav.managers')}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-headline-lg text-headline-lg font-bold">{t('nav.managers')}</h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-on-primary hover:bg-primary-container transition-colors cursor-pointer"
          onClick={() => { setFormError(''); setOpen(true); }}
        >
          <span className="material-symbols-outlined">add</span>
          {t('admin.addManager')}
        </button>
      </div>

      <div className="mb-5 flex gap-5 border-b border-border-subtle">
        {['active', 'removed'].map((value) => (
          <button
            key={value}
            type="button"
            className={`border-b-2 px-1 pb-3 text-body-sm font-semibold cursor-pointer ${
              statusFilter === value ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-background'
            }`}
            onClick={() => {
              setFormError('');
              setBanner('');
              setStatusFilter(value);
            }}
          >
            {value === 'active' ? t('common.active') : t('common.removed')}
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
              {tableHeaders.map((head, idx) => (
                <th className={`p-4 ${idx === tableHeaders.length - 1 ? 'text-right' : ''}`} key={head || idx}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((manager) => (
              <tr key={manager.id} className="border-t border-border-subtle hover:bg-surface-container-low/50 transition-colors">
                <td className="p-4 font-semibold text-on-background">{manager.firstName} {manager.lastName}</td>
                <td className="p-4 text-secondary">{manager.email}</td>
                <td className="p-4">
                  {manager.phone ? (
                    <a href={`tel:${manager.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      {manager.phone}
                    </a>
                  ) : '—'}
                </td>
                <td className="p-4">{translateLocation(manager.division, 'division')}</td>
                <td className="p-4">{translateLocation(manager.district, 'district')}</td>
                <td className="p-4 font-medium">{manager.farmerCount}</td>
                <td className="p-4 text-secondary">{formatDate(manager.createdAt, language)}</td>
                <td className="p-4 text-right">
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
                        aria-label={t('admin.resetPasswordAria', { name: `${manager.firstName} ${manager.lastName}` })}
                        title={t('admin.resetPassword')}
                        className="rounded p-1 text-secondary hover:bg-surface-container-low hover:text-primary disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined">lock_reset</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded p-1 text-error hover:bg-error/10 disabled:opacity-50 cursor-pointer"
                        onClick={() => setSelected(manager)}
                        aria-label={t('admin.removeManagerAria', { name: `${manager.firstName} ${manager.lastName}` })}
                        title={t('admin.removeManager')}
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
                        className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">restore</span>
                        {t('admin.restore')}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data.length === 0 && (
          <p className="p-8 text-center text-secondary">{t('admin.noManagersFound')}</p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-sidebar-bg/40 p-4">
          <form onSubmit={submit} className="mx-auto mt-8 max-w-xl rounded-lg border border-border-subtle bg-surface-white p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md font-bold">{t('admin.addManagerTitle')}</h2>
              <button type="button" aria-label={t('common.close')} onClick={() => setOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-body-sm font-semibold">
                  {t('auth.firstName')}
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
                  />
                </label>
              </div>
              <div>
                <label className="text-body-sm font-semibold">
                  {t('auth.lastName')}
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
                  />
                </label>
              </div>
              <div>
                <label className="text-body-sm font-semibold">
                  {t('auth.email')}
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
                  />
                </label>
              </div>
              <div>
                <label className="text-body-sm font-semibold">
                  {t('auth.phone')}
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
                  />
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="text-body-sm font-semibold">
                  {t('auth.password')}
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
                  />
                </label>
              </div>
            </div>
            <div className="mt-4">
              <LocationSelect division={form.division} district={form.district} onChange={(value) => setForm({ ...form, ...value })} required idPrefix="manager" />
            </div>
            {formError && <p className="mt-4 text-error">{formError}</p>}
            <button disabled={busy} className="mt-6 w-full rounded-md bg-primary px-4 py-3 font-semibold text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer">
              {busy ? t('common.saving') : t('admin.addManager')}
            </button>
          </form>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sidebar-bg/40 p-4">
          <form onSubmit={submitResetPassword} className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md font-bold">
                {t('admin.resetPasswordTitle')}
              </h2>
              <button type="button" aria-label={t('common.close')} disabled={busy} onClick={() => setResetTarget(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="mb-4 text-body-sm text-secondary">
              {t('admin.resetPasswordSubtitle')}
            </p>
            <label className="block text-body-sm font-semibold">
              {t('admin.tempPasswordLabel')}
              <input
                type="password"
                minLength={8}
                required
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder={t('admin.tempPasswordPlaceholder')}
                className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 font-normal outline-none focus:border-primary"
              />
            </label>
            {formError && <p className="mt-3 text-xs text-error">{formError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setResetTarget(null)}
                className="rounded-md border border-border-subtle px-4 py-2 text-body-sm font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                {busy ? t('common.saving') : t('admin.resetPassword')}
              </button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <ConfirmDialog
          title={t('admin.removeManagerTitle', { name: `${selected.firstName} ${selected.lastName}` })}
          message={t('admin.removeConfirm', { name: `${selected.firstName} ${selected.lastName}` })}
          confirmLabel={t('common.delete')}
          onCancel={() => setSelected(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}

      {restoring && (
        <ConfirmDialog
          title={t('admin.restoreManagerTitle', { name: `${restoring.firstName} ${restoring.lastName}` })}
          message={t('admin.restoreConfirm', {
            name: `${restoring.firstName} ${restoring.lastName}`,
            district: translateLocation(restoring.district, 'district'),
          })}
          confirmLabel={t('admin.restore')}
          onCancel={() => setRestoring(null)}
          onConfirm={restore}
          busy={busy}
        />
      )}
    </Shell>
  );
}
