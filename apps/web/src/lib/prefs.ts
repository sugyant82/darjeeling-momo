/**
 * Viewer preferences that must be applied before first paint to avoid a flash:
 * colour theme (light/dark) and language (en/hi/ne). PREFS_SCRIPT runs in <head>
 * and sets data-theme + lang on <html> from localStorage, defaulting to light +
 * English when nothing is saved. components/prefs-context.tsx reads these values.
 */
export type Theme = 'light' | 'dark';
export type Lang = 'en' | 'hi' | 'ne';

export const THEME_KEY = 'dm_theme';
export const LANG_KEY = 'dm_lang';

/** BCP-47 tag for the <html lang> attribute. */
export const HTML_LANG: Record<Lang, string> = { en: 'en-NZ', hi: 'hi-IN', ne: 'ne-NP' };

/** Reverse of HTML_LANG, for reading the attribute back. */
export function langFromHtml(tag: string | null | undefined): Lang {
  if (tag === 'hi-IN') return 'hi';
  if (tag === 'ne-NP') return 'ne';
  return 'en';
}

// First visit always starts light + English (we ignore the OS setting); a saved
// choice is restored on return visits.
export const PREFS_SCRIPT = `(function(){try{var d=document.documentElement;
var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t='light';}
d.setAttribute('data-theme',t);
var l=localStorage.getItem('${LANG_KEY}');var m={hi:'hi-IN',ne:'ne-NP',en:'en-NZ'};
d.setAttribute('lang',m[l]||'en-NZ');
}catch(e){}})()`;
