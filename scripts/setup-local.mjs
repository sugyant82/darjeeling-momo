#!/usr/bin/env node
/**
 * One-time local setup:
 *   1. copy brand assets
 *   2. start local Supabase (Docker)
 *   3. apply migrations + seed the SAMPLE menu
 *   4. write local .env files from `supabase status`
 * After this, run `pnpm dev`.
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

function check(cmd, name, hint) {
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch {
    console.error(`\n✗ ${name} is required but was not found.\n  ${hint}\n`);
    process.exit(1);
  }
}

console.log('\n🥟  Darjeeling Momo — local setup\n');

check('docker info', 'Docker', 'Install Docker Desktop and make sure it is running.');

console.log('1/4  Brand assets');
run('node scripts/copy-brand.mjs');

console.log('2/4  Starting local Supabase (first run downloads Docker images; be patient)…');
run('pnpm exec supabase start');

console.log('3/4  Applying migrations + seeding the SAMPLE menu…');
run('pnpm exec supabase db reset');

console.log('4/4  Writing local .env files…');
run('node scripts/write-local-env.mjs');

console.log('\n✓ Setup complete.\n');
console.log('Next:  pnpm dev');
console.log('  • Web:     http://localhost:3000');
console.log('  • Admin:   http://localhost:3000/admin   (sign in as staff/admin)');
console.log('  • Studio:  http://localhost:54323');
console.log('  • Mail:    http://localhost:54324   (dev magic links land here)');
console.log('  • Mobile:  scan the Expo QR with Expo Go\n');
console.log('Dev sign-in users (password: momo1234):');
console.log('  customer@darjeeling.test · staff@darjeeling.test · admin@darjeeling.test\n');
