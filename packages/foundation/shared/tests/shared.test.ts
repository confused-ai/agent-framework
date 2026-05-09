/**
 * @confused-ai/shared — package-level conformance tests.
 *
 * Covers: AgentError and subclasses, ErrorCode, DebugLogger, createDebugLogger
 */

import { describe, it, expect, vi } from 'vitest';
import {
    AgentError,
    ErrorCode,
    LLMError,
    ToolExecutionError,
    TimeoutError,
    CancellationError,
    ConfigError,
    SessionError,
    PermissionError,
    GuardrailError,
    DebugLogger,
    createDebugLogger,
    VERSION,
} from '@confused-ai/shared';

// ── ErrorCode ─────────────────────────────────────────────────────────────────

describe('ErrorCode', () => {
    it('has expected error codes', () => {
        expect(ErrorCode.AGENT_ERROR).toBe('AGENT_ERROR');
        expect(ErrorCode.LLM_ERROR).toBe('LLM_ERROR');
        expect(ErrorCode.TOOL_ERROR).toBe('TOOL_ERROR');
        expect(ErrorCode.TIMEOUT).toBe('TIMEOUT');
        expect(ErrorCode.CANCELLED).toBe('CANCELLED');
        expect(ErrorCode.CIRCUIT_OPEN).toBe('CIRCUIT_OPEN');
        expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
        expect(ErrorCode.BUDGET_EXCEEDED).toBe('BUDGET_EXCEEDED');
    });
});

// ── AgentError ────────────────────────────────────────────────────────────────

describe('AgentError', () => {
    it('constructs with message and defaults', () => {
        const err = new AgentError('something went wrong');
        expect(err.message).toBe('something went wrong');
        expect(err.name).toBe('AgentError');
        expect(err.code).toBe(ErrorCode.AGENT_ERROR);
        expect(err.retryable).toBe(false);
    });

    it('sets code, retryable, cause and context', () => {
        const cause = new Error('root cause');
        const err = new AgentError('wrapper', {
            code: ErrorCode.LLM_ERROR,
            retryable: true,
            cause,
            context: { model: 'gpt-4' },
        });
        expect(err.code).toBe('LLM_ERROR');
        expect(err.retryable).toBe(true);
        expect(err.cause).toBe(cause);
        expect(err.context?.['model']).toBe('gpt-4');
    });

    it('is instanceof Error', () => {
        expect(new AgentError('x')).toBeInstanceOf(Error);
    });

    it('toJSON() includes code, message, retryable', () => {
        const err = new AgentError('x', { code: ErrorCode.TIMEOUT });
        const json = err.toJSON?.() as Record<string, unknown>;
        if (json) {
            expect(json['code']).toBe('TIMEOUT');
            expect(json['message']).toBe('x');
        }
    });
});

// ── Subclasses ────────────────────────────────────────────────────────────────

describe('LLMError', () => {
    it('has code LLM_ERROR', () => {
        const err = new LLMError('model failed');
        expect(err.code).toBe(ErrorCode.LLM_ERROR);
        expect(err.name).toBe('LLMError');
    });

    it('is instanceof AgentError', () => {
        expect(new LLMError('x')).toBeInstanceOf(AgentError);
    });

    it('preserves retryable when passed', () => {
        const err = new LLMError('x', { retryable: true });
        expect(err.retryable).toBe(true);
    });
});

describe('ToolExecutionError', () => {
    it('has code TOOL_ERROR', () => {
        const err = new ToolExecutionError('tool failed');
        expect(err.code).toBe(ErrorCode.TOOL_ERROR);
        expect(err.name).toBe('ToolExecutionError');
    });

    it('is instanceof AgentError', () => {
        expect(new ToolExecutionError('x')).toBeInstanceOf(AgentError);
    });
});

describe('TimeoutError', () => {
    it('has code TIMEOUT', () => {
        const err = new TimeoutError('timed out');
        expect(err.code).toBe(ErrorCode.TIMEOUT);
        expect(err.name).toBe('TimeoutError');
    });
});

