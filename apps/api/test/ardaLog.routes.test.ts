import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { dayIn } from '../src/ardaLog/repository.js';
import { MAX_HAND_ENTRIES_PER_STUDENT, PAGE_SIZE } from '../src/ardaLog/routes.js';
import type { Actor } from '../src/authz/policies.js';
import { MemoryArdaLogRepository } from './memoryArdaLogRepository.js';
import { MemoryAssignmentRepository } from './memoryAssignmentRepository.js';
import { MemoryHalaqaRepository } from './memoryHalaqaRepository.js';
import { MemoryRecordingRepository } from './memoryRecordingRepository.js';

const ID = {
  owner: '10000000-0000-4000-8000-000000000001',
  otherTeacher: '10000000-0000-4000-8000-000000000002',
  admin: '10000000-0000-4000-8000-000000000003',
  member: '20000000-0000-4000-8000-000000000001',
  pending: '20000000-0000-4000-8000-000000000002',
  outsider: '20000000-0000-4000-8000-000000000003',
  classmate: '20000000-0000-4000-8000-000000000004',
};
const ACTORS: Record<string, Actor> = {
  owner: { id: ID.owner, role: 'teacher' },
  otherTeacher: { id: ID.otherTeacher, role: 'teacher' },
  admin: { id: ID.admin, role: 'admin' },
  member: { id: ID.member, role: 'student' },
  pending: { id: ID.pending, role: 'student' },
  outsider: { id: ID.outsider, role: 'student' },
  classmate: { id: ID.classmate, role: 'student' },
};
const NAMES = {
  [ID.owner]: 'Sheikh Ahmad',
  [ID.member]: 'Maryam',
  [ID.classmate]: 'Yusuf',
};
const quiet = { warn: () => {}, info: () => {} };
/** The tests' today: 10 October 2026. */
const NOW = new Date('2026-10-10T10:00:00Z');
// Response bodies are checked field by field below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const json = async (response: Response): Promise<Json> => response.json();

/** A recitation heard face to face. */
const entry = (over: Record<string, unknown> = {}) => ({
  studentId: ID.member,
  range: { sura: 112, from: 1, to: 4 },
  recitedOn: '2026-10-09',
  verdict: 'good',
  ...over,
});

/** A ḥalaqa taught by `owner` with two active students and a pending one. */
async function setup() {
  const halaqat = new MemoryHalaqaRepository(NAMES);
  const assignments = new MemoryAssignmentRepository(halaqat, NAMES);
  const log = new MemoryArdaLogRepository(halaqat, NAMES);
  const recordings = new MemoryRecordingRepository(halaqat, assignments, NAMES, log);
  const halaqaId = await halaqat.create({
    name: 'Juzʾ ʿAmma',
    oneToOne: false,
    teacherId: ID.owner,
  });
  halaqat.addMember(halaqaId, ID.member, { role: 'student', status: 'active' });
  halaqat.addMember(halaqaId, ID.classmate, { role: 'student', status: 'active' });
  halaqat.addMember(halaqaId, ID.pending, { role: 'student', status: 'pending' });
  const auth = {
    actor: async (h: Headers) => ACTORS[h.get('x-test-actor') ?? ''] ?? null,
  };
  const app = createApp({
    version: 't',
    expectedRevision: null,
    health: { schemaRevision: async () => null },
    recordings: { repo: recordings, halaqat, auth, log: quiet },
    ardaLog: { repo: log, halaqat, auth, log: quiet, now: () => NOW },
  });
  const call = (actor: string, method: string, path: string, body?: unknown) =>
    app.request(`/api/v1${path}`, {
      method,
      headers: {
        'x-test-actor': actor,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const write = async (over: Record<string, unknown> = {}, actor = 'owner') => {
    const response = await call(
      actor,
      'POST',
      `/halaqat/${halaqaId}/arda-log`,
      entry(over)
    );
    expect(response.status).toBe(201);
    return (await json(response)).id as string;
  };
  return { halaqat, log, recordings, halaqaId, call, write };
}

const WHO = [
  '',
  'outsider',
  'pending',
  'member',
  'owner',
  'otherTeacher',
  'admin',
] as const;

/**
 * Route × role (threat T14): every route against every kind of caller, each on a fresh ḥalaqa
 * with one entry about `member`. Written out by hand, so widening access is a visible change.
 */
const MATRIX: {
  route: string;
  method: string;
  path: (halaqaId: string, entryId: string) => string;
  body?: boolean;
  expect: Record<(typeof WHO)[number], number>;
}[] = [
  {
    route: 'the summary per student and sūra',
    method: 'GET',
    path: (h) => `/halaqat/${h}/arda-log/summary`,
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 403,
      owner: 200,
      otherTeacher: 403,
      admin: 200,
    },
  },
  {
    route: 'the entries',
    method: 'GET',
    path: (h) => `/halaqat/${h}/arda-log`,
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 403,
      owner: 200,
      otherTeacher: 403,
      admin: 200,
    },
  },
  {
    route: 'write an entry by hand',
    method: 'POST',
    path: (h) => `/halaqat/${h}/arda-log`,
    body: true,
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 403,
      owner: 201,
      otherTeacher: 403,
      admin: 201,
    },
  },
  {
    route: 'remove an entry',
    method: 'DELETE',
    path: (h, e) => `/halaqat/${h}/arda-log/${e}`,
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 403,
      owner: 204,
      otherTeacher: 403,
      admin: 204,
    },
  },
  {
    route: 'my own summary',
    method: 'GET',
    path: () => '/arda-log/summary',
    expect: {
      '': 401,
      outsider: 200,
      pending: 200,
      member: 200,
      owner: 200,
      otherTeacher: 200,
      admin: 200,
    },
  },
];

