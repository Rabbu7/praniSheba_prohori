import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageToggle({ className = '' }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`inline-flex items-center rounded-full bg-surface-container-low p-0.5 border border-border-subtle text-xs font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          language === 'en'
            ? 'bg-primary text-white font-semibold'
            : 'text-on-surface-variant hover:text-on-background'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          language === 'bn'
            ? 'bg-primary text-white font-semibold'
            : 'text-on-surface-variant hover:text-on-background'
        }`}
        aria-pressed={language === 'bn'}
      >
        বাং
      </button>
    </div>
  );
}
