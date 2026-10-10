import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Actor } from '../src/authz/policies.js';
import {
  sortStruggles,
  type RuleRepository,
  type Struggle,
} from '../src/rules/repository.js';
import { REMARK_WINDOW_DAYS } from '../src/rules/routes.js';
import { MemoryHalaqaRepository } from './memoryHalaqaRepository.js';

const ID = {
  owner: '10000000-0000-4000-8000-000000000001',
  otherTeacher: '10000000-0000-4000-8000-000000000002',
  admin: '10000000-0000-4000-8000-000000000003',
  member: '20000000-0000-4000-8000-000000000001',
  pending: '20000000-0000-4000-8000-000000000002',
  outsider: '20000000-0000-4000-8000-000000000003',
};
const ACTORS: Record<string, Actor> = {
  owner: { id: ID.owner, role: 'teacher' },
  otherTeacher: { id: ID.otherTeacher, role: 'teacher' },
  admin: { id: ID.admin, role: 'admin' },
  member: { id: ID.member, role: 'student' },
  pending: { id: ID.pending, role: 'student' },
  outsider: { id: ID.outsider, role: 'student' },
};
const quiet = { warn: () => {} };
const NOW = new Date('2026-10-10T10:00:00Z');

const struggle = (over: Partial<Struggle>): Struggle => ({
  studentId: ID.member,
  studentName: 'Maryam',
  topic: 'ikhfa',
  openCards: 0,
  lapses: 0,
  remarks: 0,
  lastRemarkOn: null,
  ...over,
});

/** Answers with fixed struggles and remembers what it was asked. */
class FixedRuleRepository implements RuleRepository {
  asked: { halaqaId: string; since: string }[] = [];
  constructor(private readonly rows: Struggle[]) {}
  async struggles(halaqaId: string, since: string): Promise<Struggle[]> {
    this.asked.push({ halaqaId, since });
    return this.rows;
  }
}

async function setup(rows: Struggle[] = [struggle({ openCards: 2, lapses: 3 })]) {
  const halaqat = new MemoryHalaqaRepository({});
  const halaqaId = await halaqat.create({
    name: 'Juzʾ ʿAmma',
    oneToOne: false,
    teacherId: ID.owner,
  });
  halaqat.addMember(halaqaId, ID.member, { role: 'student', status: 'active' });
  halaqat.addMember(halaqaId, ID.pending, { role: 'student', status: 'pending' });
  const repo = new FixedRuleRepository(rows);
  const app = createApp({
    version: 't',
    expectedRevision: null,
    health: { schemaRevision: async () => null },
    rules: {
      repo,
      halaqat,
      auth: { actor: async (h) => ACTORS[h.get('x-test-actor') ?? ''] ?? null },
      log: quiet,
      now: () => NOW,
    },
  });
  const call = (actor: string, path: string) =>
    app.request(`/api/v1${path}`, { headers: { 'x-test-actor': actor } });
  return { repo, halaqaId, call };
}

describe('rule by rule: who may see it (T14)', () => {
  const expected: Record<string, number> = {
    '': 401,
    outsider: 403,
    pending: 403,
    // A student never sees the class's weak rules, their own included.
    member: 403,
    owner: 200,
    otherTeacher: 403,
    admin: 200,
  };
  for (const [who, status] of Object.entries(expected)) {
    it(`as ${who || 'nobody'} → ${status}`, async () => {
      const { call, halaqaId } = await setup();
      expect((await call(who, `/halaqat/${halaqaId}/rules`)).status).toBe(status);
    });
  }
});

describe('rule by rule (T5)', () => {
  it(`counts remarks of the last ${REMARK_WINDOW_DAYS} days and is never cached`, async () => {
    const { call, repo, halaqaId } = await setup();
    const response = await call('owner', `/halaqat/${halaqaId}/rules`);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      since: '2026-07-12',
      struggles: [struggle({ openCards: 2, lapses: 3 })],
    });
    expect(repo.asked).toEqual([{ halaqaId, since: '2026-07-12' }]);
  });

  it('puts the heaviest struggle first', () => {
    const sorted = sortStruggles([
      struggle({ topic: 'qalqala', openCards: 1 }),
      struggle({ topic: 'ghunna', openCards: 1, remarks: 2 }),
      struggle({ topic: 'izhar', openCards: 1 }),
    ]);
    expect(sorted.map((s) => s.topic)).toEqual(['ghunna', 'izhar', 'qalqala']);
  });
});