describe('ʿarḍ log: who may do what', () => {
  for (const row of MATRIX) {
    for (const who of WHO) {
      it(`${row.route} as ${who || 'nobody'} → ${row.expect[who]}`, async () => {
        const { call, write, halaqaId } = await setup();
        const entryId = await write();
        const response = await call(
          who,
          row.method,
          row.path(halaqaId, entryId),
          row.body ? entry() : undefined
        );
        expect(response.status).toBe(row.expect[who]);
      });
    }
  }
});

describe('answers enter the log (T4)', () => {
  it('writes one entry per recording, rewrites it on a new answer, keeps it when the take goes', async () => {
    const { call, recordings, halaqaId } = await setup();
    const saved = await recordings.save(
      {
        clientId: '30000000-0000-4000-8000-000000000001',
        halaqaId,
        studentId: ID.member,
        assignmentId: null,
        range: { sura: 112, from: 1, to: 4 },
        mime: 'audio/webm',
        durationMs: 4000,
        audio: Buffer.from('take'),
      },
      10
    );
    const id = (saved as { id: string }).id;
    const answer = (body: unknown) =>
      call('owner', 'PUT', `/halaqat/${halaqaId}/recordings/${id}/review`, body);
    expect((await answer({ verdict: 'again', note: 'Āya 2 noch einmal.' })).status).toBe(
      204
    );
    expect(
      (await answer({ verdict: 'good', remark: 'good', marks: [{ aya: 2, word: 2 }] }))
        .status
    ).toBe(204);
    const { entries } = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/arda-log`)
    );
    expect(entries).toEqual([
      expect.objectContaining({
        studentId: ID.member,
        studentName: 'Maryam',
        range: { sura: 112, from: 1, to: 4 },
        recitedOn: '2026-10-06',
        verdict: 'good',
        remark: 'good',
        note: null,
        marks: [{ aya: 2, word: 2, topic: null }],
        source: 'recording',
        recordingId: id,
        writtenByName: 'Sheikh Ahmad',
      }),
    ]);
    expect((await call('member', 'DELETE', `/recordings/${id}`)).status).toBe(204);
    const after = await json(await call('owner', 'GET', `/halaqat/${halaqaId}/arda-log`));
    expect(after.entries).toEqual([
      expect.objectContaining({
        verdict: 'good',
        source: 'recording',
        recordingId: null,
      }),
    ]);
  });

  it("reads a recording's day on the student's calendar", () => {
    // 23:30 in Berlin is still the 9th there, the 10th in Tokyo.
    const at = new Date('2026-10-09T21:30:00Z');
    expect(dayIn(at, null)).toBe('2026-10-09');
    expect(dayIn(at, 'Asia/Tokyo')).toBe('2026-10-10');
    expect(dayIn(at, 'Not/AZone')).toBe('2026-10-09');
  });
});

describe('the sheikh writes the log (T4)', () => {
  it('sums up per student and sūra, lists one student, and the student sees only their own', async () => {
    const { call, write, halaqaId } = await setup();
    await write({ recitedOn: '2026-10-01', verdict: 'again', note: '  Madd zu kurz. ' });
    await write({ recitedOn: '2026-10-08', verdict: 'good', remark: 'good' });
    await write({ range: { sura: 113, from: 1, to: 5 }, recitedOn: '2026-10-09' });
    await write({ studentId: ID.classmate, verdict: 'again' });

    const { summary } = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/arda-log/summary`)
    );
    expect(summary).toEqual(
      expect.arrayContaining([
        {
          studentId: ID.member,
          studentName: 'Maryam',
          sura: 112,
          times: 2,
          lastOn: '2026-10-08',
          lastVerdict: 'good',
        },
        expect.objectContaining({ studentId: ID.member, sura: 113, times: 1 }),
        expect.objectContaining({
          studentId: ID.classmate,
          sura: 112,
          lastVerdict: 'again',
        }),
      ])
    );
    expect(summary).toHaveLength(3);

    const maryam = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/arda-log?student=${ID.member}`)
    );
    expect(maryam.entries.map((e: Json) => e.recitedOn)).toEqual([
      '2026-10-09',
      '2026-10-08',
      '2026-10-01',
    ]);
    expect(maryam.entries[2]).toMatchObject({
      source: 'in_person',
      note: 'Madd zu kurz.',
      marks: [],
    });

    const mine = await json(await call('member', 'GET', '/arda-log/summary'));
    expect(mine.summary).toEqual([
      {
        halaqaId,
        halaqaName: 'Juzʾ ʿAmma',
        sura: 112,
        times: 2,
        lastOn: '2026-10-08',
        lastVerdict: 'good',
      },
      expect.objectContaining({ sura: 113 }),
    ]);
    const yusuf = await json(await call('classmate', 'GET', '/arda-log/summary'));
    expect(yusuf.summary).toEqual([expect.objectContaining({ sura: 112, times: 1 })]);
  });

  it('pages the entries', async () => {
    const { call, write, halaqaId } = await setup();
    for (let i = 0; i <= PAGE_SIZE; i++) await write();
    const first = await json(await call('owner', 'GET', `/halaqat/${halaqaId}/arda-log`));
    expect(first.entries).toHaveLength(PAGE_SIZE);
    expect(first.more).toBe(true);
    const rest = await json(
      await call(
        'owner',
        'GET',
        `/halaqat/${halaqaId}/arda-log?before=${first.entries.at(-1).id}`
      )
    );
    expect(rest).toMatchObject({ more: false });
    expect(rest.entries).toHaveLength(1);
    expect(
      (await call('owner', 'GET', `/halaqat/${halaqaId}/arda-log?before=nope`)).status
    ).toBe(400);
  });

  it('refuses what is no recitation of a student of this ḥalaqa', async () => {
    const { call, halaqaId } = await setup();
    const post = (body: unknown) =>
      call('owner', 'POST', `/halaqat/${halaqaId}/arda-log`, body);
    for (const [body, issue] of [
      [entry({ range: { sura: 112, from: 1, to: 5 } }), 'range'],
      [entry({ range: { sura: 115, from: 1, to: 1 } }), 'range'],
      [entry({ recitedOn: '2026-10-12' }), 'recitedOn'],
      [entry({ recitedOn: '1999-12-31' }), 'recitedOn'],
      [entry({ recitedOn: '2026-02-30' }), 'recitedOn'],
      [entry({ verdict: 'perfect' }), 'verdict'],
      [entry({ remark: 'nice' }), 'remark'],
      [entry({ note: 'x'.repeat(1001) }), 'note'],
      [entry({ studentId: ID.pending }), 'studentId'],
      [entry({ studentId: ID.outsider }), 'studentId'],
      [entry({ studentId: ID.owner }), 'studentId'],
      [entry({ marks: [] }), 'body'],
    ] as const) {
      const response = await post(body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect((await json(response)).issues).toContain(issue);
    }
    // Tomorrow is still today somewhere.
    expect((await post(entry({ recitedOn: '2026-10-11' }))).status).toBe(201);
  });

  it('keeps to a limit of hand entries per student', async () => {
    const { call, log, halaqaId } = await setup();
    for (let i = 0; i < MAX_HAND_ENTRIES_PER_STUDENT; i++) {
      await log.add(
        {
          ...entry(),
          halaqaId,
          verdict: 'good',
          remark: null,
          note: null,
          writtenBy: ID.owner,
        },
        MAX_HAND_ENTRIES_PER_STUDENT
      );
    }
    const over = await call('owner', 'POST', `/halaqat/${halaqaId}/arda-log`, entry());
    expect(over.status).toBe(409);
    expect(await json(over)).toEqual({ error: 'too_many_entries' });
  });

  it("removes only this ḥalaqa's entries, and a student's go when they leave", async () => {
    const { call, write, halaqat, halaqaId } = await setup();
    const kept = await write({ studentId: ID.classmate });
    const gone = await write();
    const other = await halaqat.create({
      name: 'Andere',
      oneToOne: true,
      teacherId: ID.owner,
    });
    expect(
      (await call('owner', 'DELETE', `/halaqat/${other}/arda-log/${gone}`)).status
    ).toBe(404);
    expect(
      (await call('owner', 'DELETE', `/halaqat/${halaqaId}/arda-log/${gone}`)).status
    ).toBe(204);
    expect(
      (await call('owner', 'DELETE', `/halaqat/${halaqaId}/arda-log/${gone}`)).status
    ).toBe(404);
    await halaqat.leave(halaqaId, ID.classmate);
    const { entries } = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/arda-log`)
    );
    expect(entries.map((e: Json) => e.id)).not.toContain(kept);
    expect(
      (await json(await call('owner', 'GET', `/halaqat/${halaqaId}/arda-log/summary`)))
        .summary
    ).toEqual([]);
  });
});
