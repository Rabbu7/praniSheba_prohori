import React from 'react';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = usePreferences();
  const { t } = useLanguage();

  const isDark = resolvedTheme === 'dark';

  const handleClick = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const label = isDark ? t('settings.switchToLight') : t('settings.switchToDark');

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      aria-label={label}
      className="flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
    >
      <span className="material-symbols-outlined text-[24px]">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
