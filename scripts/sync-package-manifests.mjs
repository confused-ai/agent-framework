#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  dependencyFields,
  discoverPackageDirs,
  localPackageVersions,
  packageJsonPath,
  readJson,
  readPackageJson,
  root,
  tsupBuildsCjs,
} from './package-workspaces.mjs';

const checkOnly = process.argv.includes('--check');
const localVersions = localPackageVersions();
let changed = 0;
const cleanTsupBuildScript = 'node -e "require(\'node:fs\').rmSync(\'dist\',{recursive:true,force:true})" && tsup';
const requiredRootSubpaths = new Map([
  ['@confused-ai/adapter-redis', 'adapter-redis'],
  ['@confused-ai/agentic', 'agentic'],
  ['@confused-ai/artifacts', 'artifacts'],
  ['@confused-ai/background', 'background'],
  ['@confused-ai/cli', 'cli'],
  ['@confused-ai/compression', 'compression'],
  ['@confused-ai/config', 'config'],
  ['@confused-ai/context', 'context'],
  ['@confused-ai/contracts', 'contracts'],
  ['@confused-ai/core', 'core'],
  ['@confused-ai/db', 'db'],
  ['@confused-ai/eval', 'eval'],
  ['@confused-ai/execution', 'execution'],
  ['@confused-ai/graph', 'graph'],
  ['@confused-ai/guard', 'guard'],
  ['@confused-ai/guardrails', 'guardrails'],
  ['@confused-ai/knowledge', 'knowledge'],
  ['@confused-ai/learning', 'learning'],
  ['@confused-ai/memory', 'memory'],
  ['@confused-ai/models', 'models'],
  ['@confused-ai/observe', 'observe'],
  ['@confused-ai/orchestration', 'orchestration'],
  ['@confused-ai/planner', 'planner'],
  ['@confused-ai/playground', 'playground'],
  ['@confused-ai/plugins', 'plugins'],
  ['@confused-ai/production', 'production'],
  ['@confused-ai/reasoning', 'reasoning'],
  ['@confused-ai/router', 'router'],
  ['@confused-ai/scheduler', 'scheduler'],
  ['@confused-ai/sdk', 'sdk'],
  ['@confused-ai/serve', 'serve'],
  ['@confused-ai/session', 'session'],
  ['@confused-ai/shared', 'shared'],
  ['@confused-ai/skills', 'skills'],
  ['@confused-ai/storage', 'storage'],
  ['@confused-ai/test-utils', 'test-utils'],
  ['@confused-ai/tools', 'tools'],
  ['@confused-ai/video', 'video'],
  ['@confused-ai/voice', 'voice'],
  ['@confused-ai/workflow', 'workflow'],
]);

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function npmRangeFor(depName, field) {
  const version = localVersions.get(depName);
  if (!version) return undefined;
  return field === 'devDependencies' ? `^${version}` : version;
}

function syncDependencyRanges(pkg) {
  for (const field of dependencyFields) {
    const deps = pkg[field];
    if (!deps) continue;

    for (const [depName, range] of Object.entries(deps)) {
      const wanted = npmRangeFor(depName, field);
      if (!wanted) continue;

      if (typeof range === 'string' && (range.startsWith('workspace:') || range === '*')) {
        deps[depName] = wanted;
      }
    }
  }
}

