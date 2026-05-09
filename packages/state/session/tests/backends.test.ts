import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AgentDb, type KnowledgeQuery, type KnowledgeRow, type LearningQuery, type LearningRow, type MemoryQuery, type MemoryRow, type ScheduleRow, type SessionQuery, type SessionRow, type TraceRow, type UpsertKnowledgeInput, type UpsertLearningInput, type UpsertMemoryInput, type UpsertSessionInput } from '@confused-ai/db';
import { DbSessionStore } from '../src/db-store.js';
import { createSqliteStore } from '../src/sqlite.js';

const require = createRequire(import.meta.url);
const HAS_SQLITE = (() => {
  if (process.versions.bun) return false;
  try {
    require.resolve('better-sqlite3');
    return true;
  } catch {
    return false;
  }
})();

class FakeAgentDb extends AgentDb {
  readonly type = 'fake';
  private session: SessionRow | null = null;

  async init(): Promise<void> {
    await Promise.resolve();
  }

  async close(): Promise<void> {}

  async upsertSession(input: UpsertSessionInput): Promise<SessionRow> {
    await Promise.resolve();
    const now = Date.now();
    this.session = {
      session_id: input.sessionId,
      session_type: input.sessionType ?? 'agent',
      agent_id: input.agentId ?? null,
      team_id: input.teamId ?? null,
      workflow_id: input.workflowId ?? null,
      user_id: input.userId ?? null,
      agent_data: null,
      team_data: null,
      workflow_data: null,
      session_data: input.sessionData ? JSON.stringify(input.sessionData) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      runs: input.runs ? JSON.stringify(input.runs) : null,
      summary: input.summary ?? null,
      created_at: this.session?.created_at ?? now,
      updated_at: now,
    };
    return { ...this.session };
  }

  async getSession(sessionId: string): Promise<SessionRow | null> {
    const snapshot = this.session && this.session.session_id === sessionId
      ? { ...this.session }
      : null;
    await Promise.resolve();
    return snapshot;
  }

  async getSessions(_query: SessionQuery): Promise<SessionRow[]> { return this.session ? [{ ...this.session }] : []; }
  async deleteSession(sessionId: string): Promise<boolean> {
    const existed = this.session?.session_id === sessionId;
    if (existed) this.session = null;
    return existed;
  }
  async renameSession(_sessionId: string, _name: string): Promise<SessionRow | null> { return this.session ? { ...this.session } : null; }
  async upsertMemory(_input: UpsertMemoryInput): Promise<MemoryRow> { throw new Error('not used'); }
  async getMemory(_memoryId: string): Promise<MemoryRow | null> { return null; }
  async getMemories(_query: MemoryQuery): Promise<MemoryRow[]> { return []; }
  async deleteMemory(_memoryId: string): Promise<boolean> { return false; }
  async clearMemories(): Promise<void> {}
  async upsertLearning(_input: UpsertLearningInput): Promise<void> {}
  async getLearning(_query: LearningQuery): Promise<LearningRow | null> { return null; }
  async getLearnings(_query: LearningQuery): Promise<LearningRow[]> { return []; }
  async deleteLearning(_id: string): Promise<boolean> { return false; }
  async upsertKnowledge(_input: UpsertKnowledgeInput): Promise<KnowledgeRow> { throw new Error('not used'); }
  async getKnowledge(_id: string): Promise<KnowledgeRow | null> { return null; }
  async getKnowledgeItems(_query: KnowledgeQuery): Promise<[KnowledgeRow[], number]> { return [[], 0]; }
  async deleteKnowledge(_id: string): Promise<boolean> { return false; }
  async upsertTrace(_trace: Omit<TraceRow, 'created_at' | 'updated_at'> & { created_at?: number; updated_at?: number }): Promise<void> {}
  async getTrace(_traceId: string): Promise<TraceRow | null> { return null; }
  async getTraces(_opts: { sessionId?: string; agentId?: string; userId?: string; limit?: number; offset?: number }): Promise<[TraceRow[], number]> { return [[], 0]; }
  async createSchedule(row: Omit<ScheduleRow, 'created_at' | 'updated_at'>): Promise<ScheduleRow> {
    return { ...row, created_at: Date.now(), updated_at: Date.now() };
  }
  async getSchedule(_id: string): Promise<ScheduleRow | null> { return null; }
  async getSchedules(_opts?: { enabled?: boolean; limit?: number }): Promise<ScheduleRow[]> { return []; }
  async updateSchedule(_id: string, _updates: Partial<ScheduleRow>): Promise<ScheduleRow | null> { return null; }
  async deleteSchedule(_id: string): Promise<boolean> { return false; }

  setRawSessionData(raw: string): void {
    if (!this.session) throw new Error('session not initialized');
    this.session = { ...this.session, session_data: raw };
  }
}

describe('DbSessionStore', () => {
  it('serializes concurrent appends per session', async () => {
    const db = new FakeAgentDb();
    const store = new DbSessionStore(db);
    const session = await store.create({ agentId: 'db-agent' });

    await Promise.all([
      store.appendMessage(session.id, { role: 'user', content: 'first' }),
      store.appendMessage(session.id, { role: 'assistant', content: 'second' }),
    ]);

    const messages = await store.getMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.content)).toEqual(['first', 'second']);
  });

  it('recovers from malformed session JSON', async () => {
    const db = new FakeAgentDb();
    const store = new DbSessionStore(db);
    const session = await store.create({ agentId: 'db-agent' });
    db.setRawSessionData('{broken json');

    expect((await store.get(session.id))?.messages).toEqual([]);
    expect(await store.getMessages(session.id)).toEqual([]);

    await store.appendMessage(session.id, { role: 'user', content: 'recovered' });
    expect(await store.getMessages(session.id)).toEqual([{ role: 'user', content: 'recovered' }]);
  });
});

const describeSqlite = HAS_SQLITE ? describe : describe.skip;

describeSqlite('createSqliteStore', () => {
  it('recovers from malformed persisted message JSON', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'confused-ai-session-'));
    const dbPath = join(tempDir, 'session.db');
    try {
      const store = createSqliteStore({ path: dbPath });
      const session = await store.create({ agentId: 'sqlite-agent' });
      const Database = require('better-sqlite3') as new (path: string) => {
        prepare(sql: string): { run(...args: unknown[]): unknown };
        close(): void;
      };
      const db = new Database(dbPath);
      db.prepare('UPDATE sessions SET messages = ? WHERE id = ?').run('{bad json', session.id);
      db.close();

      expect((await store.get(session.id))?.messages).toEqual([]);
      expect(await store.getMessages(session.id)).toEqual([]);

      await store.appendMessage(session.id, { role: 'user', content: 'recovered' });
      expect(await store.getMessages(session.id)).toEqual([{ role: 'user', content: 'recovered' }]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});