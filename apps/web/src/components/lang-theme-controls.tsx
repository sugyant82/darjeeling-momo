'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Moon, Sun } from 'lucide-react';
import { usePrefs } from './prefs-context';
import { useT } from '@/lib/i18n';
import { FlagIndia, FlagNZ } from './flags';
import type { Lang } from '@/lib/prefs';

const LANGS: { code: Lang; Flag: typeof FlagNZ }[] = [
  { code: 'en', Flag: FlagNZ },
  { code: 'hi', Flag: FlagIndia },
];

/** Dark-mode toggle + language dropdown (round flag + name), for the header. */
export function LangThemeControls() {
  const { theme, toggleTheme, lang, setLang } = usePrefs();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const Current = LANGS.find((l) => l.code === lang) ?? LANGS[0]!;

  return (
    <div className="header-controls">
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
        aria-pressed={theme === 'dark'}
      >
        {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      </button>

      <div className="lang-switch" ref={ref}>
        <button
          type="button"
          className="lang-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('lang.label')}
          onClick={() => setOpen((o) => !o)}
        >
          <Current.Flag size={20} />
          <span className="lang-code">{lang.toUpperCase()}</span>
          <ChevronDown size={14} aria-hidden="true" className={`lang-caret${open ? ' is-open' : ''}`} />
        </button>
        {open ? (
          <ul className="lang-menu" role="menu" aria-label={t('lang.label')}>
            {LANGS.map(({ code, Flag }) => (
              <li key={code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={lang === code}
                  className={`lang-option${lang === code ? ' is-active' : ''}`}
                  onClick={() => {
                    setLang(code);
                    setOpen(false);
                  }}
                >
                  <Flag size={22} />
                  <span>{t(code === 'hi' ? 'lang.hi' : 'lang.en')}</span>
                  {lang === code ? <Check size={16} aria-hidden="true" className="lang-check" /> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
