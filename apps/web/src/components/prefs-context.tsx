'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { HTML_LANG, LANG_KEY, THEME_KEY, type Lang, type Theme } from '@/lib/prefs';

interface Prefs {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  toggleTheme: () => void;
}

const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  // Start from the SSR defaults so the first client render matches the server HTML
  // (no hydration mismatch), then sync to what PREFS_SCRIPT applied before paint.
  // The page colours are already correct via <html data-theme>, so there is no theme flash.
  const [theme, setThemeState] = useState<Theme>('light');
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const domTheme = document.documentElement.getAttribute('data-theme');
    if (domTheme === 'dark' || domTheme === 'light') setThemeState(domTheme);
    setLangState(document.documentElement.lang === 'hi-IN' ? 'hi' : 'en');
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.setAttribute('lang', HTML_LANG[l]);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Follow OS theme changes only while the viewer hasn't chosen explicitly.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch {
        /* ignore */
      }
      if (stored !== 'light' && stored !== 'dark') setTheme(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setTheme]);

  const value = useMemo<Prefs>(
    () => ({ theme, lang, setTheme, setLang, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
    [theme, lang, setTheme, setLang],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
