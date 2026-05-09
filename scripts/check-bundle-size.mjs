#!/usr/bin/env node
/**
 * scripts/check-bundle-size.mjs
 *
 * Bundles the public confused-ai entry point with esbuild, gzips the output,
 * and fails (exit 1) if the gzip size exceeds the 80 kB gate.
 *
 * Heavy optional deps (playwright, pg, openai, anthropic, ioredis, …) are
 * treated as externals — they must NOT appear in the bundle.
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs          # defaults
 *   BUNDLE_MAX_KB=120 node scripts/check-bundle-size.mjs  # custom limit
 */

import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MAX_GZIP_BYTES = Number(process.env.BUNDLE_MAX_KB ?? 80) * 1024;

// Known heavy optional peers — must never land in the bundle.
const EXTERNAL = [
  'playwright',
  'playwright-core',
  'pg',
  'pg-native',
  'better-sqlite3',
  'openai',
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  'ioredis',
  'pdf-parse',
  '@aws-sdk/client-secrets-manager',
  '@azure/keyvault-secrets',
  '@azure/identity',
  '@google-cloud/secret-manager',
  'neo4j-driver',
  'chromadb',
  'bullmq',
  'ioredis',
  '@aws-sdk/client-sqs',
  'amqplib',
  'kafkajs',
  'js-tiktoken',
  '@anthropic-ai/sdk',
];

const entry = join(ROOT, 'src', 'index.ts');

const result = await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  minify: true,
  write: false,
  external: EXTERNAL,
  // Suppress warnings about dynamic imports (expected in optional-dep pattern).
  logLevel: 'error',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

const code = result.outputFiles[0].contents;
const gzipped = gzipSync(code);
const gzipKb = (gzipped.byteLength / 1024).toFixed(1);
const rawKb = (code.byteLength / 1024).toFixed(1);

const limitKb = (MAX_GZIP_BYTES / 1024).toFixed(0);
const status = gzipped.byteLength <= MAX_GZIP_BYTES ? '✓ PASS' : '✗ FAIL';

console.log(`Bundle size check`);
console.log(`  Raw:    ${rawKb} kB`);
console.log(`  Gzip:   ${gzipKb} kB  (limit: ${limitKb} kB)  ${status}`);

if (gzipped.byteLength > MAX_GZIP_BYTES) {
  console.error(
    `\nBundle exceeds the ${limitKb} kB gzip limit by ` +
    `${((gzipped.byteLength - MAX_GZIP_BYTES) / 1024).toFixed(1)} kB.\n` +
    `Check for accidental inclusion of heavy dependencies.\n` +
    `Tip: run with BUNDLE_MAX_KB=<new-limit> to temporarily raise the gate.`,
  );
  process.exit(1);
}
