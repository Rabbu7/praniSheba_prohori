import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import en from '../locales/en.json';
import bn from '../locales/bn.json';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'prohori_lang';
const DICTIONARIES = { en, bn };

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'bn' || saved === 'en') {
        return saved;
      }
      if (typeof navigator !== 'undefined' && navigator.language?.startsWith('bn')) {
        return 'bn';
      }
      return 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = useCallback((lang) => {
    const next = lang === 'bn' ? 'bn' : 'en';
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'bn' ? 'bn' : 'en';
  }, [language]);

  const t = useCallback((key, params) => {
    const dict = DICTIONARIES[language] || DICTIONARIES.en;
    let template = getNestedValue(dict, key);
    if (!template && language !== 'en') {
      template = getNestedValue(DICTIONARIES.en, key);
    }
    if (!template) {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation for key: "${key}" in language "${language}"`);
      }
      return key;
    }
    if (params && typeof params === 'object') {
      return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, varName) => {
        return params[varName] !== undefined ? String(params[varName]) : `{{${varName}}}`;
      });
    }
    return template;
  }, [language]);

  const translateError = useCallback((err, fallbackKey = 'errors.UNKNOWN_ERROR') => {
    if (!err) return '';
    // Network failure (no response from server)
    const isAxios = Boolean(err.isAxiosError || err.name === 'AxiosError' || err.config);
    if (isAxios && !err.response) {
      return t('errors.SERVER_UNREACHABLE');
    }
    // Stable error code lookup
    const code = err?.response?.data?.error?.code || err?.code;
    if (code) {
      const key = `errors.${code}`;
      const translated = t(key);
      if (translated !== key) {
        return translated;
      }
    }
    // Backend message from response
    const backendMsg = err?.response?.data?.error?.message;
    if (backendMsg && typeof backendMsg === 'string') {
      return backendMsg;
    }
    // Only use err.message for non-axios/native exceptions
    if (!isAxios && err?.message && typeof err.message === 'string') {
      return err.message;
    }
    return t(fallbackKey);
  }, [t]);

  const translateLocation = useCallback((name, type = 'district') => {
    if (!name) return '';
    const key = type === 'division' ? `locations.divisions.${name}` : `locations.districts.${name}`;
    const translated = t(key);
    return translated !== key ? translated : name;
  }, [t]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    translateError,
    translateLocation,
    isBangla: language === 'bn'
  }), [language, setLanguage, t, translateError, translateLocation]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