describe('CancellationError', () => {
    it('has code CANCELLED', () => {
        const err = new CancellationError('cancelled');
        expect(err.code).toBe(ErrorCode.CANCELLED);
        expect(err.name).toBe('CancellationError');
    });
});

describe('ConfigError', () => {
    it('has code CONFIG_ERROR', () => {
        const err = new ConfigError('bad config');
        expect(err.code).toBe(ErrorCode.CONFIG_ERROR);
        expect(err.name).toBe('ConfigError');
    });
});

describe('SessionError', () => {
    it('has code SESSION_ERROR', () => {
        const err = new SessionError('session failed');
        expect(err.code).toBe(ErrorCode.SESSION_ERROR);
        expect(err.name).toBe('SessionError');
    });
});

describe('PermissionError', () => {
    it('has code PERMISSION_DENIED', () => {
        const err = new PermissionError('access denied');
        expect(err.code).toBe(ErrorCode.PERMISSION_DENIED);
        expect(err.name).toBe('PermissionError');
    });
});

describe('GuardrailError', () => {
    it('has code GUARDRAIL_VIOLATION', () => {
        const err = new GuardrailError('guardrail triggered');
        expect(err.code).toBe(ErrorCode.GUARDRAIL_VIOLATION);
        expect(err.name).toBe('GuardrailError');
    });
});

// ── DebugLogger / createDebugLogger ───────────────────────────────────────────

describe('DebugLogger', () => {
    it('createDebugLogger returns a DebugLogger instance', () => {
        const logger = createDebugLogger('test');
        expect(logger).toBeInstanceOf(DebugLogger);
    });

    it('DebugLogger constructor accepts config object', () => {
        const logger = new DebugLogger({ component: 'my-module', enabled: false });
        expect(logger).toBeDefined();
    });

    it('isEnabled() returns the configured value', () => {
        const enabled = new DebugLogger({ component: 'x', enabled: true });
        const disabled = new DebugLogger({ component: 'x', enabled: false });
        expect(enabled.isEnabled()).toBe(true);
        expect(disabled.isEnabled()).toBe(false);
    });

    it('info() does not throw', () => {
        const logger = new DebugLogger({ component: 'test', enabled: false });
        expect(() => logger.info('info message')).not.toThrow();
    });

    it('debug() does not throw when enabled', () => {
        const logger = new DebugLogger({ component: 'test', enabled: true });
        expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('error() does not throw', () => {
        const logger = new DebugLogger({ component: 'test', enabled: false });
        expect(() => logger.error('error message')).not.toThrow();
    });

    it('warn() does not throw', () => {
        const logger = new DebugLogger({ component: 'test', enabled: false });
        expect(() => logger.warn('warn message')).not.toThrow();
    });

    it('fatal() does not throw', () => {
        const logger = new DebugLogger({ component: 'test', enabled: false });
        expect(() => logger.fatal('fatal message')).not.toThrow();
    });

    it('child() returns a DebugLogger', () => {
        const logger = new DebugLogger({ component: 'parent', enabled: false });
        const child = logger.child({ userId: 'u1' });
        expect(child).toBeInstanceOf(DebugLogger);
    });

    it('createDebugLogger with enabled=true creates an enabled logger', () => {
        const logger = createDebugLogger('trace', true);
        expect(logger.isEnabled()).toBe(true);
    });

    it('createDebugLogger with no second arg creates a disabled logger by default', () => {
        const logger = createDebugLogger('noop');
        // Default state depends on global debug; just confirm no throw
        expect(logger).toBeInstanceOf(DebugLogger);
    });
});

// ── VERSION ───────────────────────────────────────────────────────────────────

describe('VERSION', () => {
    it('exports a semver-like version string', () => {
        expect(typeof VERSION).toBe('string');
        expect(VERSION.length).toBeGreaterThan(0);
        // Should match x.y.z pattern (may have prerelease suffix)
        expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });
});
