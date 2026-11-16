import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Actor } from '../src/authz/policies.js';
import {
  agreementOf,
  GATE_MIN_OCCURRENCES,
  occurrences,
  reachesGate,
  sortAgreement,
  type Agreement,
  type AgreementReport,
  type EvaluationOptIn,
  type EvaluationRepository,
} from '../src/speech/evaluation.js';
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
const quiet = { warn: () => {}, info: () => {} };
// Response bodies are checked field by field below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (response: Response): Promise<any> => response.json();

const agreement = (over: Partial<Agreement> = {}): Agreement => ({
  model: 'quran-muallim-1',
  topic: 'ghunna',
  bothCheck: 0,
  bothGood: 0,
  falseAlarms: 0,
  misses: 0,
  unclear: 0,
  unheard: 0,
  ...over,
});

class MemoryEvaluationRepository implements EvaluationRepository {
  optIns = new Map<string, string>();
  changes: { userId: string; optedIn: boolean; ip: string | null }[] = [];
  asked: string[] = [];
  constructor(private readonly report: AgreementReport) {}

  async optIn(userId: string): Promise<EvaluationOptIn> {
    const since = this.optIns.get(userId) ?? null;
    return { optedIn: since !== null, since };
  }
  async setOptIn(userId: string, optedIn: boolean, ip: string | null): Promise<void> {
    this.changes.push({ userId, optedIn, ip });
    if (optedIn) this.optIns.set(userId, '2026-11-16T08:00:00.000Z');
    else this.optIns.delete(userId);
  }
  async agreement(halaqaId: string): Promise<AgreementReport> {
    this.asked.push(halaqaId);
    return this.report;
  }
}

const REPORT: AgreementReport = {
  recordings: 12,
  students: 3,
  rows: [agreement({ bothCheck: 3, bothGood: 5, falseAlarms: 1, misses: 1, unclear: 2 })],
};

