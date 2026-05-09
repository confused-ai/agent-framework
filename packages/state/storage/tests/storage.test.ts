/**
 * @confused-ai/storage — package-level conformance tests.
 *
 * Covers: MemoryStorageAdapter, FileStorageAdapter (tmp dir), createStorage()
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    MemoryStorageAdapter,
    createStorage,
} from '@confused-ai/storage';

// ── MemoryStorageAdapter ──────────────────────────────────────────────────────

describe('MemoryStorageAdapter', () => {
    let adapter: MemoryStorageAdapter;

    beforeEach(() => {
        adapter = new MemoryStorageAdapter();
    });

    it('get returns undefined for missing key', async () => {
        const result = await adapter.get('nonexistent');
        expect(result).toBeUndefined();
    });

    it('set and get roundtrip', async () => {
        await adapter.set('key1', 'value1');
        const result = await adapter.get('key1');
        expect(result).toBe('value1');
    });

    it('delete removes key', async () => {
        await adapter.set('key', 'value');
        await adapter.delete('key');
        expect(await adapter.get('key')).toBeUndefined();
    });

    it('delete on nonexistent key does not throw', async () => {
        await expect(adapter.delete('missing')).resolves.not.toThrow();
    });

    it('has returns true for existing key', async () => {
        await adapter.set('exists', 'yes');
        expect(await adapter.has('exists')).toBe(true);
    });

    it('has returns false for missing key', async () => {
        expect(await adapter.has('missing')).toBe(false);
    });

    it('list returns all keys when no prefix', async () => {
        await adapter.set('a', '1');
        await adapter.set('b', '2');
        const keys = await adapter.list();
        expect(keys).toContain('a');
        expect(keys).toContain('b');
    });

    it('list filters by prefix', async () => {
        await adapter.set('user:1', 'a');
        await adapter.set('user:2', 'b');
        await adapter.set('session:1', 'c');
        const keys = await adapter.list('user:');
        expect(keys).toContain('user:1');
        expect(keys).toContain('user:2');
        expect(keys).not.toContain('session:1');
    });

    it('clear removes all entries', async () => {
        await adapter.set('x', '1');
        await adapter.set('y', '2');
        await adapter.clear?.();
        expect(await adapter.list()).toHaveLength(0);
    });

    it('TTL expiry: expired entry returns undefined after TTL passes', async () => {
        // Set with 1ms TTL (1/1000 of a second) — expressed in seconds, 0.001s = 1ms
        // The implementation uses: expiresAt = Date.now() + ttl * 1000
        // We need ttl > 0, e.g., 0.001 seconds = 1ms
        await adapter.set('ttl-key', 'temporary', 0.001);
        await new Promise(r => setTimeout(r, 20)); // wait 20ms > 1ms TTL
        expect(await adapter.get('ttl-key')).toBeUndefined();
    });

    it('TTL expiry: non-expired entry is still accessible', async () => {
        await adapter.set('ttl-key2', 'still-here', 3600); // 1 hour
        expect(await adapter.get('ttl-key2')).toBe('still-here');
    });
});

// ── createStorage() (typed wrapper) ──────────────────────────────────────────

describe('createStorage (in-memory)', () => {
    it('createStorage with no args creates in-memory store', () => {
        const store = createStorage();
        expect(store).toBeDefined();
        expect(store.adapter).toBeInstanceOf(MemoryStorageAdapter);
    });

    it('set and get typed object', async () => {
        const store = createStorage();
        const data = { name: 'Alice', age: 30 };
        await store.set('user:1', data);
        const retrieved = await store.get<typeof data>('user:1');
        expect(retrieved).toEqual(data);
    });

    it('get returns undefined for missing key', async () => {
        const store = createStorage();
        const result = await store.get('missing');
        expect(result).toBeUndefined();
    });

    it('delete removes typed entry', async () => {
        const store = createStorage();
        await store.set('item', { x: 1 });
        await store.delete('item');
        expect(await store.get('item')).toBeUndefined();
    });

    it('has returns true/false correctly', async () => {
        const store = createStorage();
        await store.set('present', 'yes');
        expect(await store.has('present')).toBe(true);
        expect(await store.has('absent')).toBe(false);
    });

    it('list filters by prefix', async () => {
        const store = createStorage();
        await store.set('a:1', 'x');
        await store.set('a:2', 'y');
        await store.set('b:1', 'z');
        const keys = await store.list('a:');
        expect(keys).toContain('a:1');
        expect(keys).toContain('a:2');
        expect(keys).not.toContain('b:1');
    });

    it('clear removes all entries', async () => {
        const store = createStorage();
        await store.set('k1', 1);
        await store.set('k2', 2);
        await store.clear();
        expect(await store.list()).toHaveLength(0);
    });

    it('round-trips arrays correctly', async () => {
        const store = createStorage();
        await store.set('arr', [1, 2, 3]);
        const result = await store.get<number[]>('arr');
        expect(result).toEqual([1, 2, 3]);
    });

    it('round-trips nested objects correctly', async () => {
        const store = createStorage();
        const nested = { a: { b: { c: 'deep' } }, nums: [1, 2] };
        await store.set('nested', nested);
        expect(await store.get('nested')).toEqual(nested);
    });

    it('createStorage({ driver: "memory" }) creates in-memory store', () => {
        const store = createStorage({ driver: 'memory' });
        expect(store.adapter).toBeInstanceOf(MemoryStorageAdapter);
    });
});
