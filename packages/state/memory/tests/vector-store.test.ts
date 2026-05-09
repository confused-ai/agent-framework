/**
 * VectorMemoryStore — durability tests (phase-6 fix).
 *
 * The key regression being tested: `VectorMemoryStore.get(id)` must return the
 * stored entry even after the in-process `entryCache` has been cleared (simulating
 * a cold start / process restart where only the VectorStoreAdapter survives).
 *
 * Also covers: InMemoryVectorStore.get(), cosine search, delete, update, clear.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VectorMemoryStore } from '../src/vector-store.js';
import { InMemoryVectorStore } from '../src/in-memory-vector-store.js';
import { MemoryType } from '../src/types.js';
import type { EmbeddingProvider } from '../src/types.js';
import { runVectorStoreConformance } from '@confused-ai/test-utils/conformance';

// ── Conformance suite — InMemoryVectorStore ───────────────────────────────────
runVectorStoreConformance(() => new InMemoryVectorStore(), { describe, it, expect });

// ── Stub embedding provider ────────────────────────────────────────────────

/** Deterministic stub: converts each character to a small float. */
function makeEmbeddingProvider(dim = 4): EmbeddingProvider {
    return {
        getDimension: () => dim,
        embed: async (text: string): Promise<number[]> => {
            const vec = new Array<number>(dim).fill(0);
            for (let i = 0; i < text.length; i++) {
                vec[i % dim] += text.charCodeAt(i) / 1000;
            }
            // Normalize
            const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
            return vec.map((v) => v / mag);
        },
        embedBatch: async (texts: string[]) =>
            Promise.all(texts.map((t) => makeEmbeddingProvider(dim).embed(t))),
    };
}

/** Access the private entryCache for white-box cache-eviction tests. */
function evictCache(store: VectorMemoryStore): void {
    (store as unknown as { entryCache: Map<string, unknown> }).entryCache.clear();
}

// ── helpers ────────────────────────────────────────────────────────────────

function makeStore() {
    const adapter = new InMemoryVectorStore();
    const store = new VectorMemoryStore({
        vectorStore: adapter,
        embeddingProvider: makeEmbeddingProvider(),
    });
    return { store, adapter };
}

// ── InMemoryVectorStore.get() ──────────────────────────────────────────────

describe('InMemoryVectorStore.get()', () => {
    it('returns null for unknown id', async () => {
        const adapter = new InMemoryVectorStore();
        expect(await adapter.get('nonexistent')).toBeNull();
    });

    it('returns the VectorEntry that was upserted', async () => {
        const adapter = new InMemoryVectorStore();
        await adapter.upsert([{ id: 'v1', vector: [0.1, 0.2], metadata: { content: 'hello' } }]);
        const result = await adapter.get('v1');
        expect(result).not.toBeNull();
        expect(result?.id).toBe('v1');
        expect(result?.metadata['content']).toBe('hello');
        expect(result?.vector).toEqual([0.1, 0.2]);
    });

    it('returns null after the entry is deleted', async () => {
        const adapter = new InMemoryVectorStore();
        await adapter.upsert([{ id: 'v2', vector: [0.5], metadata: {} }]);
        await adapter.delete(['v2']);
        expect(await adapter.get('v2')).toBeNull();
    });

    it('reflects the latest upsert after an update', async () => {
        const adapter = new InMemoryVectorStore();
        await adapter.upsert([{ id: 'v3', vector: [0.1], metadata: { content: 'original' } }]);
        await adapter.upsert([{ id: 'v3', vector: [0.9], metadata: { content: 'updated' } }]);
        const result = await adapter.get('v3');
        expect(result?.metadata['content']).toBe('updated');
    });
});

// ── VectorMemoryStore.get() — durability (phase-6 fix) ────────────────────

describe('VectorMemoryStore.get() — cache-miss durability', () => {
    it('resolves to null for unknown id', async () => {
        const { store } = makeStore();
        expect(await store.get('ghost')).toBeNull();
    });

    it('returns entry from cache on first call', async () => {
        const { store } = makeStore();
        const entry = await store.store({
            type: MemoryType.SHORT_TERM,
            content: 'cached content',
            metadata: {},
        });

        const result = await store.get(entry.id);
        expect(result).not.toBeNull();
        expect(result?.content).toBe('cached content');
    });

    it('reconstructs entry from adapter after cache is cleared (durability fix)', async () => {
        const { store } = makeStore();
        const entry = await store.store({
            type: MemoryType.LONG_TERM,
            content: 'durable content',
            metadata: { source: 'test-suite', importance: 0.9 },
        });

        // Simulate process restart: wipe the in-process cache
        evictCache(store);

        const result = await store.get(entry.id);
        expect(result).not.toBeNull();
        expect(result?.id).toBe(entry.id);
        expect(result?.content).toBe('durable content');
        expect(result?.type).toBe(MemoryType.LONG_TERM);
    });

    it('repopulates cache on successful reconstruction', async () => {
        const { store } = makeStore();
        const entry = await store.store({
            type: MemoryType.SHORT_TERM,
            content: 'repopulate test',
            metadata: {},
        });

        evictCache(store);

        // First call reconstructs and caches
        await store.get(entry.id);

        // Second call should be a cache hit (we can't directly observe, but it
        // must still return the correct result)
        const second = await store.get(entry.id);
        expect(second?.content).toBe('repopulate test');
    });
});

// ── VectorMemoryStore — store / retrieve / update / delete ────────────────

describe('VectorMemoryStore — basic CRUD', () => {
    it('stores and retrieves an entry by semantic similarity', async () => {
        const { store } = makeStore();
        await store.store({
            type: MemoryType.SEMANTIC,
            content: 'TypeScript is a typed superset of JavaScript',
            metadata: { tags: ['ts', 'js'] },
        });

        const results = await store.retrieve({
            query: 'TypeScript types',
            limit: 5,
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results[0]?.entry.content).toContain('TypeScript');
    });

    it('update() modifies content and re-embeds', async () => {
        const { store } = makeStore();
        const entry = await store.store({
            type: MemoryType.SHORT_TERM,
            content: 'original text',
            metadata: {},
        });

        const updated = await store.update(entry.id, { content: 'updated text' });
        expect(updated.content).toBe('updated text');
        expect(updated.id).toBe(entry.id);
    });

    it('delete() removes the entry', async () => {
        const { store } = makeStore();
        const entry = await store.store({
            type: MemoryType.SHORT_TERM,
            content: 'to be deleted',
            metadata: {},
        });

        await store.delete(entry.id);
        const result = await store.get(entry.id);
        expect(result).toBeNull();
    });

    it('clear() removes all entries', async () => {
        const { store, adapter } = makeStore();
        await store.store({ type: MemoryType.SHORT_TERM, content: 'a', metadata: {} });
        await store.store({ type: MemoryType.SHORT_TERM, content: 'b', metadata: {} });
        await store.clear();
        expect(adapter.size).toBe(0);
    });
});
