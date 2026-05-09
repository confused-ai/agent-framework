/**
 * @confused-ai/learning — conformance tests.
 *
 * Covers: InMemoryUserProfileStore, InMemoryUserMemoryStore,
 *         InMemorySessionContextStore, InMemoryDecisionLogStore,
 *         LearningMode enum.
 */

import { describe, it, expect } from 'vitest';
import {
    LearningMode,
    InMemoryUserProfileStore,
    InMemoryUserMemoryStore,
    InMemorySessionContextStore,
    InMemoryDecisionLogStore,
} from '@confused-ai/learning';

// ── LearningMode ──────────────────────────────────────────────────────────────

describe('LearningMode', () => {
    it('has ALWAYS', () => expect(LearningMode.ALWAYS).toBe('always'));
    it('has AGENTIC', () => expect(LearningMode.AGENTIC).toBe('agentic'));
    it('has PROPOSE', () => expect(LearningMode.PROPOSE).toBe('propose'));
    it('has HITL', () => expect(LearningMode.HITL).toBe('hitl'));
});

// ── InMemoryUserProfileStore ──────────────────────────────────────────────────

describe('InMemoryUserProfileStore', () => {
    it('get() returns null for unknown user', async () => {
        const store = new InMemoryUserProfileStore();
        expect(await store.get('u1')).toBeNull();
    });

    it('set() creates and returns a profile with id/timestamps', async () => {
        const store = new InMemoryUserProfileStore();
        const profile = await store.set({ userId: 'u1', metadata: {} });
        expect(profile.id).toBeDefined();
        expect(profile.userId).toBe('u1');
        expect(profile.createdAt).toBeInstanceOf(Date);
        expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    it('get() retrieves stored profile', async () => {
        const store = new InMemoryUserProfileStore();
        await store.set({ userId: 'u2', metadata: {} });
        const p = await store.get('u2');
        expect(p).not.toBeNull();
        expect(p!.userId).toBe('u2');
    });

    it('update() updates existing profile', async () => {
        const store = new InMemoryUserProfileStore();
        await store.set({ userId: 'u3', metadata: {} });
        const updated = await store.update('u3', { metadata: { key: 'value' } });
        expect(updated.metadata?.['key']).toBe('value');
    });

    it('update() creates profile if it does not exist', async () => {
        const store = new InMemoryUserProfileStore();
        const p = await store.update('u-new', { metadata: { x: 1 } });
        expect(p.userId).toBe('u-new');
    });

    it('list() returns all profiles', async () => {
        const store = new InMemoryUserProfileStore();
        await store.set({ userId: 'a', metadata: {} });
        await store.set({ userId: 'b', metadata: {} });
        const all = await store.list();
        expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('list() filters by userId', async () => {
        const store = new InMemoryUserProfileStore();
        await store.set({ userId: 'filter-me', metadata: {} });
        await store.set({ userId: 'other', metadata: {} });
        const results = await store.list({ userId: 'filter-me' });
        expect(results.every(p => p.userId === 'filter-me')).toBe(true);
    });

    it('delete() removes profile and returns true', async () => {
        const store = new InMemoryUserProfileStore();
        await store.set({ userId: 'del', metadata: {} });
        const removed = await store.delete('del');
        expect(removed).toBe(true);
        expect(await store.get('del')).toBeNull();
    });

    it('delete() returns false when profile does not exist', async () => {
        const store = new InMemoryUserProfileStore();
        expect(await store.delete('ghost')).toBe(false);
    });
});

// ── InMemoryUserMemoryStore ───────────────────────────────────────────────────

describe('InMemoryUserMemoryStore', () => {
    it('get() returns null for unknown user', async () => {
        const store = new InMemoryUserMemoryStore();
        expect(await store.get('u1')).toBeNull();
    });

    it('addMemory() creates memory entry and returns id', async () => {
        const store = new InMemoryUserMemoryStore();
        const id = await store.addMemory('u1', 'likes cats');
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
    });

    it('get() returns memory after addMemory()', async () => {
        const store = new InMemoryUserMemoryStore();
        await store.addMemory('u2', 'prefers dark mode');
        const mem = await store.get('u2');
        expect(mem).not.toBeNull();
        expect(mem!.memories).toHaveLength(1);
        expect(mem!.memories[0]!.content).toBe('prefers dark mode');
    });

    it('addMemory() accumulates multiple entries', async () => {
        const store = new InMemoryUserMemoryStore();
        await store.addMemory('u3', 'entry 1');
        await store.addMemory('u3', 'entry 2');
        const mem = await store.get('u3');
        expect(mem!.memories).toHaveLength(2);
    });

    it('set() replaces memory object', async () => {
        const store = new InMemoryUserMemoryStore();
        await store.addMemory('u4', 'old');
        const replaced = await store.set({ userId: 'u4', memories: [] });
        expect(replaced.memories).toHaveLength(0);
    });
});

// ── InMemorySessionContextStore ───────────────────────────────────────────────

describe('InMemorySessionContextStore', () => {
    it('get() returns null for unknown session', async () => {
        const store = new InMemorySessionContextStore();
        expect(await store.get('sess-1')).toBeNull();
    });

    it('set() stores session context', async () => {
        const store = new InMemorySessionContextStore();
        const ctx = { sessionId: 'sess-2', goal: 'book a flight', plan: [] };
        await store.set(ctx);
        const result = await store.get('sess-2');
        expect(result).not.toBeNull();
        expect(result!.goal).toBe('book a flight');
    });

    it('set() overwrites existing session context', async () => {
        const store = new InMemorySessionContextStore();
        await store.set({ sessionId: 'sess-3', goal: 'original' });
        await store.set({ sessionId: 'sess-3', goal: 'revised' });
        const result = await store.get('sess-3');
        expect(result!.goal).toBe('revised');
    });

    it('clear() removes session and returns true', async () => {
        const store = new InMemorySessionContextStore();
        await store.set({ sessionId: 'sess-del' });
        expect(await store.clear('sess-del')).toBe(true);
        expect(await store.get('sess-del')).toBeNull();
    });

    it('clear() returns false when session does not exist', async () => {
        const store = new InMemorySessionContextStore();
        expect(await store.clear('ghost')).toBe(false);
    });
});

// ── InMemoryDecisionLogStore ──────────────────────────────────────────────────

describe('InMemoryDecisionLogStore', () => {
    it('list() returns empty array initially', async () => {
        const store = new InMemoryDecisionLogStore();
        const result = await store.list();
        expect(result).toHaveLength(0);
    });

    it('add() creates a decision log entry with id', async () => {
        const store = new InMemoryDecisionLogStore();
        const entry = await store.add({ decision: 'approved', agentId: 'a1' });
        expect(entry.id).toBeDefined();
        expect(entry.decision).toBe('approved');
        expect(entry.createdAt).toBeDefined();
    });

    it('get() retrieves entry by id', async () => {
        const store = new InMemoryDecisionLogStore();
        const entry = await store.add({ decision: 'picked-left' });
        const found = await store.get(entry.id);
        expect(found).not.toBeNull();
        expect(found!.decision).toBe('picked-left');
    });

    it('list() returns all entries', async () => {
        const store = new InMemoryDecisionLogStore();
        await store.add({ decision: 'A', agentId: 'bot' });
        await store.add({ decision: 'B', agentId: 'bot' });
        const all = await store.list();
        expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('list() filters by agentId', async () => {
        const store = new InMemoryDecisionLogStore();
        await store.add({ decision: 'A', agentId: 'agent-a' });
        await store.add({ decision: 'B', agentId: 'agent-b' });
        const results = await store.list('agent-a');
        expect(results.every(l => l.agentId === 'agent-a')).toBe(true);
    });

    it('update() sets outcome on existing entry', async () => {
        const store = new InMemoryDecisionLogStore();
        const entry = await store.add({ decision: 'X' });
        const ok = await store.update(entry.id, { outcome: 'success', outcomeQuality: 'good' });
        expect(ok).toBe(true);
    });
});
