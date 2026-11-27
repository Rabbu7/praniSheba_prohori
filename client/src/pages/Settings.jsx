import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import SettingsCard from '../components/settings/SettingsCard';
import SegmentedControl from '../components/settings/SegmentedControl';
import SwitchRow from '../components/settings/SwitchRow';
import ThresholdGuide from '../components/settings/ThresholdGuide';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences } from '../context/PreferencesContext';
import { useDevice } from '../context/DeviceContext';

export default function Settings() {
  const { user } = useAuth();
  const { t, language, setLanguage, resetLanguage } = useLanguage();
  const {
    theme,
    setTheme,
    textSize,
    setTextSize,
    reduceMotion,
    setReduceMotion,
    resetPreferences,
  } = usePreferences();
  const { selectDevice } = useDevice();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const isFarmer = user?.role === 'farmer';

  const handleReset = () => {
    resetPreferences();
    resetLanguage();
    selectDevice(null);
    setConfirmResetOpen(false);
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
    }, 4000);
  };

  const themeOptions = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ];

  const textSizeOptions = [
    { value: 'normal', label: t('settings.textNormal') },
    { value: 'large', label: t('settings.textLarge') },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'bn', label: 'বাংলা' },
  ];

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 md:ml-sidebar-width h-full overflow-y-auto w-full bg-background relative">
        <Header title={t('nav.settings')} showDevice={false} />

        <div className="p-container-padding md:p-8 max-w-[1200px] mx-auto pb-24 md:pb-8">
          <div className="mb-6">
            <h2 className="font-headline-md text-headline-md font-bold text-on-background">
              {t('settings.title')}
            </h2>
            <p className="text-secondary text-body-sm mt-1">
              {t('settings.subtitle')}
            </p>
          </div>

          {resetSuccess && (
            <div className="mb-6 rounded-lg border border-status-online/30 bg-status-online/10 p-4 text-on-background flex items-center gap-3">
              <span className="material-symbols-outlined text-status-online">check</span>
              <span className="text-body-sm font-medium">
                {t('settings.resetDone')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols): Appearance, Language, Threshold Guide */}
            <div className="lg:col-span-8 space-y-6">
              {/* Appearance */}
              <SettingsCard
                icon="palette"
                title={t('settings.appearance')}
              >
                <div className="space-y-6">
                  <div>
                    <SegmentedControl
                      name="theme"
                      label={t('settings.theme')}
                      options={themeOptions}
                      value={theme}
                      onChange={setTheme}
                    />
                    <p className="text-secondary text-body-sm mt-2">
                      {t('settings.themeHint')}
                    </p>
                  </div>

                  <div className="border-t border-border-subtle pt-5">
                    <SegmentedControl
                      name="textSize"
                      label={t('settings.textSize')}
                      options={textSizeOptions}
                      value={textSize}
                      onChange={setTextSize}
                    />
                  </div>

                  <div className="border-t border-border-subtle pt-2">
                    <SwitchRow
                      id="reduce-motion-toggle"
                      label={t('settings.reduceMotion')}
                      description={t('settings.reduceMotionDesc')}
                      checked={reduceMotion}
                      onChange={setReduceMotion}
                    />
                  </div>
                </div>
              </SettingsCard>

              {/* Language */}
              <SettingsCard
                icon="language"
                title={t('settings.language')}
              >
                <SegmentedControl
                  name="language"
                  options={languageOptions}
                  value={language}
                  onChange={setLanguage}
                />
              </SettingsCard>

              {/* Threshold Guide */}
              <SettingsCard
                icon="tune"
                title={t('settings.thresholdsTitle')}
                description={t('settings.thresholdsDesc')}
              >
                <ThresholdGuide />
              </SettingsCard>
            </div>

            {/* Right Column (4 cols): Account, About, Reset */}
            <div className="lg:col-span-4 space-y-6">
              {/* Account */}
              <SettingsCard
                icon="person"
                title={t('settings.account')}
                description={t('settings.accountDesc')}
              >
                <Link
                  to="/profile"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container-low border border-border-subtle px-4 py-2.5 font-medium text-body-sm text-on-background hover:bg-surface-container-high transition-colors w-full"
                >
                  <span className="material-symbols-outlined text-[20px]">account_circle</span>
                  <span>{t('settings.openProfile')}</span>
                </Link>
              </SettingsCard>

              {/* About */}
              <SettingsCard
                icon="info"
                title={t('settings.about')}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <span className="text-secondary text-body-sm">{t('common.appName')}</span>
                    <span className="font-semibold text-on-background">{t('common.appName')}</span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <span className="text-secondary text-body-sm">{t('settings.version')}</span>
                    <span className="font-mono text-body-sm font-semibold text-on-background">
                      {appVersion}
                    </span>
                  </div>

                  {isFarmer && (
                    <div className="pt-1">
                      <div className="text-secondary text-body-sm mb-1.5 font-medium">
                        {t('settings.contactManager')}
                      </div>
                      {user?.manager ? (
                        <div className="p-3 rounded-lg bg-surface-container-low border border-border-subtle">
                          <p className="font-semibold text-on-background">
                            {user.manager.firstName} {user.manager.lastName}
                          </p>
                          {user.manager.phone && (
                            <a
                              href={`tel:${user.manager.phone}`}
                              className="inline-flex items-center gap-1.5 text-primary hover:underline text-body-sm mt-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">call</span>
                              <span>{user.manager.phone}</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-secondary text-body-sm">
                          {t('profile.noManagerAssigned')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </SettingsCard>

              {/* Reset Preferences */}
              <SettingsCard
                icon="restart_alt"
                title={t('settings.reset')}
                description={t('settings.resetDesc')}
              >
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-error text-on-error hover:opacity-90 px-4 py-2.5 font-medium text-body-sm transition-opacity w-full cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                  <span>{t('settings.reset')}</span>
                </button>
              </SettingsCard>
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={confirmResetOpen}
          title={t('settings.resetConfirmTitle')}
          message={t('settings.resetConfirmMessage')}
          confirmLabel={t('settings.reset')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleReset}
          onCancel={() => setConfirmResetOpen(false)}
          variant="danger"
        />
      </main>
    </div>
  );
}
