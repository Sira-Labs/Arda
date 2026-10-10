import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Actor } from '../src/authz/policies.js';
import {
  MAX_BYTES,
  MAX_RECORDINGS_PER_STUDENT,
  MAX_VOICE_NOTE_BYTES,
  mimeOf,
  rangeOf,
} from '../src/recordings/routes.js';
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
// Response bodies are checked field by field below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const json = async (response: Response): Promise<Json> => response.json();

/** Ten bytes of "sound", enough to test ranges with. */
const SOUND = Buffer.from('0123456789');
/** The teacher's "voice". */
const VOICE = Buffer.from('sheikh says');
let takes = 0;
const clientId = () => `30000000-0000-4000-8000-${String(++takes).padStart(12, '0')}`;
const QUERY = (id = clientId(), extra = '') =>
  `?clientId=${id}&sura=112&from=1&to=4&durationMs=4000${extra}`;

/** A ḥalaqa taught by `owner` with two active students and a pending one. */
async function setup() {
  const halaqat = new MemoryHalaqaRepository(NAMES);
  const assignments = new MemoryAssignmentRepository(halaqat, NAMES);
  const repo = new MemoryRecordingRepository(halaqat, assignments, NAMES);
  const halaqaId = await halaqat.create({
    name: 'Juzʾ ʿAmma',
    oneToOne: false,
    teacherId: ID.owner,
  });
  halaqat.addMember(halaqaId, ID.member, { role: 'student', status: 'active' });
  halaqat.addMember(halaqaId, ID.classmate, { role: 'student', status: 'active' });
  halaqat.addMember(halaqaId, ID.pending, { role: 'student', status: 'pending' });
  const app = createApp({
    version: 't',
    expectedRevision: null,
    health: { schemaRevision: async () => null },
    recordings: {
      repo,
      halaqat,
      auth: { actor: async (h) => ACTORS[h.get('x-test-actor') ?? ''] ?? null },
      log: quiet,
    },
  });
  const call = (
    actor: string,
    method: string,
    path: string,
    init: { body?: Buffer | string | ReadableStream; type?: string; range?: string } = {}
  ) =>
    app.request(`/api/v1${path}`, {
      method,
      headers: {
        'x-test-actor': actor,
        ...(init.type ? { 'content-type': init.type } : {}),
        ...(init.range ? { range: init.range } : {}),
      },
      body: init.body,
      ...(init.body instanceof ReadableStream ? { duplex: 'half' } : {}),
    } as RequestInit);
  const send = (
    actor = 'member',
    query = QUERY(),
    body: Buffer | string | ReadableStream = SOUND,
    type = 'audio/webm;codecs=opus'
  ) => call(actor, 'POST', `/halaqat/${halaqaId}/recordings${query}`, { body, type });
  const sent = async (actor = 'member') => (await json(await send(actor))).id as string;
  /** `teacher` answers the recording, and with `aloud` records a voice note on it too. */
  const answer = async (recordingId: string, aloud = false, teacher = 'owner') => {
    const base = `/halaqat/${halaqaId}/recordings/${recordingId}`;
    expect(
      (
        await call(teacher, 'PUT', `${base}/review`, {
          body: JSON.stringify({ verdict: 'again' }),
          type: 'application/json',
        })
      ).status
    ).toBe(204);
    if (aloud) {
      const voiced = await call(teacher, 'PUT', `${base}/voice-note?durationMs=3000`, {
        body: VOICE,
        type: 'audio/ogg;codecs=opus',
      });
      expect(voiced.status).toBe(204);
    }
  };
  return { halaqat, assignments, repo, halaqaId, call, send, sent, answer };
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

/** What `owner` has said before a matrix row's call: answered it, or answered it aloud too. */
type Before = 'answered' | 'aloud';

/**
 * Route × role (threat T14): every route against every kind of caller, each on a fresh ḥalaqa
 * with one recording by `member`. Written out by hand, so widening access is a visible change.
 */
const MATRIX: {
  route: string;
  method: string;
  path: (halaqaId: string, recordingId: string) => string;
  send?: boolean;
  before?: Before;
  expect: Record<(typeof WHO)[number], number>;
}[] = [
  {
    route: 'send a take',
    method: 'POST',
    path: (h) => `/halaqat/${h}/recordings${QUERY()}`,
    send: true,
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 201,
      owner: 403,
      otherTeacher: 403,
      admin: 403,
    },
  },
  {
    route: "the teacher's queue",
    method: 'GET',
    path: (h) => `/halaqat/${h}/recordings`,
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
    route: 'hear it as the teacher',
    method: 'GET',
    path: (h, r) => `/halaqat/${h}/recordings/${r}/audio`,
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
    route: 'answer it',
    method: 'PUT',
    path: (h, r) => `/halaqat/${h}/recordings/${r}/review`,
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
    // The admin passes the policy, but a voice note goes only with one's own answer.
    route: 'answer it aloud',
    method: 'PUT',
    path: (h, r) => `/halaqat/${h}/recordings/${r}/voice-note?durationMs=3000`,
    send: true,
    before: 'answered',
    expect: {
      '': 401,
      outsider: 403,
      pending: 403,
      member: 403,
      owner: 204,
      otherTeacher: 403,
      admin: 409,
    },
  },
  {
    route: 'hear the answer as the teacher',
    method: 'GET',
    path: (h, r) => `/halaqat/${h}/recordings/${r}/voice-note`,
    before: 'aloud',
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
    route: 'take the voice note back',
    method: 'DELETE',
    path: (h, r) => `/halaqat/${h}/recordings/${r}/voice-note`,
    before: 'aloud',
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
    route: 'my recordings',
    method: 'GET',
    path: () => '/recordings',
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
    route: 'hear my own',
    method: 'GET',
    path: (_h, r) => `/recordings/${r}/audio`,
    expect: {
      '': 401,
      outsider: 404,
      pending: 404,
      member: 200,
      owner: 404,
      otherTeacher: 404,
      admin: 404,
    },
  },
  {
    route: "hear my teacher's answer",
    method: 'GET',
    path: (_h, r) => `/recordings/${r}/voice-note`,
    before: 'aloud',
    expect: {
      '': 401,
      outsider: 404,
      pending: 404,
      member: 200,
      owner: 404,
      otherTeacher: 404,
      admin: 404,
    },
  },
  {
    route: 'delete my own',
    method: 'DELETE',
    path: (_h, r) => `/recordings/${r}`,
    expect: {
      '': 401,
      outsider: 404,
      pending: 404,
      member: 204,
      owner: 404,
      otherTeacher: 404,
      admin: 404,
    },
  },
];

