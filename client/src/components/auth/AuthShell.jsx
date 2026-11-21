import React from 'react';
import logo from '../../assets/logo.jpeg';
import LanguageToggle from '../common/LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';

export default function AuthShell({ title, eyebrow, children, footer }) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-surface text-on-background lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-on-primary lg:flex lg:flex-col lg:justify-between xl:p-20">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-32 border-on-primary/10" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border-48 border-on-primary/10" />
        <div className="relative z-10 flex items-center gap-4">
          <img src={logo} alt={t('common.logoAlt')} className="h-14 w-14 rounded-full object-cover ring-4 ring-on-primary/20" />
          <div>
            <p className="text-xl font-semibold tracking-tight">{t('common.appName')}</p>
            <p className="text-sm text-on-primary/70">{t('auth.brandSub')}</p>
          </div>
        </div>
        <div className="relative z-10 max-w-lg pb-8">
          <span className="mb-5 inline-flex rounded-full bg-on-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-on-primary/80">
            {t('auth.brandTag')}
          </span>
          <h2 className="text-4xl font-semibold leading-tight xl:text-5xl">
            {t('auth.brandHeadline')}
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-on-primary/75">
            {t('auth.brandDesc')}
          </p>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
        <div className="absolute top-6 right-6 z-10">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <img src={logo} alt={t('common.logoAlt')} className="h-11 w-11 rounded-full object-cover" />
            <div>
              <p className="font-semibold text-on-background">{t('common.appName')}</p>
              <p className="text-xs text-secondary">{t('auth.brandSub')}</p>
            </div>
          </div>
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-on-background sm:text-4xl">{title}</h1>
          </div>
          {children}
          <div className="mt-8 text-center text-sm text-secondary">{footer}</div>
        </div>
      </section>
    </main>
  );
}
