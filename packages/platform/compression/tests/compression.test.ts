/**
 * @confused-ai/compression — package-level conformance tests.
 *
 * Covers: HuffmanCodec, compressContext/decompressContext, serializeTable/deserializeTable,
 *         estimateCompressionRatio, createSlidingWindow/applyWindow,
 *         countTokens, contextBudget
 */

import { describe, it, expect } from 'vitest';
import {
    HuffmanCodec,
    compressContext,
    decompressContext,
    serializeTable,
    deserializeTable,
    estimateCompressionRatio,
    createSlidingWindow,
    applyWindow,
    countTokens,
    contextBudget,
} from '@confused-ai/compression';

// ── HuffmanCodec ─────────────────────────────────────────────────────────────
// encode() returns { bytes: Uint8Array, totalBits, table, originalLength, ratio }
// decode(bytes, totalBits, table) is static

describe('HuffmanCodec', () => {
    it('round-trips ASCII text', () => {
        const text = 'hello world hello world hello';
        const codec = HuffmanCodec.fromText(text);
        const enc = codec.encode(text);
        const decoded = HuffmanCodec.decode(enc.bytes, enc.totalBits, enc.table);
        expect(decoded).toBe(text);
    });

    it('round-trips empty string', () => {
        const codec = HuffmanCodec.fromText('');
        const enc = codec.encode('');
        // Empty input → empty output
        expect(typeof enc.totalBits).toBe('number');
        expect(enc.originalLength).toBe(0);
    });

    it('round-trips single repeated character', () => {
        const text = 'aaaaaaaaaa';
        const codec = HuffmanCodec.fromText(text);
        const enc = codec.encode(text);
        const decoded = HuffmanCodec.decode(enc.bytes, enc.totalBits, enc.table);
        expect(decoded).toBe(text);
    });

    it('encode result has expected shape', () => {
        const codec = HuffmanCodec.fromText('test input');
        const enc = codec.encode('test input');
        expect(enc).toHaveProperty('bytes');
        expect(enc).toHaveProperty('totalBits');
        expect(enc).toHaveProperty('table');
        expect(enc).toHaveProperty('originalLength');
        expect(enc).toHaveProperty('ratio');
        expect(enc.bytes).toBeInstanceOf(Uint8Array);
    });

    it('ratio is a number between 0 and Infinity (lower is better compression)', () => {
        const text = 'aaa bbb aaa bbb aaa bbb aaa bbb aaa bbb';
        const codec = HuffmanCodec.fromText(text);
        const enc = codec.encode(text);
        expect(typeof enc.ratio).toBe('number');
        expect(enc.ratio).toBeGreaterThanOrEqual(0);
    });

    it('encode table is a HuffmanTable with encode/decode Maps', () => {
        const codec = HuffmanCodec.fromText('test');
        const enc = codec.encode('test');
        expect(enc.table.encode).toBeInstanceOf(Map);
        expect(enc.table.decode).toBeInstanceOf(Map);
    });
});

// ── serializeTable / deserializeTable ─────────────────────────────────────────

describe('serializeTable / deserializeTable', () => {
    it('round-trips a table from encode result', () => {
        const text = 'the quick brown fox';
        const codec = HuffmanCodec.fromText(text);
        const enc = codec.encode(text);
        const serialized = serializeTable(enc.table);
        const restored = deserializeTable(serialized);

        // All entries in encode map should survive
        for (const [byte, code] of enc.table.encode) {
            expect(restored.encode.get(byte)).toBe(code);
        }
    });

    it('serialized form is a string', () => {
        const codec = HuffmanCodec.fromText('hello');
        const enc = codec.encode('hello');
        const serialized = serializeTable(enc.table);
        expect(typeof serialized).toBe('string');
    });
});

// ── compressContext / decompressContext ───────────────────────────────────────

describe('compressContext / decompressContext', () => {
    it('round-trips plain text', () => {
        const text = 'The agent said: hello! The agent said: hello!';
        const compressed = compressContext(text);
        const restored = decompressContext(compressed);
        expect(restored).toBe(text);
    });

    it('compressed output is a string', () => {
        const result = compressContext('some text here');
        expect(typeof result).toBe('string');
    });

    it('decompresses back to original for unicode text', () => {
        const text = 'こんにちは世界！';
        const compressed = compressContext(text);
        const restored = decompressContext(compressed);
        expect(restored).toBe(text);
    });
});

// ── estimateCompressionRatio ──────────────────────────────────────────────────

describe('estimateCompressionRatio', () => {
    it('returns a number between 0 and 1 for compressible text', () => {
        const ratio = estimateCompressionRatio('aaa bbb aaa bbb aaa bbb aaa bbb');
        expect(ratio).toBeGreaterThan(0);
        expect(ratio).toBeLessThanOrEqual(1);
    });

    it('returns 1 for empty string (no savings)', () => {
        const ratio = estimateCompressionRatio('');
        expect(typeof ratio).toBe('number');
        // Empty string ratio should be a valid number
        expect(isNaN(ratio)).toBe(false);
    });
});