describe('recordings: who may do what', () => {
  for (const row of MATRIX) {
    for (const who of WHO) {
      it(`${row.route} as ${who || 'nobody'} → ${row.expect[who]}`, async () => {
        const { call, sent, halaqaId, answer } = await setup();
        const recordingId = await sent();
        if (row.before) await answer(recordingId, row.before === 'aloud');
        const response = await call(who, row.method, row.path(halaqaId, recordingId), {
          ...(row.send ? { body: SOUND, type: 'audio/webm' } : {}),
          ...(row.method === 'PUT' && !row.send
            ? { body: JSON.stringify({ verdict: 'good' }), type: 'application/json' }
            : {}),
        });
        expect(response.status).toBe(row.expect[who]);
      });
    }
  }
});

describe('sending a take (F7)', () => {
  it('stores it once, however often the outbox retries it', async () => {
    const { send, repo } = await setup();
    const id = clientId();
    const first = await send('member', QUERY(id));
    expect(first.status).toBe(201);
    const again = await send('member', QUERY(id));
    expect(again.status).toBe(200);
    expect((await json(again)).id).toBe((await json(first)).id);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ mime: 'audio/webm', durationMs: 4000 });
  });

  it('refuses what is not a recording of āyāt of the muṣḥaf', async () => {
    const { send } = await setup();
    expect((await send('member', QUERY(clientId()).replace('to=4', 'to=9'))).status).toBe(
      400
    );
    expect((await send('member', `${QUERY()}&extra=1`)).status).toBe(400);
    expect((await send('member', QUERY(), SOUND, 'video/mp4')).status).toBe(415);
    expect((await send('member', QUERY(), Buffer.alloc(0))).status).toBe(400);
    expect((await send('member', QUERY(), Buffer.alloc(MAX_BYTES + 1))).status).toBe(413);
  });

  it('stops reading a streamed body without a length once it passes the limit', async () => {
    const { send, repo } = await setup();
    const chunk = new Uint8Array(1_000_000);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent > MAX_BYTES) controller.close();
        else {
          sent += chunk.length;
          controller.enqueue(chunk);
        }
      },
    });
    expect((await send('member', QUERY(), stream)).status).toBe(413);
    expect(repo.rows).toHaveLength(0);
  });

  it('answers an assignment only of this student in this ḥalaqa', async () => {
    const { send, assignments, halaqaId } = await setup();
    const forClassmate = (await assignments.create({
      halaqaId,
      studentId: ID.classmate,
      kind: 'recite',
      range: { sura: 112, from: 1, to: 4 },
      pages: null,
      focusRule: null,
      repetitions: null,
      note: null,
      dueOn: '2026-10-09',
      createdBy: ID.owner,
    }))!;
    const forAll = (await assignments.create({
      halaqaId,
      studentId: null,
      kind: 'recite',
      range: { sura: 112, from: 1, to: 4 },
      pages: null,
      focusRule: null,
      repetitions: null,
      note: null,
      dueOn: '2026-10-09',
      createdBy: ID.owner,
    }))!;
    expect(
      (await send('member', QUERY(clientId(), `&assignment=${forClassmate}`))).status
    ).toBe(400);
    expect(
      (await send('member', QUERY(clientId(), `&assignment=${forAll}`))).status
    ).toBe(201);
  });

  it('keeps to a limit per student', async () => {
    const { send, repo } = await setup();
    for (let i = 0; i < MAX_RECORDINGS_PER_STUDENT; i++) await send();
    expect(repo.rows).toHaveLength(MAX_RECORDINGS_PER_STUDENT);
    const over = await send();
    expect(over.status).toBe(409);
    expect(await json(over)).toEqual({ error: 'too_many_recordings' });
  });
});

