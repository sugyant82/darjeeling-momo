'use client';

import { useEffect, useRef } from 'react';
import { BrandLockup, PrayerFlags } from './brand';

/**
 * Logo-reveal splash for the first load of the home page in a browser tab.
 *
 * Visibility is decided before first paint by SPLASH_SCRIPT (lib/splash.ts, in the
 * root layout <head>), which sets <html data-splash="show" | "skip">. The reveal and
 * the fade-out are pure CSS, so the splash always clears itself even if JavaScript is
 * slow or fails. This component only adds tap/key-to-skip and retires the splash once
 * the visitor leaves the home page, so client-side navigation back home never replays it.
 */

let pendingRetire: ReturnType<typeof setTimeout> | undefined;

function retire() {
  const root = document.documentElement;
  if (root.dataset.splash === 'show') root.dataset.splash = 'done';
}

export function Splash() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // StrictMode re-runs effects in development; cancel the retire queued by that cleanup.
    clearTimeout(pendingRetire);
    const el = ref.current;
    if (!el || document.documentElement.dataset.splash !== 'show') return;

    const stopListening = () => {
      el.removeEventListener('click', skip);
      window.removeEventListener('keydown', skip);
    };
    // Only the overlay's own exits count; children's animationend events bubble up too.
    const onAnimationEnd = (e: AnimationEvent) => {
      if (e.target !== el || e.pseudoElement) return;
      if (e.animationName === 'splash-out') stopListening();
      if (e.animationName === 'splash-skip') retire();
    };
    function skip() {
      // Once the natural fade-out has begun, let it finish rather than restarting a fade.
      const fading = el!
        .getAnimations()
        .some(
          (a) =>
            a instanceof CSSAnimation &&
            a.animationName === 'splash-out' &&
            a.effect?.getComputedTiming().progress != null,
        );
      if (fading) return;
      stopListening();
      el!.dataset.leaving = 'true';
    }
    el.addEventListener('click', skip);
    window.addEventListener('keydown', skip);
    el.addEventListener('animationend', onAnimationEnd);

    return () => {
      stopListening();
      el.removeEventListener('animationend', onAnimationEnd);
      pendingRetire = setTimeout(retire, 0);
    };
  }, []);

  return (
    <div ref={ref} className="splash" aria-hidden="true">
      <div className="splash-inner">
        <PrayerFlags variant="navy" className="splash-flags" />
        <BrandLockup variant="navy" className="splash-lockup" />
        <p className="splash-greeting" lang="mi">
          Kia ora
        </p>
      </div>
    </div>
  );
}
