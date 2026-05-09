/**
 * Comprehensive test suite for @confused-ai/db.
 *
 * Tests InMemoryAgentDb (zero-dep, always available) to validate the full
 * AgentDb contract. Also tests base validation, factory, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAgentDb } from '../src/in-memory.js';
import { validateTableName, validateTableNames } from '../src/base.js';
import { DEFAULT_TABLE_NAMES } from '../src/types.js';
import { createAgentDb } from '../src/factory.js';
import type { AgentDb } from '../src/base.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeDb(): InMemoryAgentDb { return new InMemoryAgentDb(); }

// ─────────────────────────────────────────────────────────────────────────────
// Table-name validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validateTableName', () => {
  it('accepts valid names', () => {
    expect(validateTableName('agent_sessions')).toBe('agent_sessions');
    expect(validateTableName('_private')).toBe('_private');
    expect(validateTableName('T1')).toBe('T1');
  });

  it('rejects SQL-injection attempts', () => {
    expect(() => validateTableName('users; DROP TABLE users')).toThrow('Invalid table name');
    expect(() => validateTableName('foo--bar')).toThrow('Invalid table name');
    expect(() => validateTableName("foo' OR 1=1")).toThrow('Invalid table name');
    expect(() => validateTableName('')).toThrow('Invalid table name');
  });

  it('rejects names starting with digit', () => {
    expect(() => validateTableName('1table')).toThrow('Invalid table name');
  });

  it('rejects names > 63 chars', () => {
    expect(() => validateTableName('a'.repeat(64))).toThrow('Invalid table name');
  });
});

describe('validateTableNames', () => {
  it('validates all default names', () => {
    expect(() => validateTableNames(DEFAULT_TABLE_NAMES)).not.toThrow();
  });

  it('rejects if any name is invalid', () => {
    expect(() => validateTableNames({ ...DEFAULT_TABLE_NAMES, sessions: 'bad name!' })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

describe('createAgentDb', () => {
  it('creates in-memory from string', async () => {
    const db = await createAgentDb('memory');
    expect(db).toBeInstanceOf(InMemoryAgentDb);
  });

  it('creates in-memory from config object', async () => {
    const db = await createAgentDb({ type: 'in-memory' });
    expect(db).toBeInstanceOf(InMemoryAgentDb);
  });

  it('throws on unknown type', async () => {
    await expect(createAgentDb({ type: 'cassandra' as never })).rejects.toThrow('Unknown database type');
  });

  it('throws on unparseable URL', async () => {
    await expect(createAgentDb('ftp://whatever')).rejects.toThrow('Cannot parse database URL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// InMemoryAgentDb — full CRUD contract
// ─────────────────────────────────────────────────────────────────────────────

describe('InMemoryAgentDb', () => {
  let db: AgentDb;

  beforeEach(async () => {
    db = makeDb();
    await db.init();
  });

  // ── Health ───────────────────────────────────────────────────────────────

  it('health() returns ok', async () => {
    const h = await db.health();
    expect(h.ok).toBe(true);
    expect(h.latencyMs).toBeGreaterThanOrEqual(0);
  });

  // ── Sessions ─────────────────────────────────────────────────────────────

  describe('sessions', () => {
    it('upsert + get', async () => {
      const row = await db.upsertSession({ sessionId: 's1', userId: 'u1' });
      expect(row.session_id).toBe('s1');
      expect(row.user_id).toBe('u1');
      expect(row.created_at).toBeGreaterThan(0);

      const got = await db.getSession('s1');
      expect(got?.session_id).toBe('s1');
    });

    it('getSession with wrong userId returns null', async () => {
      await db.upsertSession({ sessionId: 's1', userId: 'u1' });
      expect(await db.getSession('s1', 'u-other')).toBeNull();
    });

    it('upsert updates existing (preserves created_at)', async () => {
      const r1 = await db.upsertSession({ sessionId: 's1', summary: 'v1' });
      const r2 = await db.upsertSession({ sessionId: 's1', summary: 'v2' });
      expect(r2.summary).toBe('v2');
      expect(r2.created_at).toBe(r1.created_at);
    });

    it('getSessions with filters', async () => {
      await db.upsertSession({ sessionId: 's1', userId: 'u1', agentId: 'a1' });
      await db.upsertSession({ sessionId: 's2', userId: 'u2', agentId: 'a1' });
      await db.upsertSession({ sessionId: 's3', userId: 'u1', agentId: 'a2' });

      const byUser = await db.getSessions({ userId: 'u1' });
      expect(byUser).toHaveLength(2);

      const byAgent = await db.getSessions({ agentId: 'a1' });
      expect(byAgent).toHaveLength(2);

      const limited = await db.getSessions({ userId: 'u1', limit: 1 });
      expect(limited).toHaveLength(1);
    });

    it('getSessions returns empty for no matches', async () => {
      expect(await db.getSessions({ userId: 'nobody' })).toEqual([]);
    });

    it('deleteSession', async () => {
      await db.upsertSession({ sessionId: 's1' });
      expect(await db.deleteSession('s1')).toBe(true);
      expect(await db.getSession('s1')).toBeNull();
    });

    it('deleteSession with userId check', async () => {
      await db.upsertSession({ sessionId: 's1', userId: 'u1' });
      expect(await db.deleteSession('s1', 'u-wrong')).toBe(false);
      expect(await db.getSession('s1')).not.toBeNull();
      expect(await db.deleteSession('s1', 'u1')).toBe(true);
    });

    it('deleteSession for non-existent returns false', async () => {
      expect(await db.deleteSession('ghost')).toBe(false);
    });

    it('renameSession', async () => {
      await db.upsertSession({ sessionId: 's1' });
      const renamed = await db.renameSession('s1', 'My Session');
      expect(renamed).not.toBeNull();
      const sd = JSON.parse(renamed!.session_data!);
      expect(sd.session_name).toBe('My Session');
    });

    it('renameSession on non-existent returns null', async () => {
      expect(await db.renameSession('ghost', 'x')).toBeNull();
    });

    it('stores and retrieves JSON blobs', async () => {
      await db.upsertSession({
        sessionId: 's1',
        agentData: { model: 'gpt-4' },
        metadata: { key: 'val' },
        runs: [{ id: 1 }],
      });
      const got = await db.getSession('s1');
      expect(JSON.parse(got!.agent_data!)).toEqual({ model: 'gpt-4' });
      expect(JSON.parse(got!.metadata!)).toEqual({ key: 'val' });
      expect(JSON.parse(got!.runs!)).toEqual([{ id: 1 }]);
    });
  });

  // ── Memories ─────────────────────────────────────────────────────────────

  describe('memories', () => {
    it('upsert + get', async () => {
      const row = await db.upsertMemory({ memory: 'User likes cats', userId: 'u1' });
      expect(row.memory).toBe('User likes cats');
      expect(row.memory_id).toBeTruthy();

      const got = await db.getMemory(row.memory_id);
      expect(got?.memory).toBe('User likes cats');
    });

    it('upsert with explicit memoryId', async () => {
      await db.upsertMemory({ memoryId: 'm1', memory: 'v1' });
      await db.upsertMemory({ memoryId: 'm1', memory: 'v2' });
      const got = await db.getMemory('m1');
      expect(got?.memory).toBe('v2');
    });

    it('getMemory with userId filter', async () => {
      await db.upsertMemory({ memoryId: 'm1', memory: 'x', userId: 'u1' });
      expect(await db.getMemory('m1', 'u-wrong')).toBeNull();
      expect(await db.getMemory('m1', 'u1')).not.toBeNull();
    });

    it('getMemories with search', async () => {
      await db.upsertMemory({ memoryId: 'm1', memory: 'User likes cats', userId: 'u1' });
      await db.upsertMemory({ memoryId: 'm2', memory: 'User likes dogs', userId: 'u1' });
      await db.upsertMemory({ memoryId: 'm3', memory: 'Favorite color is blue', userId: 'u1' });

      const cats = await db.getMemories({ userId: 'u1', search: 'cats' });
      expect(cats).toHaveLength(1);
      expect(cats[0].memory_id).toBe('m1');
    });

    it('getMemories with limit/offset', async () => {
      for (let i = 0; i < 5; i++) {
        await db.upsertMemory({ memoryId: `m${i}`, memory: `mem ${i}`, userId: 'u1' });
      }
      const page = await db.getMemories({ userId: 'u1', limit: 2, offset: 1 });
      expect(page).toHaveLength(2);
    });

    it('deleteMemory', async () => {
      await db.upsertMemory({ memoryId: 'm1', memory: 'x' });
      expect(await db.deleteMemory('m1')).toBe(true);
      expect(await db.getMemory('m1')).toBeNull();
    });

    it('deleteMemory with userId', async () => {
      await db.upsertMemory({ memoryId: 'm1', memory: 'x', userId: 'u1' });
      expect(await db.deleteMemory('m1', 'u-wrong')).toBe(false);
      expect(await db.deleteMemory('m1', 'u1')).toBe(true);
    });

    it('clearMemories for user', async () => {
      await db.upsertMemory({ memoryId: 'm1', memory: 'a', userId: 'u1' });
      await db.upsertMemory({ memoryId: 'm2', memory: 'b', userId: 'u2' });
      await db.clearMemories('u1');
      expect(await db.getMemory('m1')).toBeNull();
      expect(await db.getMemory('m2')).not.toBeNull();
    });

    it('clearMemories all', async () => {
      await db.upsertMemory({ memoryId: 'm1', memory: 'a', userId: 'u1' });
      await db.upsertMemory({ memoryId: 'm2', memory: 'b', userId: 'u2' });
      await db.clearMemories();
      expect(await db.getMemories({})).toEqual([]);
    });
  });

  // ── Learnings ────────────────────────────────────────────────────────────

  describe('learnings', () => {
    it('upsert + get', async () => {
      await db.upsertLearning({
        id: 'l1', learningType: 'user_profile',
        content: { preference: 'dark mode' }, userId: 'u1',
      });
      const got = await db.getLearning({ learningType: 'user_profile', userId: 'u1' });
      expect(got).not.toBeNull();
      expect(got!.learning_id).toBe('l1');
    });

    it('upsert updates content', async () => {
      await db.upsertLearning({ id: 'l1', learningType: 'user_profile', content: { v: 1 } });
      await db.upsertLearning({ id: 'l1', learningType: 'user_profile', content: { v: 2 } });
      const got = await db.getLearning({ learningType: 'user_profile' });
      const content = JSON.parse(got!.content);
      expect(content.v).toBe(2);
    });

    it('getLearnings with multiple filters', async () => {
      await db.upsertLearning({ id: 'l1', learningType: 'user_profile', content: {}, userId: 'u1', agentId: 'a1' });
      await db.upsertLearning({ id: 'l2', learningType: 'session_context', content: {}, userId: 'u1', agentId: 'a1' });
      await db.upsertLearning({ id: 'l3', learningType: 'user_profile', content: {}, userId: 'u2' });

      const result = await db.getLearnings({ learningType: 'user_profile', userId: 'u1' });
      expect(result).toHaveLength(1);
      expect(result[0].learning_id).toBe('l1');
    });

    it('getLearning returns null when no match', async () => {
      expect(await db.getLearning({ learningType: 'user_profile' })).toBeNull();
    });

    it('deleteLearning', async () => {
      await db.upsertLearning({ id: 'l1', learningType: 'user_profile', content: {} });
      expect(await db.deleteLearning('l1')).toBe(true);
      expect(await db.getLearning({ learningType: 'user_profile' })).toBeNull();
    });

    it('deleteLearning non-existent returns false', async () => {
      expect(await db.deleteLearning('ghost')).toBe(false);
    });
  });

  // ── Knowledge ────────────────────────────────────────────────────────────

  describe('knowledge', () => {
    it('upsert + get', async () => {
      const row = await db.upsertKnowledge({ id: 'k1', name: 'FAQ', content: { q: 'what?' } });
      expect(row.id).toBe('k1');
      expect(row.name).toBe('FAQ');

      const got = await db.getKnowledge('k1');
      expect(got).not.toBeNull();
    });

    it('upsert preserves access_count and created_at', async () => {
      const r1 = await db.upsertKnowledge({ id: 'k1', name: 'v1', content: {} });
      const r2 = await db.upsertKnowledge({ id: 'k1', name: 'v2', content: {} });
      expect(r2.created_at).toBe(r1.created_at);
      expect(r2.access_count).toBe(0);
    });

    it('getKnowledgeItems with filters', async () => {
      await db.upsertKnowledge({ id: 'k1', linkedTo: 'agent1', status: 'active', content: {} });
      await db.upsertKnowledge({ id: 'k2', linkedTo: 'agent1', status: 'archived', content: {} });
      await db.upsertKnowledge({ id: 'k3', linkedTo: 'agent2', status: 'active', content: {} });

      const [items, total] = await db.getKnowledgeItems({ linkedTo: 'agent1' });
      expect(items).toHaveLength(2);
      expect(total).toBe(2);

      const [active] = await db.getKnowledgeItems({ status: 'active' });
      expect(active).toHaveLength(2);
    });

    it('getKnowledgeItems with limit/offset', async () => {
      for (let i = 0; i < 5; i++) {
        await db.upsertKnowledge({ id: `k${i}`, content: {} });
      }
      const [items, total] = await db.getKnowledgeItems({ limit: 2, offset: 1 });
      expect(items).toHaveLength(2);
      expect(total).toBe(5);
    });

    it('getKnowledge returns null for missing', async () => {
      expect(await db.getKnowledge('ghost')).toBeNull();
    });

    it('deleteKnowledge', async () => {
      await db.upsertKnowledge({ id: 'k1', content: {} });
      expect(await db.deleteKnowledge('k1')).toBe(true);
      expect(await db.getKnowledge('k1')).toBeNull();
    });
  });

  // ── Traces ───────────────────────────────────────────────────────────────

  describe('traces', () => {
    it('upsert + get', async () => {
      await db.upsertTrace({
        trace_id: 't1', session_id: 's1', agent_id: 'a1',
        name: 'llm-call', status: 'completed',
        start_time: '2024-01-01', end_time: '2024-01-02', duration_ms: 100,
      });
      const got = await db.getTrace('t1');
      expect(got?.name).toBe('llm-call');
      expect(got?.duration_ms).toBe(100);
    });

    it('upsert updates existing trace', async () => {
      await db.upsertTrace({ trace_id: 't1', status: 'running' });
      await db.upsertTrace({ trace_id: 't1', status: 'completed', duration_ms: 500 });
      const got = await db.getTrace('t1');
      expect(got?.status).toBe('completed');
    });

    it('getTraces with filters', async () => {
      await db.upsertTrace({ trace_id: 't1', session_id: 's1', agent_id: 'a1' });
      await db.upsertTrace({ trace_id: 't2', session_id: 's1', agent_id: 'a2' });
      await db.upsertTrace({ trace_id: 't3', session_id: 's2' });

      const [bySession, total] = await db.getTraces({ sessionId: 's1' });
      expect(bySession).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('getTrace returns null for missing', async () => {
      expect(await db.getTrace('ghost')).toBeNull();
    });
  });

  // ── Schedules ────────────────────────────────────────────────────────────

  describe('schedules', () => {
    it('create + get', async () => {
      const row = await db.createSchedule({
        id: 'sch1', name: 'daily-cleanup', agent_id: 'a1',
        cron: '0 0 * * *', enabled: true,
      });
      expect(row.id).toBe('sch1');
      expect(row.created_at).toBeGreaterThan(0);

      const got = await db.getSchedule('sch1');
      expect(got?.name).toBe('daily-cleanup');
      expect(got?.enabled).toBe(true);
    });

    it('getSchedules with enabled filter', async () => {
      await db.createSchedule({ id: 's1', name: 'a', enabled: true });
      await db.createSchedule({ id: 's2', name: 'b', enabled: false });
      await db.createSchedule({ id: 's3', name: 'c', enabled: true });

      const enabled = await db.getSchedules({ enabled: true });
      expect(enabled).toHaveLength(2);

      const disabled = await db.getSchedules({ enabled: false });
      expect(disabled).toHaveLength(1);
    });

    it('updateSchedule', async () => {
      await db.createSchedule({ id: 's1', name: 'old', enabled: true });
      const updated = await db.updateSchedule('s1', { name: 'new', enabled: false });
      expect(updated?.name).toBe('new');
      expect(updated?.enabled).toBe(false);
    });

    it('updateSchedule on non-existent returns null', async () => {
      expect(await db.updateSchedule('ghost', { name: 'x' })).toBeNull();
    });

    it('deleteSchedule', async () => {
      await db.createSchedule({ id: 's1', name: 'x', enabled: true });
      expect(await db.deleteSchedule('s1')).toBe(true);
      expect(await db.getSchedule('s1')).toBeNull();
    });

    it('deleteSchedule non-existent returns false', async () => {
      expect(await db.deleteSchedule('ghost')).toBe(false);
    });
  });

  // ── toDict ───────────────────────────────────────────────────────────────

  it('toDict returns type', () => {
    const dict = (db as InMemoryAgentDb).toDict();
    expect(dict.type).toBe('in-memory');
  });

  // ── close is safe to call multiple times ─────────────────────────────────

  it('close is idempotent', async () => {
    await db.close();
    await db.close(); // should not throw
  });

  // ── init is idempotent ───────────────────────────────────────────────────

  it('init is idempotent', async () => {
    await db.init();
    await db.init(); // should not throw
  });
});
