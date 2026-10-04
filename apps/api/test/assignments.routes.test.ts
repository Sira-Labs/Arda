import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { NewAssignment } from '../src/assignments/repository.js';
import { MAX_ASSIGNMENTS_PER_HALAQA, PAGE_SIZE } from '../src/assignments/routes.js';
import type { Actor } from '../src/authz/policies.js';
import { MemoryAssignmentRepository } from './memoryAssignmentRepository.js';
import { MemoryHalaqaRepository } from './memoryHalaqaRepository.js';

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
// Response bodies are checked field by field below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const json = async (response: Response): Promise<Json> => response.json();

const TODAY = '2026-10-03';
const READ_FATIHA = {
  kind: 'read',
  range: { sura: 1, from: 1, to: 7 },
  repetitions: 3,
  dueOn: '2026-10-09',
};

/**
 * A ḥalaqa taught by `owner` with two active students (`member`, `classmate`) and a pending
 * one, plus one assignment for all its students.
 */
async function setup() {
  const halaqat = new MemoryHalaqaRepository(NAMES);
  const repo = new MemoryAssignmentRepository(halaqat, NAMES);
  const halaqaId = await halaqat.create({
    name: 'Juzʾ ʿAmma',
    oneToOne: false,
    teacherId: ID.owner,
  });
  halaqat.addMember(halaqaId, ID.member, { role: 'student', status: 'active' });
  halaqat.addMember(halaqaId, ID.classmate, { role: 'student', status: 'active' });
  halaqat.addMember(halaqaId, ID.pending, { role: 'student', status: 'pending' });
  const give = (input: Partial<NewAssignment> = {}) =>
    repo.create({
      halaqaId,
      studentId: null,
      kind: 'recite',
      range: { sura: 112, from: 1, to: 4 },
      focusRule: null,
      repetitions: null,
      note: null,
      dueOn: '2026-10-05',
      createdBy: ID.owner,
      ...input,
    }) as Promise<string>;
  const assignmentId = await give();
  const app = createApp({
    version: 't',
    expectedRevision: null,
    health: { schemaRevision: async () => null },
    assignments: {
      repo,
      halaqat,
      auth: { actor: async (h) => ACTORS[h.get('x-test-actor') ?? ''] ?? null },
      log: quiet,
      now: () => new Date(`${TODAY}T12:00:00Z`),
    },
  });
  const call = (actor: string, method: string, path: string, body?: unknown) =>
    app.request(`/api/v1${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-test-actor': actor },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { halaqat, repo, halaqaId, assignmentId, give, call };
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
 * Route × role (threat T14): every route against every kind of caller, each on a fresh ḥalaqa.
 * Written out by hand, so widening access is always a visible change.
 */
const MATRIX: {
  route: string;
  method: string;
  path: (halaqaId: string, assignmentId: string) => string;
  body?: unknown;
  expect: Record<(typeof WHO)[number], number>;
}[] = [
  {
    route: 'what I still have to do',
    method: 'GET',
    path: () => '/assignments',
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
  {
    route: "the ḥalaqa's assignments",
    method: 'GET',
    path: (h) => `/halaqat/${h}/assignments`,
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 200,
      owner: 200,
      otherTeacher: 403,
      admin: 200,
    },
  },
  {
    route: 'give one',
    method: 'POST',
    path: (h) => `/halaqat/${h}/assignments`,
    body: READ_FATIHA,
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
    route: 'take it back',
    method: 'DELETE',
    path: (h, a) => `/halaqat/${h}/assignments/${a}`,
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
    route: 'mark it done',
    method: 'PUT',
    path: (h, a) => `/halaqat/${h}/assignments/${a}/done`,
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 204,
      owner: 403,
      otherTeacher: 403,
      admin: 403,
    },
  },
  {
    route: 'take the mark back',
    method: 'DELETE',
    path: (h, a) => `/halaqat/${h}/assignments/${a}/done`,
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 204,
      owner: 403,
      otherTeacher: 403,
      admin: 403,
    },
  },
];

describe('assignment routes × roles (T14)', () => {
  for (const row of MATRIX) {
    for (const who of WHO) {
      it(`${row.method} ${row.route} as ${who || 'anonymous'} → ${row.expect[who]}`, async () => {
        const { halaqaId, assignmentId, call } = await setup();
        const response = await call(
          who,
          row.method,
          row.path(halaqaId, assignmentId),
          row.body
        );
        expect(response.status).toBe(row.expect[who]);
      });
    }
  }
});

describe('giving and doing assignments (T2)', () => {
  it('reaches every student; done goes back to the teacher', async () => {
    const { halaqaId, call } = await setup();
    const created = await call('owner', 'POST', `/halaqat/${halaqaId}/assignments`, {
      ...READ_FATIHA,
      focusRule: 'ikhfa',
      note: '  Achte auf die Ghunna.  ',
    });
    expect(created.status).toBe(201);
    const { id } = await json(created);

    const open = await json(await call('member', 'GET', '/assignments'));
    // Soonest due first: the recitation due on the 5th, then al-Fātiḥa on the 9th.
    expect(open.assignments.map((a: Json) => a.dueOn)).toEqual([
      '2026-10-05',
      '2026-10-09',
    ]);
    expect(open.assignments[1]).toMatchObject({
      id,
      kind: 'read',
      range: { sura: 1, from: 1, to: 7 },
      repetitions: 3,
      focusRule: 'ikhfa',
      note: 'Achte auf die Ghunna.',
      halaqaId,
      halaqaName: 'Juzʾ ʿAmma',
      fromName: 'Sheikh Ahmad',
      doneAt: null,
      studentId: null,
    });

    expect(
      (await call('member', 'PUT', `/halaqat/${halaqaId}/assignments/${id}/done`)).status
    ).toBe(204);
    // Twice is the same as once.
    expect(
      (await call('member', 'PUT', `/halaqat/${halaqaId}/assignments/${id}/done`)).status
    ).toBe(204);
    const after = await json(await call('member', 'GET', '/assignments'));
    expect(after.assignments.map((a: Json) => a.id)).not.toContain(id);

    const teacher = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/assignments`)
    );
    expect(teacher.role).toBe('teacher');
    const given = teacher.assignments.find((a: Json) => a.id === id);
    expect(given.targets).toBe(2);
    expect(given.done).toEqual([
      expect.objectContaining({ userId: ID.member, name: 'Maryam' }),
    ]);

    const mine = await json(
      await call('member', 'GET', `/halaqat/${halaqaId}/assignments`)
    );
    expect(mine.role).toBe('student');
    expect(mine.assignments.find((a: Json) => a.id === id).doneAt).toEqual(
      expect.any(String)
    );

    expect(
      (await call('member', 'DELETE', `/halaqat/${halaqaId}/assignments/${id}/done`))
        .status
    ).toBe(204);
    const again = await json(await call('member', 'GET', '/assignments'));
    expect(again.assignments.map((a: Json) => a.id)).toContain(id);
  });

  it('keeps an assignment for one student from the others', async () => {
    const { halaqaId, call } = await setup();
    const { id } = await json(
      await call('owner', 'POST', `/halaqat/${halaqaId}/assignments`, {
        ...READ_FATIHA,
        studentId: ID.member,
      })
    );
    const forMember = await json(await call('member', 'GET', '/assignments'));
    expect(forMember.assignments.map((a: Json) => a.id)).toContain(id);
    const forClassmate = await json(await call('classmate', 'GET', '/assignments'));
    expect(forClassmate.assignments.map((a: Json) => a.id)).not.toContain(id);
    const list = await json(
      await call('classmate', 'GET', `/halaqat/${halaqaId}/assignments`)
    );
    expect(list.assignments.map((a: Json) => a.id)).not.toContain(id);
    expect(
      (await call('classmate', 'PUT', `/halaqat/${halaqaId}/assignments/${id}/done`))
        .status
    ).toBe(404);

    const teacher = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/assignments`)
    );
    expect(teacher.assignments.find((a: Json) => a.id === id)).toMatchObject({
      studentId: ID.member,
      studentName: 'Maryam',
      targets: 1,
    });
  });

  it('can start and end at a word (S3.2)', async () => {
    const { halaqaId, call } = await setup();
    const words = { sura: 113, from: 2, to: 3, words: { from: 2, to: 4 } };
    const created = await call('owner', 'POST', `/halaqat/${halaqaId}/assignments`, {
      ...READ_FATIHA,
      range: words,
    });
    expect(created.status).toBe(201);
    const open = await json(await call('member', 'GET', '/assignments'));
    expect(open.assignments.find((a: Json) => a.range?.words)?.range).toEqual(words);
    for (const range of [
      // Backwards inside one āya, a word 0, more words than any āya has, an unknown key.
      { sura: 113, from: 2, to: 2, words: { from: 3, to: 2 } },
      { sura: 113, from: 2, to: 3, words: { from: 0, to: 2 } },
      { sura: 113, from: 2, to: 3, words: { from: 1, to: 129 } },
      { sura: 113, from: 2, to: 3, words: { from: 1, to: 2, key: 'x' } },
    ]) {
      const response = await call('owner', 'POST', `/halaqat/${halaqaId}/assignments`, {
        ...READ_FATIHA,
        range,
      });
      expect(response.status, JSON.stringify(range)).toBe(400);
    }
  });

  it('gives only to active students of the ḥalaqa', async () => {
    const { halaqaId, call } = await setup();
    for (const studentId of [ID.pending, ID.outsider, ID.owner]) {
      const response = await call('owner', 'POST', `/halaqat/${halaqaId}/assignments`, {
        ...READ_FATIHA,
        studentId,
      });
      expect(response.status, studentId).toBe(400);
      expect((await json(response)).issues).toEqual(['studentId']);
    }
  });

  it('checks what is given', async () => {
    const { halaqaId, call } = await setup();
    const cases: [unknown, string][] = [
      [{ kind: 'read', dueOn: '2026-10-09' }, 'range'],
      [{ ...READ_FATIHA, range: { sura: 1, from: 1, to: 8 } }, 'range'],
      [{ ...READ_FATIHA, range: { sura: 115, from: 1, to: 1 } }, 'range'],
      [{ ...READ_FATIHA, range: { sura: 2, from: 5, to: 4 } }, 'range'],
      [{ kind: 'learn', dueOn: '2026-10-09' }, 'focusRule'],
      [{ kind: 'practise', focusRule: 'madd', dueOn: '2026-10-09' }, 'focusRule'],
      [{ ...READ_FATIHA, kind: 'recite' }, 'repetitions'],
      [{ ...READ_FATIHA, repetitions: 21 }, 'repetitions'],
      [{ ...READ_FATIHA, dueOn: '2026-02-30' }, 'dueOn'],
      [{ ...READ_FATIHA, dueOn: '9.10.2026' }, 'dueOn'],
      // A day back is allowed (time zones behind UTC), two are not; nor more than a year ahead.
      [{ ...READ_FATIHA, dueOn: '2026-10-01' }, 'dueOn'],
      [{ ...READ_FATIHA, dueOn: '2027-10-05' }, 'dueOn'],
      [{ ...READ_FATIHA, note: 'x'.repeat(501) }, 'note'],
      [{ ...READ_FATIHA, halaqaId: 'x' }, 'unknown'],
      [{ ...READ_FATIHA, kind: 'voice' }, 'kind'],
    ];
    for (const [body, field] of cases) {
      const response = await call(
        'owner',
        'POST',
        `/halaqat/${halaqaId}/assignments`,
        body
      );
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect((await json(response)).error, field).toBe('invalid_body');
    }
    const yesterday = await call('owner', 'POST', `/halaqat/${halaqaId}/assignments`, {
      ...READ_FATIHA,
      dueOn: '2026-10-02',
    });
    expect(yesterday.status).toBe(201);
    const practise = await call('owner', 'POST', `/halaqat/${halaqaId}/assignments`, {
      kind: 'practise',
      focusRule: 'iqlab',
      note: '   ',
      dueOn: TODAY,
    });
    expect(practise.status).toBe(201);
    const open = await json(await call('member', 'GET', '/assignments'));
    expect(open.assignments.find((a: Json) => a.kind === 'practise')).toMatchObject({
      range: null,
      note: null,
      focusRule: 'iqlab',
    });
  });

  it('keeps each ḥalaqa to its own assignments', async () => {
    const { halaqat, halaqaId, assignmentId, call } = await setup();
    const otherId = await halaqat.create({
      name: 'Andere',
      oneToOne: false,
      teacherId: ID.otherTeacher,
    });
    halaqat.addMember(otherId, ID.member, { role: 'student', status: 'active' });
    // The other teacher names his own ḥalaqa in the path, and someone else's assignment.
    expect(
      (
        await call(
          'otherTeacher',
          'DELETE',
          `/halaqat/${otherId}/assignments/${assignmentId}`
        )
      ).status
    ).toBe(404);
    expect(
      (
        await call(
          'member',
          'PUT',
          `/halaqat/${otherId}/assignments/${assignmentId}/done`
        )
      ).status
    ).toBe(404);
    const teacher = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/assignments`)
    );
    expect(teacher.assignments).toHaveLength(1);
    expect(teacher.assignments[0].done).toEqual([]);
  });

  it('takes an assignment back from everyone', async () => {
    const { halaqaId, assignmentId, call } = await setup();
    expect(
      (await call('owner', 'DELETE', `/halaqat/${halaqaId}/assignments/${assignmentId}`))
        .status
    ).toBe(204);
    expect(
      (await call('owner', 'DELETE', `/halaqat/${halaqaId}/assignments/${assignmentId}`))
        .status
    ).toBe(404);
    expect((await json(await call('member', 'GET', '/assignments'))).assignments).toEqual(
      []
    );
  });

  it("forgets a student's own assignments when they leave", async () => {
    const { halaqat, halaqaId, call } = await setup();
    await call('owner', 'POST', `/halaqat/${halaqaId}/assignments`, {
      ...READ_FATIHA,
      studentId: ID.member,
    });
    await halaqat.leave(halaqaId, ID.member);
    const teacher = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/assignments`)
    );
    expect(teacher.assignments.map((a: Json) => a.studentId)).toEqual([null]);
    expect((await json(await call('member', 'GET', '/assignments'))).assignments).toEqual(
      []
    );
  });

  it('pages through a long list, latest due day first', async () => {
    const { halaqaId, give, call } = await setup();
    for (let day = 1; day <= PAGE_SIZE + 4; day++) {
      await give({ dueOn: `2026-11-${String((day % 28) + 1).padStart(2, '0')}` });
    }
    const first = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/assignments`)
    );
    expect(first.assignments).toHaveLength(PAGE_SIZE);
    expect(first.more).toBe(true);
    const days = first.assignments.map((a: Json) => a.dueOn);
    expect(days).toEqual([...days].sort().reverse());
    const last = first.assignments.at(-1).id;
    const second = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/assignments?before=${last}`)
    );
    expect(second.assignments).toHaveLength(5);
    expect(second.more).toBe(false);
    const all = [...first.assignments, ...second.assignments].map((a: Json) => a.id);
    expect(new Set(all).size).toBe(PAGE_SIZE + 5);
    expect(
      (await call('owner', 'GET', `/halaqat/${halaqaId}/assignments?before=nope`)).status
    ).toBe(400);
  });

  it('stops a runaway script', async () => {
    const { repo, halaqaId, call } = await setup();
    const template = repo.rows[0]!;
    while (repo.rows.length < MAX_ASSIGNMENTS_PER_HALAQA) {
      repo.rows.push({ ...template, id: crypto.randomUUID() });
    }
    const response = await call(
      'owner',
      'POST',
      `/halaqat/${halaqaId}/assignments`,
      READ_FATIHA
    );
    expect(response.status).toBe(409);
    expect(await json(response)).toEqual({ error: 'too_many_assignments' });
  });

  it('is never cached, and leaves the headers of other routes alone', async () => {
    const { halaqaId, assignmentId, call } = await setup();
    for (const [method, path] of [
      ['GET', '/assignments'],
      ['GET', `/halaqat/${halaqaId}/assignments`],
      ['PUT', `/halaqat/${halaqaId}/assignments/${assignmentId}/done`],
    ] as const) {
      const response = await call('member', method, path);
      expect(response.headers.get('cache-control'), path).toBe('no-store');
    }
    const elsewhere = await call('member', 'GET', '/somewhere-else');
    expect(elsewhere.status).toBe(404);
    expect(elsewhere.headers.get('cache-control')).toBeNull();
  });

  it('lives next to the ḥalaqa routes without either shadowing the other', async () => {
    const { halaqat, repo, halaqaId } = await setup();
    const auth = {
      actor: async (h: Headers) => ACTORS[h.get('x-test-actor') ?? ''] ?? null,
    };
    const app = createApp({
      version: 't',
      expectedRevision: null,
      health: { schemaRevision: async () => null },
      halaqat: { repo: halaqat, auth, log: quiet },
      assignments: { repo, halaqat, auth, log: quiet },
    });
    const get = (path: string) =>
      app.request(`/api/v1${path}`, { headers: { 'x-test-actor': 'member' } });
    expect((await get(`/halaqat/${halaqaId}`)).status).toBe(200);
    const list = await get(`/halaqat/${halaqaId}/assignments`);
    expect(list.status).toBe(200);
    expect((await json(list)).role).toBe('student');
    expect((await get('/halaqat')).status).toBe(200);
    expect((await get('/assignments')).status).toBe(200);
  });
});
