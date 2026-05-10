/**
 * publish-packages.mjs — Publish all @confused-ai/* sub-packages to npm.
 *
 * Usage:
 *   node scripts/publish-packages.mjs           # publish all
 *   node scripts/publish-packages.mjs --dry-run  # dry run
 *   node scripts/publish-packages.mjs --access public
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { discoverPackageDirs, readPackageJson, relativeToRoot, root } from './package-workspaces.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipPrepare = args.includes('--skip-prepare');
const access = args.includes('--access') ? args[args.indexOf('--access') + 1] : 'public';

if (!skipPrepare) {
  console.log('Preparing packages before publish...\n');
  execSync('npm run package:prepare', { cwd: root, stdio: 'inherit' });
}

const packages = discoverPackageDirs({ includePrivate: false });
const missingDist = packages.filter((pkgDir) => !existsSync(resolve(pkgDir, 'dist')));

if (missingDist.length) {
  console.error('Cannot publish: these packages are missing dist/. Run npm run build:packages first.');
  for (const pkgDir of missingDist) {
    console.error(`  - ${relativeToRoot(pkgDir)}`);
  }
  process.exit(1);
}

console.log(`Publishing ${packages.length} packages (access=${access}, dryRun=${dryRun})\n`);

let ok = 0;
let failed = 0;
const failures = [];

for (const pkgDir of packages) {
  const pkgJson = readPackageJson(pkgDir);
  const name = pkgJson.name;
  const version = pkgJson.version;

  console.log(`\n─── Publishing ${name}@${version} ───`);

  const cmd = [
    'npm publish',
    `--access ${access}`,
    dryRun ? '--dry-run' : '',
  ].filter(Boolean).join(' ');

  try {
    // Use 'inherit' so interactive prompts (2FA, browser auth) work in terminal
    execSync(cmd, { cwd: pkgDir, stdio: 'inherit' });
    ok++;
  } catch (err) {
    const stdout = err.stdout?.toString() || '';
    const stderr = err.stderr?.toString() || '';
    const combined = stdout + stderr;
    if (combined.includes('cannot publish over') || combined.includes('E403')) {
      console.log('⚠ already published (skipping)');
      ok++;
    } else {
      console.log('✗ FAILED');
      const errLine = stderr.split('\n').find(l => l.trim() && !l.includes('npm warn')) || stderr.split('\n')[0] || '';
      console.error(`    ${errLine}`);
      failures.push({ name, err: errLine });
      failed++;
    }
  }
}

console.log(`\nResults: ${ok} published, ${failed} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  ${f.name}: ${f.err}`);
  process.exit(1);
}