describe('the teacher listens and answers (T3)', () => {
  it('lists what waits first, takes an answer, and the student reads it', async () => {
    const { call, sent, halaqaId } = await setup();
    const first = await sent('member');
    const second = await sent('classmate');
    const answer = await call(
      'owner',
      'PUT',
      `/halaqat/${halaqaId}/recordings/${first}/review`,
      {
        body: JSON.stringify({
          verdict: 'again',
          remark: 'sinVoiced',
          note: '  Das sīn stimmlos.  ',
          // Al-Ikhlāṣ 1–4: kept in reading order.
          marks: [
            { aya: 4, word: 2 },
            { aya: 1, word: 3 },
          ],
        }),
        type: 'application/json',
      }
    );
    expect(answer.status).toBe(204);
    const queue = await json(
      await call('owner', 'GET', `/halaqat/${halaqaId}/recordings`)
    );
    expect(queue.recordings.map((r: Json) => r.id)).toEqual([second, first]);
    expect(queue.recordings[0]).toMatchObject({ studentName: 'Yusuf', review: null });
    const mine = await json(await call('member', 'GET', '/recordings'));
    expect(mine.recordings).toHaveLength(1);
    expect(mine.recordings[0]).toMatchObject({
      id: first,
      halaqaName: 'Juzʾ ʿAmma',
      range: { sura: 112, from: 1, to: 4 },
      review: {
        verdict: 'again',
        remark: 'sinVoiced',
        note: 'Das sīn stimmlos.',
        marks: [
          { aya: 1, word: 3 },
          { aya: 4, word: 2 },
        ],
        reviewerName: 'Sheikh Ahmad',
      },
    });
  });

  it('refuses a mark that is no word of the recited āyāt', async () => {
    const { call, sent, halaqaId } = await setup();
    const id = await sent();
    const answer = (marks: unknown) =>
      call('owner', 'PUT', `/halaqat/${halaqaId}/recordings/${id}/review`, {
        body: JSON.stringify({ verdict: 'again', marks }),
        type: 'application/json',
      });
    // Al-Ikhlāṣ 1–4: āya 5 does not exist, āya 4 has five words, and a word counts once.
    for (const marks of [
      [{ aya: 5, word: 1 }],
      [{ aya: 4, word: 6 }],
      [{ aya: 0, word: 1 }],
      [
        { aya: 1, word: 1 },
        { aya: 1, word: 1 },
      ],
      [{ aya: 1, word: 1, rule: 'ghunna' }],
      Array.from({ length: 101 }, (_, i) => ({ aya: 1, word: i + 1 })),
    ]) {
      const response = await answer(marks);
      expect(response.status, JSON.stringify(marks).slice(0, 60)).toBe(400);
      expect(await json(response)).toEqual({ error: 'invalid_body', issues: ['marks'] });
    }
    expect((await answer([{ aya: 4, word: 5 }])).status).toBe(204);
  });

  it('refuses an answer that is not one of the verdicts or remarks', async () => {
    const { call, sent, halaqaId } = await setup();
    const id = await sent();
    for (const body of [
      { verdict: 'perfect' },
      { verdict: 'good', remark: 'nice' },
      {},
    ]) {
      const response = await call(
        'owner',
        'PUT',
        `/halaqat/${halaqaId}/recordings/${id}/review`,
        {
          body: JSON.stringify(body),
          type: 'application/json',
        }
      );
      expect(response.status).toBe(400);
    }
  });
});

