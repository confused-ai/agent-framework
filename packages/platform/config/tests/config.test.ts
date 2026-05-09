/**
 * @confused-ai/config — conformance tests.
 *
 * Covers: validateConfig, getConfigErrorHelp.
 */

import { describe, it, expect } from 'vitest';
import { validateConfig, getConfigErrorHelp } from '@confused-ai/config';

// ── helpers ───────────────────────────────────────────────────────────────────

function validConfig() {
    return {
        llm: { provider: 'openai' as const, apiKey: 'sk-test', model: 'gpt-4o' },
        database: { type: 'sqlite' as const, sqlitePath: './data/test.db' },
        server: { port: 3001 },
    };
}

// ── validateConfig ────────────────────────────────────────────────────────────

describe('validateConfig', () => {
    it('returns config when all required fields are present', () => {
        const result = validateConfig(validConfig());
        expect(result.llm.model).toBe('gpt-4o');
        expect(result.database.type).toBe('sqlite');
        expect(result.server.port).toBe(3001);
    });

    it('throws when llm is missing', () => {
        const cfg = validConfig();
        delete (cfg as Record<string, unknown>)['llm'];
        expect(() => validateConfig(cfg)).toThrow(/Configuration validation failed/);
    });

    it('throws when llm.apiKey is missing', () => {
        const cfg = validConfig();
        cfg.llm.apiKey = '';
        expect(() => validateConfig(cfg)).toThrow(/Configuration validation failed/);
    });

    it('throws when llm.model is missing', () => {
        const cfg = validConfig();
        cfg.llm.model = '';
        expect(() => validateConfig(cfg)).toThrow(/Configuration validation failed/);
    });

    it('throws when database is missing', () => {
        const cfg = validConfig();
        delete (cfg as Record<string, unknown>)['database'];
        expect(() => validateConfig(cfg)).toThrow(/Configuration validation failed/);
    });

    it('throws when server is missing', () => {
        const cfg = validConfig();
        delete (cfg as Record<string, unknown>)['server'];
        expect(() => validateConfig(cfg)).toThrow(/Configuration validation failed/);
    });

    it('throws when server.port is out of range', () => {
        const cfg = validConfig();
        cfg.server.port = 99999;
        expect(() => validateConfig(cfg)).toThrow(/Configuration validation failed/);
    });

    it('throws when server.port is 0', () => {
        const cfg = validConfig();
        cfg.server.port = 0;
        expect(() => validateConfig(cfg)).toThrow(/Configuration validation failed/);
    });

    it('throws for postgres without host', () => {
        const cfg = {
            ...validConfig(),
            database: { type: 'postgres' as const, host: undefined, database: undefined },
        };
        expect(() => validateConfig(cfg)).toThrow(/Configuration validation failed/);
    });

    it('error is an AgentError with code CONFIG_ERROR', () => {
        const cfg = validConfig();
        cfg.llm.apiKey = '';
        try {
            validateConfig(cfg);
            expect.fail('should have thrown');
        } catch (e: unknown) {
            expect((e as { code?: string }).code).toBe('CONFIG_ERROR');
        }
    });
});

// ── getConfigErrorHelp ────────────────────────────────────────────────────────

describe('getConfigErrorHelp', () => {
    it('returns OpenAI help for OPENAI_API_KEY errors', () => {
        const msg = getConfigErrorHelp(new Error('Missing OPENAI_API_KEY'));
        expect(msg).toContain('OpenAI');
    });

    it('returns database help for Database errors', () => {
        const msg = getConfigErrorHelp(new Error('Database configuration required'));
        expect(msg).toContain('DB_TYPE');
    });

    it('returns generic help for unknown errors', () => {
        const msg = getConfigErrorHelp(new Error('something random'));
        expect(msg).toContain('Configuration Error');
    });
});
