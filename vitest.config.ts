import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Use Bun for fast TypeScript execution
        environment: 'node',
        // Use the test-specific tsconfig so test files get Node.js types
        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
        
        // Test file patterns
        include: [
            'tests/**/*.test.ts',
            'src/**/*.test.ts',
            'packages/*/tests/**/*.test.ts',
            'packages/*/src/**/*.test.ts',
            'packages/*/*/tests/**/*.test.ts',
            'packages/*/*/src/**/*.test.ts',
        ],

        // Benchmark file patterns
        benchmark: {
            include: ['benchmarks/**/*.bench.ts'],
        },
        
        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'json', 'html'],
            // Only measure coverage on the new packages/* code.
            // Legacy src/ is excluded: it ships untouched and has its own
            // integration test coverage via the existing tests/*.test.ts suite.
            // adapter-redis is excluded: tests require a live Redis instance
            // (skipped in CI) — coverage is tracked separately with testcontainers.
            include: [
                'packages/foundation/contracts/src/**/*.ts',
                'packages/platform/guard/src/**/*.ts',
                'packages/platform/observe/src/**/*.ts',
                'packages/platform/serve/src/**/*.ts',
            ],
            exclude: [
                'node_modules/**',
                'dist/**',
                'tests/**',
                'benchmarks/**',
                'examples/**',
                'docs/**',
                'packages/**/dist/**',
                'packages/**/tests/**',
                'src/adapters/**',
                'src/dx/**',
                'src/runtime/**',
                '**/*.d.ts',
                '**/*.test.ts',
                '**/index.ts',
            ],
            // Phase 4 target: 80/75 on packages/* (Phase 3 complete; src/ excluded).
            thresholds: {
                lines: 80,
                functions: 75,
                branches: 75,
                statements: 80,
            },
        },
        
        // Timeout for async operations
        testTimeout: 30000,
        
        // Reporter configuration
        reporters: ['verbose'],
        
        // Global setup/teardown
        globalSetup: undefined,
    },
    
    // Resolve aliases matching tsconfig
    resolve: {
        alias: {
            '@': './src',
            // foundation
            '@confused-ai/contracts': new URL('./packages/foundation/contracts/src/index.ts', import.meta.url).pathname,
            '@confused-ai/shared': new URL('./packages/foundation/shared/src/index.ts', import.meta.url).pathname,
            // runtime
            '@confused-ai/core': new URL('./packages/runtime/core/src/index.ts', import.meta.url).pathname,
            '@confused-ai/agentic': new URL('./packages/runtime/agentic/src/index.ts', import.meta.url).pathname,
            '@confused-ai/graph': new URL('./packages/runtime/graph/src/index.ts', import.meta.url).pathname,
            '@confused-ai/workflow': new URL('./packages/runtime/workflow/src/index.ts', import.meta.url).pathname,
            '@confused-ai/orchestration': new URL('./packages/runtime/orchestration/src/index.ts', import.meta.url).pathname,
            '@confused-ai/execution': new URL('./packages/runtime/execution/src/index.ts', import.meta.url).pathname,
            '@confused-ai/planner': new URL('./packages/runtime/planner/src/index.ts', import.meta.url).pathname,
            '@confused-ai/reasoning': new URL('./packages/runtime/reasoning/src/index.ts', import.meta.url).pathname,
            '@confused-ai/scheduler': new URL('./packages/runtime/scheduler/src/index.ts', import.meta.url).pathname,
            '@confused-ai/background': new URL('./packages/runtime/background/src/index.ts', import.meta.url).pathname,
            // providers
            '@confused-ai/models': new URL('./packages/providers/models/src/index.ts', import.meta.url).pathname,
            '@confused-ai/router': new URL('./packages/providers/router/src/index.ts', import.meta.url).pathname,
            // state
            '@confused-ai/db': new URL('./packages/state/db/src/index.ts', import.meta.url).pathname,
            '@confused-ai/session': new URL('./packages/state/session/src/index.ts', import.meta.url).pathname,
            '@confused-ai/memory': new URL('./packages/state/memory/src/index.ts', import.meta.url).pathname,
            '@confused-ai/knowledge': new URL('./packages/state/knowledge/src/index.ts', import.meta.url).pathname,
            '@confused-ai/learning': new URL('./packages/state/learning/src/index.ts', import.meta.url).pathname,
            '@confused-ai/storage': new URL('./packages/state/storage/src/index.ts', import.meta.url).pathname,
            '@confused-ai/artifacts': new URL('./packages/state/artifacts/src/index.ts', import.meta.url).pathname,
            '@confused-ai/adapter-redis': new URL('./packages/state/adapter-redis/src/index.ts', import.meta.url).pathname,
            // tools-layer
            '@confused-ai/tools/ai': new URL('./packages/tools-layer/tools/src/ai/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/communication': new URL('./packages/tools-layer/tools/src/communication/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/core': new URL('./packages/tools-layer/tools/src/core/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/crm': new URL('./packages/tools-layer/tools/src/crm/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/data': new URL('./packages/tools-layer/tools/src/data/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/devtools': new URL('./packages/tools-layer/tools/src/devtools/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/finance': new URL('./packages/tools-layer/tools/src/finance/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/mcp': new URL('./packages/tools-layer/tools/src/mcp/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/media': new URL('./packages/tools-layer/tools/src/media/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/memory': new URL('./packages/tools-layer/tools/src/memory/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/productivity': new URL('./packages/tools-layer/tools/src/productivity/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/scraping': new URL('./packages/tools-layer/tools/src/scraping/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/search': new URL('./packages/tools-layer/tools/src/search/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/social': new URL('./packages/tools-layer/tools/src/social/index.ts', import.meta.url).pathname,
            '@confused-ai/tools/utils': new URL('./packages/tools-layer/tools/src/utils/index.ts', import.meta.url).pathname,
            '@confused-ai/tools': new URL('./packages/tools-layer/tools/src/index.ts', import.meta.url).pathname,
            '@confused-ai/plugins': new URL('./packages/tools-layer/plugins/src/index.ts', import.meta.url).pathname,
            // platform
            '@confused-ai/guard': new URL('./packages/platform/guard/src/index.ts', import.meta.url).pathname,
            '@confused-ai/guardrails': new URL('./packages/platform/guardrails/src/index.ts', import.meta.url).pathname,
            '@confused-ai/observe': new URL('./packages/platform/observe/src/index.ts', import.meta.url).pathname,
            '@confused-ai/production': new URL('./packages/platform/production/src/index.ts', import.meta.url).pathname,
            '@confused-ai/serve': new URL('./packages/platform/serve/src/index.ts', import.meta.url).pathname,
            '@confused-ai/config': new URL('./packages/platform/config/src/index.ts', import.meta.url).pathname,
            '@confused-ai/eval': new URL('./packages/platform/eval/src/index.ts', import.meta.url).pathname,
            '@confused-ai/context': new URL('./packages/platform/context/src/index.ts', import.meta.url).pathname,
            '@confused-ai/compression': new URL('./packages/platform/compression/src/index.ts', import.meta.url).pathname,
            // developer
            '@confused-ai/sdk': new URL('./packages/developer/sdk/src/index.ts', import.meta.url).pathname,
            '@confused-ai/cli': new URL('./packages/developer/cli/src/index.ts', import.meta.url).pathname,
            '@confused-ai/playground': new URL('./packages/developer/playground/src/index.ts', import.meta.url).pathname,
            '@confused-ai/test-utils/conformance': new URL('./packages/developer/test-utils/src/conformance.ts', import.meta.url).pathname,
            '@confused-ai/test-utils': new URL('./packages/developer/test-utils/src/index.ts', import.meta.url).pathname,
            '@confused-ai/skills': new URL('./packages/developer/skills/src/index.ts', import.meta.url).pathname,
            // extensions
            '@confused-ai/voice': new URL('./packages/extensions/voice/src/index.ts', import.meta.url).pathname,
            '@confused-ai/video': new URL('./packages/extensions/video/src/index.ts', import.meta.url).pathname,
        },
    },

    server: {
        watch: {
            ignored: ['**/node_modules/**', '**/dist/**'],
        },
    },
});