describe('the teacher answers aloud (T3)', () => {
  it('keeps one voice note with the answer, which the student hears under it', async () => {
    const { call, sent, halaqaId, answer } = await setup();
    const id = await sent();
    await answer(id, true);
    const mine = await json(await call('member', 'GET', '/recordings'));
    expect(mine.recordings[0].review.voiceNote).toEqual({
      mime: 'audio/ogg',
      bytes: VOICE.length,
      durationMs: 3000,
    });
    const heard = await call('member', 'GET', `/recordings/${id}/voice-note`);
    expect(heard.status).toBe(200);
    expect(heard.headers.get('content-type')).toBe('audio/ogg');
    expect(heard.headers.get('cache-control')).toBe('private, no-store');
    expect(Buffer.from(await heard.arrayBuffer()).toString()).toBe('sheikh says');
    const part = await call(
      'owner',
      'GET',
      `/halaqat/${halaqaId}/recordings/${id}/voice-note`,
      {
        range: 'bytes=0-5',
      }
    );
    expect(part.status).toBe(206);
    expect(Buffer.from(await part.arrayBuffer()).toString()).toBe('sheikh');

    // Recorded again, it replaces the first; taken back, the answer stays without it.
    const base = `/halaqat/${halaqaId}/recordings/${id}/voice-note`;
    expect(
      (
        await call('owner', 'PUT', `${base}?durationMs=1500`, {
          body: Buffer.from('again'),
          type: 'audio/mp4',
        })
      ).status
    ).toBe(204);
    expect(
      Buffer.from(
        await (await call('member', 'GET', `/recordings/${id}/voice-note`)).arrayBuffer()
      ).toString()
    ).toBe('again');
    expect((await call('owner', 'DELETE', base)).status).toBe(204);
    expect((await call('owner', 'DELETE', base)).status).toBe(204);
    expect((await call('member', 'GET', `/recordings/${id}/voice-note`)).status).toBe(
      404
    );
    const after = await json(await call('member', 'GET', '/recordings'));
    expect(after.recordings[0].review).toMatchObject({
      verdict: 'again',
      voiceNote: null,
    });
  });

  it('refuses a voice note without an answer, too long, too large or not sound', async () => {
    const { call, sent, halaqaId, answer } = await setup();
    const id = await sent();
    const speak = (
      query: string,
      body: Buffer = VOICE,
      type = 'audio/webm',
      recordingId = id
    ) =>
      call(
        'owner',
        'PUT',
        `/halaqat/${halaqaId}/recordings/${recordingId}/voice-note${query}`,
        {
          body,
          type,
        }
      );
    const unanswered = await speak('?durationMs=3000');
    expect(unanswered.status).toBe(409);
    expect(await json(unanswered)).toEqual({ error: 'not_reviewed' });
    await answer(id);
    expect((await speak('')).status).toBe(400);
    expect((await speak('?durationMs=0')).status).toBe(400);
    expect((await speak('?durationMs=120001')).status).toBe(400);
    expect((await speak('?durationMs=3000&extra=1')).status).toBe(400);
    expect((await speak('?durationMs=3000', VOICE, 'text/plain')).status).toBe(415);
    expect((await speak('?durationMs=3000', Buffer.alloc(0))).status).toBe(400);
    expect(
      (await speak('?durationMs=3000', Buffer.alloc(MAX_VOICE_NOTE_BYTES + 1))).status
    ).toBe(413);
    expect(
      (
        await speak(
          '?durationMs=3000',
          VOICE,
          'audio/webm',
          '30000000-0000-4000-8000-999999999999'
        )
      ).status
    ).toBe(404);
    expect((await speak('?durationMs=120000')).status).toBe(204);
  });

  it('drops the voice note when another teacher answers, and goes with the recording', async () => {
    const { call, sent, halaqaId, answer } = await setup();
    const id = await sent();
    await answer(id, true);
    // The admin answers anew: the owner's voice no longer speaks for this answer.
    await answer(id, false, 'admin');
    expect(
      (await call('owner', 'GET', `/halaqat/${halaqaId}/recordings/${id}/voice-note`))
        .status
    ).toBe(404);
    // The owner answering again keeps his own note.
    await answer(id, true);
    await answer(id);
    expect((await call('member', 'GET', `/recordings/${id}/voice-note`)).status).toBe(
      200
    );
    expect((await call('classmate', 'GET', `/recordings/${id}/voice-note`)).status).toBe(
      404
    );
    expect((await call('member', 'DELETE', `/recordings/${id}`)).status).toBe(204);
    expect(
      (await call('owner', 'GET', `/halaqat/${halaqaId}/recordings/${id}/voice-note`))
        .status
    ).toBe(404);
  });
});

