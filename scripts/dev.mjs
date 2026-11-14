#!/usr/bin/env node
/**
 * `pnpm dev` — starts everything for local development:
 *   • ensures local Supabase is running
 *   • serves Edge Functions (create-payment, confirm-mock-payment, webhook, …)
 *   • runs the website on http://localhost:3000
 *   • starts the Expo dev server (scan the QR with Expo Go)
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(join(root, 'apps', 'web', '.env.local'))) {
  console.error('\n✗ No local env found. Run `pnpm setup:local` first.\n');
  process.exit(1);
}

// Ensure Supabase is up (idempotent).
try {
  execSync('pnpm exec supabase status', { cwd: root, stdio: 'ignore' });
  console.log('✓ Supabase already running');
} catch {
  console.log('→ Starting local Supabase…');
  execSync('pnpm exec supabase start', { cwd: root, stdio: 'inherit' });
}

const procs = [];
function start(name, cmd, args, color) {
  const child = spawn(cmd, args, { cwd: root, shell: process.platform === 'win32' });
  const tag = `\x1b[${color}m[${name}]\x1b[0m`;
  const pipe = (stream, out) => {
    stream.on('data', (d) => {
      for (const line of d.toString().split('\n')) {
        if (line.trim()) out.write(`${tag} ${line}\n`);
      }
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    process.stdout.write(`${tag} exited (${code})\n`);
  });
  procs.push(child);
}

console.log('→ Starting Edge Functions, web and mobile…\n');

start(
  'functions',
  'pnpm',
  ['exec', 'supabase', 'functions', 'serve', '--env-file', 'supabase/functions/.env'],
  '35',
);
start('web', 'pnpm', ['--filter', '@darjeeling/web', 'dev'], '36');
start('mobile', 'pnpm', ['--filter', '@darjeeling/mobile', 'dev'], '33');

function shutdown() {
  console.log('\n→ Shutting down dev processes…');
  for (const p of procs) p.kill('SIGTERM');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
