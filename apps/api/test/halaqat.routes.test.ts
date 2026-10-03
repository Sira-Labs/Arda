import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Actor } from '../src/authz/policies.js';
import {
  INVITE_TTL_MS,
  hashInviteToken,
  isInviteToken,
  newInviteToken,
} from '../src/halaqat/invites.js';
import { MAX_HALAQAT_PER_TEACHER } from '../src/halaqat/routes.js';
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
type Json = any;
const json = async (response: Response): Promise<Json> => response.json();

/** A ḥalaqa taught by `owner`, with one active and one pending student. */
async function setup(at = new Date('2026-10-03T12:00:00Z')) {
  const repo = new MemoryHalaqaRepository({ [ID.owner]: 'Sheikh Ahmad' });
  const halaqaId = await repo.create({
    name: 'Juzʾ ʿAmma',
    oneToOne: false,
    teacherId: ID.owner,
  });
  repo.addMember(halaqaId, ID.member, { role: 'student', status: 'active' });
  repo.addMember(halaqaId, ID.pending, { role: 'student', status: 'pending' });
  let now = at;
  const app = createApp({
    version: 't',
    expectedRevision: null,
    health: { schemaRevision: async () => null },
    halaqat: {
      repo,
      auth: { actor: async (h) => ACTORS[h.get('x-test-actor') ?? ''] ?? null },
      log: quiet,
      now: () => now,
    },
  });
  const call = (actor: string, method: string, path: string, body?: unknown) =>
    app.request(`/api/v1/halaqat${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-test-actor': actor },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return {
    repo,
    halaqaId,
    call,
    advance: (ms: number) => (now = new Date(now.getTime() + ms)),
  };
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
  path: (id: string) => string;
  body?: unknown;
  expect: Record<(typeof WHO)[number], number>;
}[] = [
  {
    route: 'list mine',
    method: 'GET',
    path: () => '',
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
    route: 'open one',
    method: 'POST',
    path: () => '',
    body: { name: 'Neue Ḥalaqa' },
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 403,
      owner: 201,
      otherTeacher: 201,
      admin: 201,
    },
  },
  {
    route: 'read',
    method: 'GET',
    path: (id) => `/${id}`,
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
    route: 'new invite',
    method: 'POST',
    path: (id) => `/${id}/invites`,
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
    route: 'revoke invites',
    method: 'DELETE',
    path: (id) => `/${id}/invites`,
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
    route: 'approve',
    method: 'POST',
    path: (id) => `/${id}/members/${ID.pending}/approve`,
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
    route: 'remove',
    method: 'DELETE',
    path: (id) => `/${id}/members/${ID.member}`,
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
    route: 'leave',
    method: 'DELETE',
    path: (id) => `/${id}/membership`,
    expect: {
      '': 401,
      outsider: 404,
      pending: 204,
      member: 204,
      owner: 404,
      otherTeacher: 404,
      admin: 404,
    },
  },
];

describe('ḥalaqa routes × roles (T14)', () => {
  for (const row of MATRIX) {
    for (const who of WHO) {
      it(`${row.route}: ${who || 'anonymous'} → ${row.expect[who]}`, async () => {
        const { call, halaqaId } = await setup();
        const response = await call(who, row.method, row.path(halaqaId), row.body);
        expect(response.status).toBe(row.expect[who]);
      });
    }
  }
});

describe('invites and joining (T1)', () => {
  it('make 192-bit tokens and store only their hash', () => {
    const token = newInviteToken();
    expect(isInviteToken(token)).toBe(true);
    expect(Buffer.from(token, 'base64url')).toHaveLength(24);
    expect(hashInviteToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).not.toContain(token);
  });

  it('lead a student from the link to the ḥalaqa, pending until the teacher approves', async () => {
    const { call, halaqaId, repo } = await setup();
    const created = await call('owner', 'POST', `/${halaqaId}/invites`);
    const { token, expiresAt } = await json(created);
    expect(repo.invites[0]!.tokenHash).toBe(hashInviteToken(token));
    expect(JSON.stringify(repo.invites)).not.toContain(token);
    expect(new Date(expiresAt).getTime() - Date.parse('2026-10-03T12:00:00Z')).toBe(
      INVITE_TTL_MS
    );

    const preview = await call('outsider', 'POST', '/invites/preview', { token });
    expect(await json(preview)).toEqual({
      halaqa: {
        halaqaId,
        name: 'Juzʾ ʿAmma',
        oneToOne: false,
        teacherName: 'Sheikh Ahmad',
      },
    });

    const joined = await call('outsider', 'POST', '/join', { token });
    expect(await json(joined)).toEqual({
      halaqa: { id: halaqaId, name: 'Juzʾ ʿAmma' },
      status: 'pending',
    });
    // Pending: listed as such, but the ḥalaqa itself stays closed.
    const mine = await json(await call('outsider', 'GET', ''));
    expect(mine.halaqat).toMatchObject([
      { id: halaqaId, status: 'pending', pending: null },
    ]);
    expect((await call('outsider', 'GET', `/${halaqaId}`)).status).toBe(403);

    expect(
      (await call('owner', 'POST', `/${halaqaId}/members/${ID.outsider}/approve`)).status
    ).toBe(204);
    const read = await json(await call('outsider', 'GET', `/${halaqaId}`));
    expect(read).toEqual({
      halaqa: expect.objectContaining({ id: halaqaId }),
      role: 'student',
    });
    expect(repo.audit.map((a) => a.action)).toEqual([
      'halaqa.invite_created',
      'halaqa.member_approved',
    ]);
  });

  it('shows the teacher the members, who waits and whether a link is out; never to students', async () => {
    const { call, halaqaId } = await setup();
    await call('owner', 'POST', `/${halaqaId}/invites`);
    const teacher = await json(await call('owner', 'GET', `/${halaqaId}`));
    expect(teacher.role).toBe('teacher');
    expect(
      teacher.members.map((m: { userId: string; status: string }) => [m.userId, m.status])
    ).toEqual(
      expect.arrayContaining([
        [ID.member, 'active'],
        [ID.pending, 'pending'],
      ])
    );
    expect(teacher.invite).toMatchObject({ expiresAt: expect.any(String) });
    const student = await json(await call('member', 'GET', `/${halaqaId}`));
    expect(student).not.toHaveProperty('members');
    expect(student).not.toHaveProperty('invite');
  });

  it('refuse an expired, revoked, replaced or malformed link alike', async () => {
    const { call, halaqaId, advance } = await setup();
    const first = (await json(await call('owner', 'POST', `/${halaqaId}/invites`))).token;
    const second = (await json(await call('owner', 'POST', `/${halaqaId}/invites`)))
      .token;
    expect((await call('outsider', 'POST', '/join', { token: first })).status).toBe(404);
    expect(
      (await call('outsider', 'POST', '/invites/preview', { token: 'short' })).status
    ).toBe(404);
    expect((await call('outsider', 'POST', '/join', {})).status).toBe(404);
    advance(INVITE_TTL_MS + 1);
    const expired = await call('outsider', 'POST', '/join', { token: second });
    expect(expired.status).toBe(404);
    expect(await json(expired)).toEqual({ error: 'invite_invalid' });

    const third = (await json(await call('owner', 'POST', `/${halaqaId}/invites`))).token;
    expect((await call('owner', 'DELETE', `/${halaqaId}/invites`)).status).toBe(204);
    expect((await call('outsider', 'POST', '/join', { token: third })).status).toBe(404);
  });

  it('take a single student into a one-to-one ḥalaqa', async () => {
    const { call } = await setup();
    const { id } = await json(
      await call('owner', 'POST', '', { name: 'Amina', oneToOne: true })
    );
    const { token } = await json(await call('owner', 'POST', `/${id}/invites`));
    expect((await call('outsider', 'POST', '/join', { token })).status).toBe(200);
    const second = await call('member', 'POST', '/join', { token });
    expect(second.status).toBe(409);
    expect(await json(second)).toEqual({ error: 'halaqa_full' });
  });

  it('let joining twice answer the current status instead of failing', async () => {
    const { call, halaqaId } = await setup();
    const { token } = await json(await call('owner', 'POST', `/${halaqaId}/invites`));
    expect(await json(await call('member', 'POST', '/join', { token }))).toMatchObject({
      status: 'active',
    });
    expect(await json(await call('owner', 'POST', '/join', { token }))).toMatchObject({
      status: 'active',
    });
  });

  it('never remove the teacher, and limit how many ḥalaqāt one teacher opens', async () => {
    const { call, halaqaId, repo } = await setup();
    expect(
      (await call('owner', 'DELETE', `/${halaqaId}/members/${ID.owner}`)).status
    ).toBe(404);
    expect(
      (await call('owner', 'POST', `/${halaqaId}/members/${ID.member}/approve`)).status
    ).toBe(404);
    for (let i = await repo.countCreatedBy(ID.owner); i < MAX_HALAQAT_PER_TEACHER; i++) {
      await repo.create({ name: `H${i}`, oneToOne: false, teacherId: ID.owner });
    }
    const refused = await call('owner', 'POST', '', { name: 'Eine zu viel' });
    expect(refused.status).toBe(409);
    expect(await json(refused)).toEqual({ error: 'too_many_halaqat' });
  });

  it('validate names and ids', async () => {
    const { call } = await setup();
    expect((await call('owner', 'POST', '', { name: '  ' })).status).toBe(400);
    expect((await call('owner', 'POST', '', { name: 'x'.repeat(81) })).status).toBe(400);
    expect((await call('owner', 'POST', '', { name: 'Ok', extra: 1 })).status).toBe(400);
    expect((await call('admin', 'GET', '/not-a-uuid')).status).toBe(404);
    expect((await call('admin', 'GET', `/${ID.member}`)).status).toBe(404);
  });
});
