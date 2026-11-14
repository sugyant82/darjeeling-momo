#!/usr/bin/env node
/**
 * Copies brand assets from resources/ into the canonical brand/ folder, then
 * distributes them to where each app needs them (web public/, mobile assets/).
 * Idempotent — safe to run any time. Part of `pnpm setup:local`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resources = join(root, 'resources');
const icons = join(resources, 'darjeeling-momo-icons');
const brand = join(root, 'brand');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}
function copy(from, to) {
  if (!existsSync(from)) {
    console.warn(`  ! missing source, skipped: ${from}`);
    return false;
  }
  ensureDir(dirname(to));
  copyFileSync(from, to);
  return true;
}

console.log('→ Collecting brand assets into brand/');
ensureDir(brand);

// Icons & favicons from resources/darjeeling-momo-icons
const iconFiles = [
  'app-icon-1024.png',
  'app-icon-512.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'favicon.ico',
  'favicon.svg',
  'favicon-16.png',
  'favicon-32.png',
  'favicon-48.png',
  'app-icon.svg',
  'app-icon-rounded.svg',
];
for (const f of iconFiles) copy(join(icons, f), join(brand, f));

// Logos (prefer @2x). Resources use fancy filenames with em-dashes.
const logoNavy = findFirst(resources, [/Logo file .* navy@2x\.png$/i, /Logo file .* navy@1x\.png$/i]);
const logoLight = findFirst(resources, [
  /Logo file .* light.*@2x\.png$/i,
  /Logo file .* light.*@1x\.png$/i,
]);
if (logoNavy) copy(logoNavy, join(brand, 'logo-navy.png'));
if (logoLight) copy(logoLight, join(brand, 'logo-light.png'));

// Splash: indigo background with the icon centred (SVG, generated).
writeFileSync(join(brand, 'splash.svg'), splashSvg());

console.log('→ Distributing to apps');

// ---- Web: apps/web/public ----
const webPublic = join(root, 'apps', 'web', 'public');
const webIcons = join(webPublic, 'icons');
for (const f of [
  'favicon.ico',
  'favicon.svg',
  'favicon-16.png',
  'favicon-32.png',
  'favicon-48.png',
]) {
  copy(join(brand, f), join(webPublic, f));
}
for (const f of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  copy(join(brand, f), join(webIcons, f));
}
copy(join(brand, 'logo-navy.png'), join(webPublic, 'logo-navy.png'));
copy(join(brand, 'logo-light.png'), join(webPublic, 'logo-light.png'));

// Placeholder menu images (neutral, SAMPLE).
const webImages = join(webPublic, 'images');
ensureDir(webImages);
writeFileSync(join(webImages, 'placeholder-momo.svg'), placeholderSvg('Momo'));
writeFileSync(join(webImages, 'placeholder-side.svg'), placeholderSvg('Side'));
writeFileSync(join(webImages, 'placeholder-drink.svg'), placeholderSvg('Drink'));

// ---- Mobile: apps/mobile/assets ----
const mobileAssets = join(root, 'apps', 'mobile', 'assets');
ensureDir(mobileAssets);
copy(join(brand, 'app-icon-1024.png'), join(mobileAssets, 'icon.png'));
copy(join(brand, 'app-icon-1024.png'), join(mobileAssets, 'adaptive-icon.png'));
copy(join(brand, 'app-icon-1024.png'), join(mobileAssets, 'splash-icon.png'));
copy(join(brand, 'icon-192.png'), join(mobileAssets, 'favicon.png'));

console.log('✓ Brand assets ready.\n');

// ---------------------------------------------------------------------------
function findFirst(dir, patterns) {
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir);
  for (const pattern of patterns) {
    const match = names.find((n) => pattern.test(n));
    if (match) return join(dir, match);
  }
  return null;
}

function splashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1284" height="2778" viewBox="0 0 1284 2778">
  <rect width="1284" height="2778" fill="#1F2A44"/>
  <image href="app-icon.svg" x="462" y="1109" width="360" height="360"/>
</svg>
`;
}

function placeholderSvg(label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" role="img" aria-label="${label} placeholder">
  <rect width="400" height="300" fill="#FBF6EC"/>
  <rect x="8" y="8" width="384" height="284" rx="16" fill="#FFFFFF" stroke="#E4DCCB" stroke-width="2"/>
  <circle cx="200" cy="130" r="54" fill="#E8A33D"/>
  <path d="M150 130 q50 -60 100 0" fill="none" stroke="#1F2A44" stroke-width="6" stroke-linecap="round"/>
  <text x="200" y="230" font-family="Inter, sans-serif" font-size="22" fill="#4A5168" text-anchor="middle">${label} · SAMPLE</text>
</svg>
`;
}
