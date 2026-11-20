/**
 * Viewer preferences that must be applied before first paint to avoid a flash:
 * colour theme (light/dark) and language (en/hi). PREFS_SCRIPT runs in <head>
 * and sets data-theme + lang on <html> from localStorage (theme falls back to the
 * OS setting). components/prefs-context.tsx reads these same values.
 */
export type Theme = 'light' | 'dark';
export type Lang = 'en' | 'hi';

export const THEME_KEY = 'dm_theme';
export const LANG_KEY = 'dm_lang';

/** BCP-47 tag for the <html lang> attribute. */
export const HTML_LANG: Record<Lang, string> = { en: 'en-NZ', hi: 'hi-IN' };

export const PREFS_SCRIPT = `(function(){try{var d=document.documentElement;
var t=localStorage.getItem('${THEME_KEY}');
if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}
d.setAttribute('data-theme',t);
var l=localStorage.getItem('${LANG_KEY}');if(l!=='hi'&&l!=='en'){l='en';}
d.setAttribute('lang',l==='hi'?'hi-IN':'en-NZ');
}catch(e){}})()`;
