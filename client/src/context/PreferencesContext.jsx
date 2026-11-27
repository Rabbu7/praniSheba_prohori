import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'prohori_theme';
const TEXT_SIZE_KEY = 'prohori_text_size';
const REDUCE_MOTION_KEY = 'prohori_reduce_motion';

const PreferencesContext = createContext(null);

function getInitialTheme() {
  try {
    const val = localStorage.getItem(THEME_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') return val;
  } catch {
    // Ignore localStorage errors
  }
  return 'system';
}

function getInitialTextSize() {
  try {
    const val = localStorage.getItem(TEXT_SIZE_KEY);
    if (val === 'large' || val === 'normal') return val;
  } catch {
    // Ignore localStorage errors
  }
  return 'normal';
}

function getInitialStoredMotion() {
  try {
    const val = localStorage.getItem(REDUCE_MOTION_KEY);
    if (val === 'true') return true;
    if (val === 'false') return false;
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

export function PreferencesProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [textSize, setTextSizeState] = useState(getInitialTextSize);
  const [storedMotion, setStoredMotion] = useState(getInitialStoredMotion);

  // System media query states
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const [systemReducedMotion, setSystemReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  // Listen to OS prefers-color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Listen to OS prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setSystemReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme = useMemo(() => {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return 'light';
    return systemDark ? 'dark' : 'light';
  }, [theme, systemDark]);

  const reduceMotion = storedMotion !== null ? storedMotion : systemReducedMotion;

  const setTheme = (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'system') return;
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // Ignore
    }
  };

  const setTextSize = (newSize) => {
    if (newSize !== 'normal' && newSize !== 'large') return;
    setTextSizeState(newSize);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, newSize);
    } catch {
      // Ignore
    }
  };

  const setReduceMotion = (val) => {
    const boolVal = Boolean(val);
    setStoredMotion(boolVal);
    try {
      localStorage.setItem(REDUCE_MOTION_KEY, String(boolVal));
    } catch {
      // Ignore
    }
  };

  const resetPreferences = () => {
    try {
      localStorage.removeItem(THEME_KEY);
      localStorage.removeItem(TEXT_SIZE_KEY);
      localStorage.removeItem(REDUCE_MOTION_KEY);
    } catch {
      // Ignore
    }
    setThemeState('system');
    setTextSizeState('normal');
    setStoredMotion(null);
  };

  // Synchronize attributes on document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    root.setAttribute('data-text-size', textSize);
    root.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false');
  }, [resolvedTheme, textSize, reduceMotion]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      textSize,
      setTextSize,
      reduceMotion,
      setReduceMotion,
      resetPreferences,
    }),
    [theme, resolvedTheme, textSize, reduceMotion]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
