/**
 * @confused-ai/artifacts — package-level conformance tests.
 *
 * Covers: InMemoryArtifactStorage (save/get/update/delete/list/versioning/search),
 *         createTextArtifact, createMarkdownArtifact, createDataArtifact,
 *         createReasoningArtifact, createPlanArtifact
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    InMemoryArtifactStorage,
    createTextArtifact,
    createMarkdownArtifact,
    createDataArtifact,
    createReasoningArtifact,
    createPlanArtifact,
} from '@confused-ai/artifacts';

// ── InMemoryArtifactStorage ───────────────────────────────────────────────────

describe('InMemoryArtifactStorage', () => {
    let store: InMemoryArtifactStorage;

    beforeEach(() => {
        store = new InMemoryArtifactStorage();
    });

    // ── save / get ───────────────────────────────────────────────────────────

    it('save() returns a full artifact with id, version:1, timestamps', async () => {
        const saved = await store.save({
            name: 'my-artifact',
            type: 'file',
            content: 'hello world',
        });
        expect(saved.id).toBeTruthy();
        expect(saved.version).toBe(1);
        expect(saved.createdAt).toBeInstanceOf(Date);
        expect(saved.updatedAt).toBeInstanceOf(Date);
        expect(saved.content).toBe('hello world');
    });

    it('get() retrieves a saved artifact', async () => {
        const saved = await store.save({ name: 'a', type: 'file', content: 'data' });
        const got = await store.get(saved.id);
        expect(got).not.toBeNull();
        expect(got?.id).toBe(saved.id);
        expect(got?.content).toBe('data');
    });

    it('get() returns null for unknown id', async () => {
        const got = await store.get('nonexistent-id');
        expect(got).toBeNull();
    });

    // ── update ───────────────────────────────────────────────────────────────

    it('update() creates a new version', async () => {
        const saved = await store.save({ name: 'a', type: 'file', content: 'v1' });
        const updated = await store.update(saved.id, { content: 'v2' });
        expect(updated.version).toBe(2);
        expect(updated.content).toBe('v2');
    });

    it('update() get() returns latest version', async () => {
        const saved = await store.save({ name: 'a', type: 'file', content: 'v1' });
        await store.update(saved.id, { content: 'v2' });
        const latest = await store.get(saved.id);
        expect(latest?.content).toBe('v2');
        expect(latest?.version).toBe(2);
    });

    it('update() throws for unknown id', async () => {
        await expect(store.update('bad-id', { content: 'x' })).rejects.toThrow();
    });

    // ── getVersion ────────────────────────────────────────────────────────────

    it('getVersion() retrieves a specific version', async () => {
        const saved = await store.save({ name: 'a', type: 'file', content: 'v1' });
        await store.update(saved.id, { content: 'v2' });
        const v1 = await store.getVersion(saved.id, 1);
        expect(v1?.content).toBe('v1');
        expect(v1?.version).toBe(1);
    });

    it('getVersion() returns null/undefined for non-existent version', async () => {
        const saved = await store.save({ name: 'a', type: 'file', content: 'v1' });
        const v99 = await store.getVersion(saved.id, 99);
        expect(v99 == null).toBe(true); // null or undefined
    });

    // ── listVersions ──────────────────────────────────────────────────────────

    it('listVersions() returns all versions as metadata (no content)', async () => {
        const saved = await store.save({ name: 'a', type: 'file', content: 'v1' });
        await store.update(saved.id, { content: 'v2' });
        await store.update(saved.id, { content: 'v3' });
        const versions = await store.listVersions(saved.id);
        expect(versions.length).toBe(3);
        // Metadata should NOT include 'content'
        for (const v of versions) {
            expect(v).not.toHaveProperty('content');
        }
    });

    it('listVersions() returns empty array for unknown id', async () => {
        const versions = await store.listVersions('nobody');
        expect(versions).toHaveLength(0);
    });

    // ── delete ────────────────────────────────────────────────────────────────

    it('delete() removes the artifact', async () => {
        const saved = await store.save({ name: 'del', type: 'file', content: 'bye' });
        const deleted = await store.delete(saved.id);
        expect(deleted).toBe(true);
        const got = await store.get(saved.id);
        expect(got).toBeNull();
    });

    it('delete() returns false for unknown id', async () => {
        const result = await store.delete('not-there');
        expect(result).toBe(false);
    });

    // ── list ──────────────────────────────────────────────────────────────────

    it('list() returns all artifacts as metadata', async () => {
        await store.save({ name: 'a', type: 'file', content: 'x' });
        await store.save({ name: 'b', type: 'file', content: 'y' });
        const items = await store.list();
        expect(items.length).toBeGreaterThanOrEqual(2);
        for (const item of items) {
            expect(item).not.toHaveProperty('content');
        }
    });

    it('list() filters by type', async () => {
        await store.save({ name: 'f', type: 'file', content: 'text' });
        await store.save({ name: 'd', type: 'data', content: {} });
        const files = await store.list({ type: 'file' });
        expect(files.every(a => a.type === 'file')).toBe(true);
    });

    it('list() respects limit', async () => {
        await store.save({ name: 'a', type: 'file', content: '1' });
        await store.save({ name: 'b', type: 'file', content: '2' });
        await store.save({ name: 'c', type: 'file', content: '3' });
        const result = await store.list({ limit: 2 });
        expect(result.length).toBeLessThanOrEqual(2);
    });

    // ── search ────────────────────────────────────────────────────────────────

    it('search() finds artifacts by name', async () => {
        await store.save({ name: 'report-2024', type: 'file', content: 'text' });
        await store.save({ name: 'summary', type: 'file', content: 'text' });
        const results = await store.search('report');
        expect(results.some(a => a.name.includes('report'))).toBe(true);
    });

    it('search() returns empty array when no match', async () => {
        await store.save({ name: 'alpha', type: 'file', content: 'text' });
        const results = await store.search('zzznomatch');
        expect(results).toHaveLength(0);
    });
});

// ── Factory functions ─────────────────────────────────────────────────────────

describe('createTextArtifact', () => {
    it('creates a text artifact with correct shape', async () => {
        const store = new InMemoryArtifactStorage();
        const draft = createTextArtifact('report', 'This is the content.');
        const saved = await store.save(draft);
        expect(saved.name).toBe('report');
        expect(saved.content).toBe('This is the content.');
        expect(['file', 'code', 'markdown', 'document']).toContain(saved.type);
    });
});

describe('createMarkdownArtifact', () => {
    it('creates a markdown artifact', async () => {
        const store = new InMemoryArtifactStorage();
        const draft = createMarkdownArtifact('readme', '# Hello');
        const saved = await store.save(draft);
        expect(saved.content).toBe('# Hello');
        expect(saved.type).toBe('markdown');
    });
});

describe('createDataArtifact', () => {
    it('creates a data artifact with JSON content', async () => {
        const store = new InMemoryArtifactStorage();
        const data = { key: 'value', count: 42 };
        const draft = createDataArtifact('metrics', data);
        const saved = await store.save(draft);
        expect(saved.content).toEqual(data);
        expect(['data', 'json']).toContain(saved.type);
    });
});

describe('createReasoningArtifact', () => {
    it('creates a reasoning artifact with thoughts/conclusion/confidence', async () => {
        const store = new InMemoryArtifactStorage();
        // Signature: createReasoningArtifact(name, thoughts, conclusion, confidence)
        const draft = createReasoningArtifact(
            'chain-of-thought',
            ['step 1', 'step 2'],
            'Answer is 42',
            0.95,
        );
        const saved = await store.save(draft);
        expect(saved.type).toBe('reasoning');
        expect((saved.content as { thoughts: string[] }).thoughts).toHaveLength(2);
        expect((saved.content as { conclusion: string }).conclusion).toBe('Answer is 42');
    });
});

describe('createPlanArtifact', () => {
    it('creates a plan artifact with goal, steps, status', async () => {
        const store = new InMemoryArtifactStorage();
        // Signature: createPlanArtifact(name, goal, steps: Array<{ description: string }>)
        const draft = createPlanArtifact(
            'deploy-plan',
            'Deploy to production',
            [
                { description: 'Build' },
                { description: 'Test' },
            ],
        );
        const saved = await store.save(draft);
        expect(saved.type).toBe('plan');
        expect((saved.content as { goal: string }).goal).toBe('Deploy to production');
        expect((saved.content as { steps: unknown[] }).steps).toHaveLength(2);
    });
});