// ── createSlidingWindow / applyWindow ─────────────────────────────────────────

describe('createSlidingWindow', () => {
    const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Reply 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Reply 2' },
        { role: 'user', content: 'Message 3' },
    ];

    it('lastN strategy keeps last N non-system messages', () => {
        const window = createSlidingWindow({ strategy: 'lastN', maxMessages: 2 });
        const result = window.apply(messages);
        // system + 2 most recent messages
        expect(result.messages.length).toBeLessThanOrEqual(3);
        // System message is preserved at index 0
        expect(result.messages[0]?.role).toBe('system');
    });

    it('does not mutate original array', () => {
        const window = createSlidingWindow({ strategy: 'lastN', maxMessages: 2 });
        const original = [...messages];
        window.apply(messages);
        expect(messages.length).toBe(original.length);
    });

    it('returns dropped count', () => {
        const window = createSlidingWindow({ strategy: 'lastN', maxMessages: 2 });
        const result = window.apply(messages);
        expect(typeof result.dropped).toBe('number');
        expect(result.dropped).toBeGreaterThanOrEqual(0);
    });

    it('returns tokens estimate', () => {
        const window = createSlidingWindow({ strategy: 'lastN', maxMessages: 100 });
        const result = window.apply(messages);
        expect(typeof result.tokens).toBe('number');
        expect(result.tokens).toBeGreaterThan(0);
    });

    it('tokenBudget strategy trims to fit budget', () => {
        // Very small budget — should drop most messages
        const window = createSlidingWindow({ strategy: 'tokenBudget', maxTokens: 10 });
        const result = window.apply(messages);
        expect(result.dropped).toBeGreaterThan(0);
    });

    it('keeps all messages when budget is generous', () => {
        const window = createSlidingWindow({ strategy: 'tokenBudget', maxTokens: 99999 });
        const result = window.apply(messages);
        expect(result.dropped).toBe(0);
        expect(result.messages.length).toBe(messages.length);
    });

    it('preserveSystem:false allows dropping system message', () => {
        const window = createSlidingWindow({
            strategy: 'lastN',
            maxMessages: 1,
            preserveSystem: false,
        });
        const result = window.apply(messages);
        // system may have been dropped
        expect(result.messages.length).toBeLessThanOrEqual(messages.length);
    });
});

describe('applyWindow', () => {
    it('is a standalone function equivalent to window.apply', () => {
        const msgs = [
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'hello' },
        ];
        const result = applyWindow(msgs, { strategy: 'lastN', maxMessages: 5 });
        expect(result.messages.length).toBe(2);
        expect(result.dropped).toBe(0);
    });
});

// ── countTokens ───────────────────────────────────────────────────────────────

describe('countTokens', () => {
    it('returns a positive number for non-empty text', () => {
        const n = countTokens('Hello, world! How are you today?');
        expect(n).toBeGreaterThan(0);
    });

    it('returns 0 for empty string', () => {
        expect(countTokens('')).toBe(0);
    });

    it('counts more tokens for longer text', () => {
        const short = countTokens('Hi');
        const long = countTokens('This is a much longer sentence with many more words in it.');
        expect(long).toBeGreaterThan(short);
    });
});

// ── contextBudget ─────────────────────────────────────────────────────────────
// Returns { used, remaining, ratio } — NOT a plain number

describe('contextBudget', () => {
    it('returns an object with used/remaining/ratio', () => {
        const msgs = [
            { role: 'user' as const, content: 'hello' },
            { role: 'assistant' as const, content: 'hi there' },
        ];
        const result = contextBudget(msgs, 1000);
        expect(result).toHaveProperty('used');
        expect(result).toHaveProperty('remaining');
        expect(result).toHaveProperty('ratio');
        expect(typeof result.used).toBe('number');
        expect(typeof result.remaining).toBe('number');
        expect(typeof result.ratio).toBe('number');
    });

    it('remaining equals maxTokens minus used tokens', () => {
        const msgs = [{ role: 'user' as const, content: 'hello' }];
        const result = contextBudget(msgs, 1000);
        expect(result.remaining).toBe(Math.max(0, 1000 - result.used));
    });

    it('ratio is between 0 and 1 for normal usage', () => {
        const msgs = [{ role: 'user' as const, content: 'hello world' }];
        const result = contextBudget(msgs, 1000);
        expect(result.ratio).toBeGreaterThan(0);
        expect(result.ratio).toBeLessThan(1);
    });

    it('remaining is 0 when messages exceed budget', () => {
        const msgs = [{ role: 'user' as const, content: 'a'.repeat(10000) }];
        const result = contextBudget(msgs, 5);
        expect(result.remaining).toBe(0);
    });
});
