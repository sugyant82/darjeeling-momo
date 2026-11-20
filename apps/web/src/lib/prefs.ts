/**
 * Viewer preferences that must be applied before first paint to avoid a flash:
 * colour theme (light/dark) and language (en/hi). PREFS_SCRIPT runs in <head>
 * and sets data-theme + lang on <html> from localStorage (theme falls back to the
 * OS setting). components/prefs-context.tsx reads these same values.
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

export const PREFS_SCRIPT = `(function(){try{var d=document.documentElement;
var t=localStorage.getItem('${THEME_KEY}');
if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}
d.setAttribute('data-theme',t);
var l=localStorage.getItem('${LANG_KEY}');var m={hi:'hi-IN',ne:'ne-NP',en:'en-NZ'};
d.setAttribute('lang',m[l]||'en-NZ');
}catch(e){}})()`;
