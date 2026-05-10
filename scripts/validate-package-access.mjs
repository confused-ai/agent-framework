#!/usr/bin/env node
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  dependencyFields,
  discoverPackageDirs,
  localPackageVersions,
  packageJsonPath,
  readJson,
  readPackageJson,
  relativeToRoot,
  root,
  walkExportTargets,
} from './package-workspaces.mjs';

const rootPkg = readJson(resolve(root, 'package.json'));
const localVersions = localPackageVersions();
const issues = [];

function addIssue(pkgName, message) {
  issues.push(`${pkgName}: ${message}`);
}

function validateExportTargets(pkgName, pkgDir, exportsField) {
  for (const target of walkExportTargets(exportsField)) {
    if (!target.startsWith('./')) continue;
    const targetPath = resolve(pkgDir, target);
    if (!existsSync(targetPath)) {
      addIssue(pkgName, `export target missing: ${target}`);
    }
  }
}

for (const pkgDir of discoverPackageDirs({ includePrivate: false })) {
  const pkg = readPackageJson(pkgDir);
  const pkgName = pkg.name;
  const shortName = pkgName.replace('@confused-ai/', '');

  if (!existsSync(resolve(pkgDir, 'dist'))) {
    addIssue(pkgName, `dist/ missing at ${relativeToRoot(pkgDir)}`);
  }

  if (pkg.sideEffects !== false) addIssue(pkgName, 'sideEffects must be false');
  if (!Array.isArray(pkg.files) || !pkg.files.includes('dist')) addIssue(pkgName, 'files must include dist');
  if (!pkg.main) addIssue(pkgName, 'main missing');
  if (!pkg.module) addIssue(pkgName, 'module missing');
  if (!pkg.types) addIssue(pkgName, 'types missing');
  if (!pkg.exports?.['.']) addIssue(pkgName, 'exports["."] missing');

  for (const field of dependencyFields) {
    for (const [depName, range] of Object.entries(pkg[field] || {})) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        addIssue(pkgName, `${field}.${depName} still uses ${range}`);
      }

      if ((field === 'dependencies' || field === 'optionalDependencies') && localVersions.has(depName)) {
        const wanted = localVersions.get(depName);
        if (range !== wanted) {
          addIssue(pkgName, `${field}.${depName} should be ${wanted}, got ${range}`);
        }
      }
    }
  }

  validateExportTargets(pkgName, pkgDir, pkg.exports);

  if (rootPkg.dependencies?.[pkgName] !== pkg.version) {
    addIssue('confused-ai', `missing root dependency ${pkgName}@${pkg.version}`);
  }

  if (!rootPkg.exports?.[`./${shortName}`]) {
    addIssue('confused-ai', `missing root subpath export ./${shortName}`);
  }
}

validateExportTargets('confused-ai', root, rootPkg.exports);

if (issues.length) {
  console.error(`Package access validation failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Package access validation passed for ${discoverPackageDirs({ includePrivate: false }).length} packages.`);