describe('hearing a recording', () => {
  it('serves the sound privately, whole or in byte ranges', async () => {
    const { call, sent, halaqaId } = await setup();
    const id = await sent();
    const whole = await call(
      'owner',
      'GET',
      `/halaqat/${halaqaId}/recordings/${id}/audio`
    );
    expect(whole.status).toBe(200);
    expect(whole.headers.get('content-type')).toBe('audio/webm');
    expect(whole.headers.get('accept-ranges')).toBe('bytes');
    expect(whole.headers.get('cache-control')).toBe('private, no-store');
    expect(Buffer.from(await whole.arrayBuffer()).toString()).toBe('0123456789');
    const part = await call('member', 'GET', `/recordings/${id}/audio`, {
      range: 'bytes=2-5',
    });
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe('bytes 2-5/10');
    expect(Buffer.from(await part.arrayBuffer()).toString()).toBe('2345');
    const past = await call('member', 'GET', `/recordings/${id}/audio`, {
      range: 'bytes=20-',
    });
    expect(past.status).toBe(416);
    expect(past.headers.get('content-range')).toBe('bytes */10');
  });

  it("never serves another student's recording, nor one of another ḥalaqa", async () => {
    const { call, sent, halaqat, halaqaId } = await setup();
    const id = await sent('member');
    expect((await call('classmate', 'GET', `/recordings/${id}/audio`)).status).toBe(404);
    const other = await halaqat.create({
      name: 'Andere',
      oneToOne: true,
      teacherId: ID.owner,
    });
    expect(
      (await call('owner', 'GET', `/halaqat/${other}/recordings/${id}/audio`)).status
    ).toBe(404);
    expect(
      (await call('owner', 'GET', `/halaqat/${halaqaId}/recordings/${id}/audio`)).status
    ).toBe(200);
  });

  it('is gone once the student deletes it or leaves the ḥalaqa', async () => {
    const { call, sent, halaqat, halaqaId } = await setup();
    const kept = await sent('member');
    const removed = await sent('member');
    expect((await call('member', 'DELETE', `/recordings/${removed}`)).status).toBe(204);
    expect((await call('member', 'GET', `/recordings/${removed}/audio`)).status).toBe(
      404
    );
    await halaqat.leave(halaqaId, ID.member);
    expect(
      (await call('owner', 'GET', `/halaqat/${halaqaId}/recordings/${kept}/audio`)).status
    ).toBe(404);
    expect(
      (await json(await call('owner', 'GET', `/halaqat/${halaqaId}/recordings`)))
        .recordings
    ).toEqual([]);
  });
});

describe('ranges and formats', () => {
  it('reads single byte ranges as media elements send them', () => {
    expect(rangeOf(undefined, 10)).toEqual({ start: 0, end: 9, partial: false });
    expect(rangeOf('bytes=0-', 10)).toEqual({ start: 0, end: 9, partial: true });
    expect(rangeOf('bytes=4-100', 10)).toEqual({ start: 4, end: 9, partial: true });
    expect(rangeOf('bytes=-3', 10)).toEqual({ start: 7, end: 9, partial: true });
    for (const bad of [
      'bytes=10-',
      'bytes=5-2',
      'bytes=-0',
      'bytes=-',
      'items=0-1',
      'bytes=0-1,4-5',
    ]) {
      expect(rangeOf(bad, 10)).toBeNull();
    }
  });

  it('knows the formats browsers record in', () => {
    expect(mimeOf('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(mimeOf('audio/mp4')).toBe('audio/mp4');
    expect(mimeOf('AUDIO/OGG; codecs=opus')).toBe('audio/ogg');
    expect(mimeOf('text/html')).toBeNull();
    expect(mimeOf(undefined)).toBeNull();
  });
});
