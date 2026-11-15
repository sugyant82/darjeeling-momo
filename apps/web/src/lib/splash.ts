/**
 * Decides, before first paint, whether the home-page splash plays (see components/splash.tsx).
 * Rendered as an inline script in the root layout's <head>. It sets
 * <html data-splash="show"> only on a tab's first full load, and only at "/";
 * every other load gets data-splash="skip". The flag lives in sessionStorage, so a
 * new tab replays the splash but refreshes and later navigations do not.
 */
const STORAGE_KEY = 'dm_splash_seen';

export const SPLASH_SCRIPT = `(function(){var d=document.documentElement,s="skip";try{if(!sessionStorage.getItem("${STORAGE_KEY}")){sessionStorage.setItem("${STORAGE_KEY}","1");if(location.pathname==="/")s="show"}}catch(e){}d.setAttribute("data-splash",s)})()`;