function syncExports(pkg, hasCjs) {
  const exportsField = pkg.exports && typeof pkg.exports === 'object' && !Array.isArray(pkg.exports)
    ? { ...pkg.exports }
    : {};

  exportsField['.'] = hasCjs
    ? {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      }
    : {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      };

  for (const [subpath, value] of Object.entries(exportsField)) {
    if (subpath === '.' || !value || typeof value !== 'object' || Array.isArray(value)) continue;

    const next = {};
    if (typeof value.types === 'string') next.types = value.types;
    if (typeof value.import === 'string') next.import = value.import;
    if (hasCjs) {
      if (typeof value.require === 'string') {
        next.require = value.require;
      } else if (typeof value.import === 'string' && value.import.endsWith('.js')) {
        next.require = value.import.replace(/\.js$/, '.cjs');
      }
    } else if (typeof value.require === 'string') {
      next.require = value.require;
    }

    for (const [key, nested] of Object.entries(value)) {
      if (!(key in next)) next[key] = nested;
    }

    exportsField[subpath] = next;
  }

  pkg.exports = { '.': exportsField['.'] };
  for (const [key, value] of Object.entries(exportsField)) {
    if (key !== '.') pkg.exports[key] = value;
  }
}

function syncPackage(pkgDir) {
  const pkgPath = packageJsonPath(pkgDir);
  const original = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(original);
  const hasCjs = tsupBuildsCjs(pkgDir);

  pkg.main = hasCjs ? './dist/index.cjs' : './dist/index.js';
  pkg.module = './dist/index.js';
  pkg.types = './dist/index.d.ts';

  syncExports(pkg, hasCjs);

  if (!Array.isArray(pkg.files)) {
    pkg.files = ['dist'];
  } else if (!pkg.files.includes('dist')) {
    pkg.files = ['dist', ...pkg.files];
  }

  pkg.sideEffects = false;
  if (pkg.scripts?.build === 'tsup') {
    pkg.scripts.build = cleanTsupBuildScript;
  }
  syncDependencyRanges(pkg);

  const publishConfig = pkg.publishConfig && typeof pkg.publishConfig === 'object' ? { ...pkg.publishConfig } : {};
  delete publishConfig.main;
  delete publishConfig.module;
  delete publishConfig.types;
  delete publishConfig.exports;
  if (pkg.private !== true && pkg.name?.startsWith('@confused-ai/')) {
    publishConfig.access = 'public';
  }
  if (Object.keys(publishConfig).length) pkg.publishConfig = publishConfig;
  else delete pkg.publishConfig;

  const next = stableStringify(pkg);
  if (next !== original) {
    changed++;
    if (!checkOnly) writeFileSync(pkgPath, next, 'utf8');
    console.log(`${checkOnly ? 'would update' : 'updated'} ${pkg.name}`);
  }
}

function syncRootPackage() {
  const rootPkgPath = resolve(root, 'package.json');
  const original = readFileSync(rootPkgPath, 'utf8');
  const rootPkg = JSON.parse(original);

  rootPkg.dependencies ??= {};
  for (const [pkgName] of requiredRootSubpaths) {
    const version = localVersions.get(pkgName);
    if (version) rootPkg.dependencies[pkgName] = version;
  }

  rootPkg.exports ??= {};
  for (const [, subpath] of requiredRootSubpaths) {
    const key = `./${subpath}`;
    rootPkg.exports[key] = {
      types: `./dist/${subpath}.d.ts`,
      import: `./dist/${subpath}.js`,
      require: `./dist/${subpath}.cjs`,
    };
  }

  rootPkg.exports['./test-utils/conformance'] = {
    types: './dist/test-utils/conformance.d.ts',
    import: './dist/test-utils/conformance.js',
    require: './dist/test-utils/conformance.cjs',
  };

  const next = stableStringify(rootPkg);
  if (next !== original) {
    changed++;
    if (!checkOnly) writeFileSync(rootPkgPath, next, 'utf8');
    console.log(`${checkOnly ? 'would update' : 'updated'} confused-ai root manifest`);
  }
}

for (const pkgDir of discoverPackageDirs()) {
  syncPackage(pkgDir);
}
syncRootPackage();

if (checkOnly && changed > 0) {
  console.error(`\n${changed} package manifest files need sync. Run npm run package:sync.`);
  process.exit(1);
}

console.log(`\n${changed} package manifest files ${checkOnly ? 'need sync' : 'updated'}.`);
