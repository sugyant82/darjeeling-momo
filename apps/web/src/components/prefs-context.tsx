'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { HTML_LANG, LANG_KEY, langFromHtml, THEME_KEY, type Lang, type Theme } from '@/lib/prefs';

interface Prefs {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  toggleTheme: () => void;
}

const PrefsContext = createContext<Prefs | null>(null);

/**
 * Theme + language live on <html> (data-theme / lang), applied before paint by
 * PREFS_SCRIPT and updated by the setters. We read them through useSyncExternalStore
 * so the server/first-client render uses the SSR default (no hydration mismatch) and
 * the real values take over right after hydration — with no setState-in-effect.
 */
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

let osCleanup: (() => void) | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  // Follow the OS theme while the viewer hasn't chosen explicitly.
  if (!osCleanup && typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onOs = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch {
        /* ignore */
      }
      if (stored !== 'light' && stored !== 'dark') {
        document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
        emit();
      }
    };
    mq.addEventListener('change', onOs);
    osCleanup = () => mq.removeEventListener('change', onOs);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && osCleanup) {
      osCleanup();
      osCleanup = null;
    }
  };
}

function getSnapshot(): string {
  const el = document.documentElement;
  const theme = el.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  return `${theme}|${langFromHtml(el.getAttribute('lang'))}`;
}
function getServerSnapshot(): string {
  return 'light|en';
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [theme, lang] = snapshot.split('|') as [Theme, Lang];

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* storage unavailable */
    }
    emit();
  }, []);

  const setLang = useCallback((l: Lang) => {
    document.documentElement.setAttribute('lang', HTML_LANG[l]);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage unavailable */
    }
    emit();
  }, []);

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
