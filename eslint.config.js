/**
 * ESLint flat config with `eslint-plugin-boundaries`.
 *
 * Enforces the zero-dependency contract on the core/contracts modules:
 *   src/contracts/  — must not import from providers, plugins, or any external package
 *   src/core/       — must not import from providers, plugins, or adapters
 *
 * Install once:
 *   bun add -D eslint eslint-plugin-boundaries @typescript-eslint/parser
 *
 * Run:
 *   bunx eslint src/contracts src/core --max-warnings 0
 */

import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';
const packageTypeCheckedConfigs = tseslint.configs.strictTypeChecked.map((cfg) => ({
  ...cfg,
  files: ['packages/**/src/**/*.ts', 'packages/**/tests/**/*.ts'],
  languageOptions: {
    ...(cfg.languageOptions ?? {}),
    parser: tsParser,
    parserOptions: {
      ...(cfg.languageOptions?.parserOptions ?? {}),
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
}));

export default [
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries, '@typescript-eslint': tseslint.plugin },
    languageOptions: { parser: tsParser },
    settings: {
      'boundaries/elements': [
        // Zero-dependency core modules — these are the inner ring
        { type: 'contracts',    pattern: 'src/contracts/**' },
        { type: 'core',         pattern: 'src/core/**' },
        // Framework modules — may import from core
        { type: 'graph',        pattern: 'src/graph/**' },
        { type: 'execution',    pattern: 'src/execution/**' },
        { type: 'memory',       pattern: 'src/memory/**' },
        { type: 'session',      pattern: 'src/session/**' },
        { type: 'orchestration',pattern: 'src/orchestration/**' },
        { type: 'production',   pattern: 'src/production/**' },
        { type: 'guardrails',   pattern: 'src/guardrails/**' },
        { type: 'agentic',      pattern: 'src/agentic/**' },
        { type: 'tools',        pattern: 'src/tools/**' },
        { type: 'observability',pattern: 'src/observability/**' },
        { type: 'testing',      pattern: 'src/testing/**' },
        // Adapter/provider layer — external deps live here
        { type: 'adapters',     pattern: 'src/adapters/**' },
        { type: 'providers',    pattern: 'src/providers/**' },
        { type: 'plugins',      pattern: 'src/plugins/**' },
      ],
      'boundaries/ignore': [
        // Allow all imports in test files
        '**/*.test.ts',
        '**/tests/**',
        '**/benchmarks/**',
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          rules: [
            // contracts must not import anything from the framework
            {
              from: { type: 'contracts' },
              disallow: [
                { to: { type: 'core' } }, { to: { type: 'graph' } }, { to: { type: 'execution' } },
                { to: { type: 'memory' } }, { to: { type: 'session' } }, { to: { type: 'orchestration' } },
                { to: { type: 'production' } }, { to: { type: 'guardrails' } }, { to: { type: 'agentic' } },
                { to: { type: 'tools' } }, { to: { type: 'observability' } }, { to: { type: 'adapters' } },
                { to: { type: 'providers' } }, { to: { type: 'plugins' } },
              ],
              message: 'src/contracts/ is a zero-dep interface module — no framework imports allowed.',
            },
            // core must not import from adapters / providers / plugins
            {
              from: { type: 'core' },
              disallow: [{ to: { type: 'adapters' } }, { to: { type: 'providers' } }, { to: { type: 'plugins' } }],
              message: 'src/core/ must remain dependency-free of adapter/provider/plugin layers.',
            },
          ],
        },
      ],
    },
  },
  // Strict rules for new packages/ workspace (Phase 1+ of production-readiness plan).
  {
    files: ['packages/**/src/**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        // foundation — zero-dependency inner ring
        { type: 'foundation', pattern: 'packages/foundation/**' },
        // runtime — can import foundation only
        { type: 'runtime',    pattern: 'packages/runtime/**' },
        // providers — implement adapters
        { type: 'providers',  pattern: 'packages/providers/**' },
        // state — storage adapters
        { type: 'state',      pattern: 'packages/state/**' },
        // tools-layer — tool API + registry
        { type: 'tools',      pattern: 'packages/tools-layer/**' },
        // platform — wraps runtime with operational concerns
        { type: 'platform',   pattern: 'packages/platform/**' },
        // developer — DX layer, can compose public APIs
        { type: 'developer',  pattern: 'packages/developer/**' },
        // extensions — optional, must not affect core gates
        { type: 'extensions', pattern: 'packages/extensions/**' },
      ],
      'boundaries/ignore': [
        '**/*.test.ts',
        '**/tests/**',
        '**/benchmarks/**',
      ],
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'boundaries/dependencies': [
        'warn',
        {
          default: 'allow',
          rules: [
            // foundation must not import anything from the framework
            {
              from: { type: 'foundation' },
              disallow: [
                { to: { type: 'runtime' } }, { to: { type: 'providers' } },
                { to: { type: 'state' } }, { to: { type: 'tools' } },
                { to: { type: 'platform' } }, { to: { type: 'developer' } },
                { to: { type: 'extensions' } },
              ],
              message: 'foundation/* is the inner ring — no outward imports allowed.',
            },
            // extensions must not be required by platform/runtime/etc
            {
              from: [{ type: 'runtime' }, { type: 'platform' }, { type: 'providers' }, { type: 'state' }, { type: 'tools' }],
              disallow: [{ to: { type: 'extensions' } }],
              message: 'extensions/* are optional — core layers must not depend on them.',
            },
            // developer (DX) must not be imported by production runtime layers
            {
              from: [{ type: 'runtime' }, { type: 'providers' }, { type: 'state' }, { type: 'tools' }, { type: 'platform' }],
              disallow: [{ to: { type: 'developer' } }],
              message: 'developer/* is user-facing DX — production layers must not import it.',
            },
          ],
        },
      ],
    },
  },
  // typescript-eslint strict-type-checked for packages only.
  // Every inherited config is explicitly scoped so typed rules never apply to legacy src/.
  ...packageTypeCheckedConfigs,
  {
    files: ['packages/**/src/**/*.ts', 'packages/**/tests/**/*.ts'],
    rules: {
      // Floating promises must be handled explicitly
      '@typescript-eslint/no-floating-promises': 'error',
      // Non-null assertions: warn (types are well-constrained in packages/)
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // No any — packages/ must be fully typed
      '@typescript-eslint/no-explicit-any': 'error',
      // Unused vars ok if prefixed with _
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Numbers and booleans are safe in template literals — no need for String()
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: true,
        allowNullish: false,
        allowAny: false,
        allowRegExp: false,
      }],
      // Unnecessary ?? / ?. operators are a code quality issue not safety issue —
      // API response types may not perfectly capture nullability; treat as warning
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      // Allow `this: void` for safe unbound method references
      '@typescript-eslint/no-invalid-void-type': ['error', { allowAsThisParameter: true }],
    },
  },
  {
    files: ['packages/developer/cli/src/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // API wrapper tools: defensive ?? and ?. against unpredictable external API responses is intentional
  {
    files: ['packages/tools-layer/tools/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // performExecute implements a Promise-returning base-class method; sync impls are intentional
      '@typescript-eslint/require-await': 'off',
      // lazy optional peer-dep loading via require() is intentional in tool wrappers
      '@typescript-eslint/no-require-imports': 'off',
      // external API response shapes may not match declared types; defensive template expressions are intentional
      '@typescript-eslint/restrict-template-expressions': 'off',
      // tools package intentionally maintains BaseTool compat shim during migration period
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
];