async function setup(available = true, report: AgreementReport = REPORT) {
  const halaqat = new MemoryHalaqaRepository({});
  const halaqaId = await halaqat.create({
    name: 'Juzʾ ʿAmma',
    oneToOne: false,
    teacherId: ID.owner,
  });
  halaqat.addMember(halaqaId, ID.member, { role: 'student', status: 'active' });
  halaqat.addMember(halaqaId, ID.pending, { role: 'student', status: 'pending' });
  const repo = new MemoryEvaluationRepository(report);
  const app = createApp({
    version: 't',
    expectedRevision: null,
    health: { schemaRevision: async () => null },
    speechEvaluation: {
      repo,
      halaqat,
      auth: { actor: async (h) => ACTORS[h.get('x-test-actor') ?? ''] ?? null },
      log: quiet,
      available,
    },
  });
  const call = (actor: string, method: string, path: string, body?: unknown) =>
    app.request(`/api/v1${path}`, {
      method,
      headers: {
        'x-test-actor': actor,
        'x-real-ip': '203.0.113.7',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { app, repo, halaqaId, call };
}

describe('the agreement numbers (ADR-0013)', () => {
  it('compare only where both spoke on the rule', () => {
    const row = agreement({
      bothCheck: 3,
      bothGood: 5,
      falseAlarms: 1,
      misses: 1,
      unclear: 7,
      unheard: 4,
    });
    expect(occurrences(row)).toBe(10);
    expect(agreementOf(row)).toBe(0.8);
    expect(agreementOf(agreement())).toBeNull();
  });

  it('reach the gate from 200 words at 90 %, not before', () => {
    expect(reachesGate(agreement({ bothGood: 180, falseAlarms: 20 }))).toBe(true);
    expect(reachesGate(agreement({ bothGood: 179, falseAlarms: 21 }))).toBe(false);
    expect(
      reachesGate(agreement({ bothGood: GATE_MIN_OCCURRENCES - 1, unclear: 500 }))
    ).toBe(false);
    expect(reachesGate(agreement())).toBe(false);
  });

  it('are listed by model, then in the order of the topics', () => {
    const rows = sortAgreement([
      agreement({ model: 'b', topic: 'izhar' }),
      agreement({ model: 'a', topic: 'madd' }),
      agreement({ model: 'a', topic: 'idgham' }),
    ]);
    expect(rows.map((r) => `${r.model} ${r.topic}`)).toEqual([
      'a idgham',
      'a madd',
      'b izhar',
    ]);
  });
});

describe('the opt-in for measuring the speech check (S6.2)', () => {
  it('is off until given, given by the person themselves and taken back', async () => {
    const { call, repo } = await setup();
    expect(await (await call('member', 'GET', '/speech/evaluation')).json()).toEqual({
      available: true,
      optedIn: false,
      since: null,
    });
    const given = await call('member', 'PUT', '/speech/evaluation', { optedIn: true });
    expect(given.status).toBe(204);
    expect(await (await call('member', 'GET', '/speech/evaluation')).json()).toEqual({
      available: true,
      optedIn: true,
      since: '2026-11-16T08:00:00.000Z',
    });
    // Another person's opt-in is not this one's.
    expect(
      (await json(await call('outsider', 'GET', '/speech/evaluation'))).optedIn
    ).toBe(false);
    expect(
      (await call('member', 'PUT', '/speech/evaluation', { optedIn: false })).status
    ).toBe(204);
    expect(repo.changes).toEqual([
      { userId: ID.member, optedIn: true, ip: '203.0.113.7' },
      { userId: ID.member, optedIn: false, ip: '203.0.113.7' },
    ]);
    expect(repo.optIns.size).toBe(0);
  });

  it('needs a sign-in and a plain yes or no', async () => {
    const { call, repo } = await setup();
    expect((await call('', 'GET', '/speech/evaluation')).status).toBe(401);
    expect((await call('', 'PUT', '/speech/evaluation', { optedIn: true })).status).toBe(
      401
    );
    for (const body of [{}, { optedIn: 'yes' }, { optedIn: true, userId: ID.outsider }]) {
      expect((await call('member', 'PUT', '/speech/evaluation', body)).status).toBe(400);
    }
    expect(repo.changes).toEqual([]);
  });

  it('cannot be given while there is no check to measure, but always taken back', async () => {
    const { call, repo } = await setup(false);
    expect(
      (await json(await call('member', 'GET', '/speech/evaluation'))).available
    ).toBe(false);
    const refused = await call('member', 'PUT', '/speech/evaluation', { optedIn: true });
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({ error: 'speech_unavailable' });
    expect(
      (await call('member', 'PUT', '/speech/evaluation', { optedIn: false })).status
    ).toBe(204);
    expect(repo.changes).toEqual([
      { userId: ID.member, optedIn: false, ip: '203.0.113.7' },
    ]);
  });
});

describe('the agreement report (S6.2)', () => {
  it('gives the teacher counts per model and rule, the share and the gate', async () => {
    const { call, repo, halaqaId } = await setup();
    const response = await call('owner', 'GET', `/halaqat/${halaqaId}/speech/agreement`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      recordings: 12,
      students: 3,
      gate: { occurrences: 200, agreement: 0.9 },
      rows: [
        {
          model: 'quran-muallim-1',
          topic: 'ghunna',
          bothCheck: 3,
          bothGood: 5,
          falseAlarms: 1,
          misses: 1,
          unclear: 2,
          unheard: 0,
          occurrences: 10,
          agreement: 0.8,
          reachesGate: false,
        },
      ],
    });
    expect(repo.asked).toEqual([halaqaId]);
  });

  // Route × role (threat T14): only the teachers of the ḥalaqa, and admins, see the report.
  it.each([
    ['', 401],
    ['outsider', 403],
    ['pending', 403],
    ['member', 403],
    ['otherTeacher', 403],
    ['owner', 200],
    ['admin', 200],
  ])('answers %s with %i', async (actor, status) => {
    const { call, repo, halaqaId } = await setup();
    const response = await call(actor, 'GET', `/halaqat/${halaqaId}/speech/agreement`);
    expect(response.status).toBe(status);
    if (status !== 200) {
      expect(await response.text()).not.toContain('ghunna');
      expect(repo.asked).toEqual([]);
    }
  });

  it('knows no ḥalaqa that is not one', async () => {
    const { call } = await setup();
    expect(
      (await call('admin', 'GET', '/halaqat/not-a-uuid/speech/agreement')).status
    ).toBe(404);
  });
});
