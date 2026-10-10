import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConsentForTests } from '@/modules/recite/consent';
import { ReciteContext } from '@/modules/recite/context';
import { MyRecitations } from '@/modules/recite/MyRecitations';
import {
  enqueue,
  flushOutbox,
  memoryOutbox,
  resetOutboxForTests,
  type OutboxItem,
  type OutboxStore,
} from '@/modules/recite/outbox';
import { RecordingQueue } from '@/modules/recite/RecordingQueue';
import { clock, RecordPanel } from '@/modules/recite/RecordPanel';
import { baseMime, RecorderError, type RecorderFactory } from '@/modules/recite/recorder';
import type { HalaqaSummary, Me, OwnRecitation, QueuedRecitation } from '@/services/auth';
import type { PackIndex } from '@arda/quran';
import type { PackLoaderDeps } from '@/content/packs';
import { PackLoaderContext } from '@/modules/mushaf/usePack';
import { fakeApi, Providers } from './render';

/** The packs in the repository, loaded as the app loads them (checked, never cached). */
const PACKS = resolve(__dirname, '../public/packs');
const packs: PackLoaderDeps = {
  index: JSON.parse(readFileSync(resolve(PACKS, 'index.json'), 'utf8')) as PackIndex,
  fetch: async (url) =>
    new Response(new Uint8Array(readFileSync(resolve(PACKS, url.slice(7))))),
  cache: async () => null,
  sha256: async (data) => createHash('sha256').update(new Uint8Array(data)).digest('hex'),
};

const HALAQA = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ASSIGNMENT = '33333333-3333-4333-8333-333333333333';
const REC = '44444444-4444-4444-8444-444444444444';
const STUDENT: Me = {
  id: 's',
  email: 'amina@example.org',
  name: 'Amina',
  role: 'student',
  timeZone: null,
  language: 'de',
};
const TEACHER: Me = { ...STUDENT, id: 't', name: 'Sheikh Ahmad', role: 'teacher' };

const summary = (id: string, name: string): HalaqaSummary => ({
  id,
  name,
  oneToOne: false,
  role: 'student',
  status: 'active',
  teacherName: 'Sheikh Ahmad',
  students: 3,
  pending: null,
});

/** A microphone that records "sound" for 4.2 s, or refuses. */
function fakeRecorder(fail?: RecorderError) {
  const recorder = {
    started: 0,
    cancelled: 0,
    factory: (() => ({
      start: async () => {
        if (fail) throw fail;
        recorder.started += 1;
      },
      stop: async () => ({
        blob: new Blob(['take'], { type: 'audio/webm;codecs=opus' }),
        mime: 'audio/webm',
        durationMs: 4200,
      }),
      cancel: () => {
        recorder.cancelled += 1;
      },
    })) as RecorderFactory,
  };
  return recorder;
}

function renderWith(
  ui: ReactNode,
  answers: Parameters<typeof fakeApi>[0],
  me: Me | null,
  recorder = fakeRecorder(),
  outbox: OutboxStore = memoryOutbox()
) {
  const api = fakeApi(answers, me);
  render(
    <Providers client={api.client}>
      <PackLoaderContext.Provider value={packs}>
        <ReciteContext.Provider value={{ recorder: recorder.factory, outbox }}>
          <MemoryRouter>{ui}</MemoryRouter>
        </ReciteContext.Provider>
      </PackLoaderContext.Provider>
    </Providers>
  );
  return { ...api, outbox, recorder };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
  resetConsentForTests();
  resetOutboxForTests();
  URL.createObjectURL = vi.fn(() => 'blob:take');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('recording a recitation (S4.1)', () => {
  const panel = (props: Partial<Parameters<typeof RecordPanel>[0]> = {}) => (
    <RecordPanel range={{ sura: 112, from: 1, to: 4 }} onClose={() => {}} {...props} />
  );

  it('asks for consent once, records, plays it back and sends it with its assignment', async () => {
    const { calls, recorder, outbox } = renderWith(
      panel({ assignmentId: ASSIGNMENT, halaqaId: HALAQA }),
      {
        '/api/v1/halaqat': Response.json({ halaqat: [summary(HALAQA, 'Juzʾ ʿAmma')] }),
        [`POST /api/v1/halaqat/${HALAQA}/recordings`]: () =>
          Response.json({ id: REC }, { status: 201 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    expect(await screen.findByText('Bevor du aufnimmst')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Einverstanden' }));
    expect(localStorage.getItem('arda.recordingConsent')).toBe('given');
    await user.click(screen.getByRole('button', { name: 'Aufnahme starten' }));
    expect(recorder.started).toBe(1);
    expect(screen.getByRole('status')).toHaveTextContent('Aufnahme läuft · 0:00');
    await user.click(screen.getByRole('button', { name: 'Stopp' }));
    expect(document.querySelector('audio')).toHaveAttribute('src', 'blob:take');
    await user.click(screen.getByRole('button', { name: 'An meinen Sheikh senden' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Gesendet. Dein Sheikh hört sie sich an.'
    );
    const sent = calls.find((c) => c.method === 'POST')!;
    const url = new URL(sent.path, 'https://arda.test');
    expect(url.pathname).toBe(`/api/v1/halaqat/${HALAQA}/recordings`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      clientId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      sura: '112',
      from: '1',
      to: '4',
      durationMs: '4200',
      assignment: ASSIGNMENT,
    });
    expect(sent.body).toBeInstanceOf(Blob);
    expect(await outbox.all()).toEqual([]);
  });

  it('keeps the take when offline and says it will be sent', async () => {
    localStorage.setItem('arda.recordingConsent', 'given');
    const { outbox } = renderWith(
      panel(),
      {
        '/api/v1/halaqat': Response.json({ halaqat: [summary(HALAQA, 'Juzʾ ʿAmma')] }),
        [`POST /api/v1/halaqat/${HALAQA}/recordings`]: () => {
          throw new TypeError('offline');
        },
      },
      STUDENT
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufnahme starten' }));
    await user.click(screen.getByRole('button', { name: 'Stopp' }));
    await user.click(screen.getByRole('button', { name: 'An meinen Sheikh senden' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Gespeichert. Sie wird gesendet, sobald du wieder online bist.'
    );
    const kept = await outbox.all();
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({
      halaqaId: HALAQA,
      assignmentId: null,
      mime: 'audio/webm',
    });
  });

  it('addresses a take recorded offline to the ḥalaqāt it knew', async () => {
    localStorage.setItem('arda.recordingConsent', 'given');
    localStorage.setItem(
      'arda.recitationTargets',
      JSON.stringify({
        userId: STUDENT.id,
        targets: [{ id: HALAQA, name: 'Juzʾ ʿAmma', teacherName: null }],
      })
    );
    const offline = () => {
      throw new TypeError('offline');
    };
    const { outbox } = renderWith(
      panel(),
      {
        '/api/v1/halaqat': offline,
        [`POST /api/v1/halaqat/${HALAQA}/recordings`]: offline,
      },
      STUDENT
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufnahme starten' }));
    await user.click(screen.getByRole('button', { name: 'Stopp' }));
    await user.click(screen.getByRole('button', { name: 'An meinen Sheikh senden' }));
    await screen.findByText(/^Gespeichert\./);
    expect((await outbox.all())[0]?.halaqaId).toBe(HALAQA);
  });

  it('lets the student choose the ḥalaqa, and sends an assignment only to its own', async () => {
    localStorage.setItem('arda.recordingConsent', 'given');
    const { calls } = renderWith(
      panel({ assignmentId: ASSIGNMENT, halaqaId: HALAQA }),
      {
        '/api/v1/halaqat': Response.json({
          halaqat: [summary(HALAQA, 'Juzʾ ʿAmma'), summary(OTHER, 'Tajwīd')],
        }),
        [`POST /api/v1/halaqat/${OTHER}/recordings`]: () =>
          Response.json({ id: REC }, { status: 201 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufnahme starten' }));
    await user.click(screen.getByRole('button', { name: 'Stopp' }));
    const to = screen.getByRole('combobox', { name: 'Senden an' });
    expect(to).toHaveValue(HALAQA);
    await user.selectOptions(to, OTHER);
    await user.click(screen.getByRole('button', { name: 'An meinen Sheikh senden' }));
    await screen.findByText('Gesendet. Dein Sheikh hört sie sich an.');
    const sent = new URL(
      calls.find((c) => c.method === 'POST')!.path,
      'https://arda.test'
    );
    expect(sent.pathname).toBe(`/api/v1/halaqat/${OTHER}/recordings`);
    expect(sent.searchParams.has('assignment')).toBe(false);
  });

  it('asks to join a ḥalaqa first when there is none to send to', async () => {
    localStorage.setItem('arda.recordingConsent', 'given');
    renderWith(panel(), { '/api/v1/halaqat': Response.json({ halaqat: [] }) }, STUDENT);
    expect(
      await screen.findByText(/Tritt zuerst der Ḥalaqa deines Sheikhs bei/)
    ).toBeInTheDocument();
  });

  it('says when the microphone is not allowed', async () => {
    localStorage.setItem('arda.recordingConsent', 'given');
    renderWith(
      panel(),
      { '/api/v1/halaqat': Response.json({ halaqat: [summary(HALAQA, 'H')] }) },
      STUDENT,
      fakeRecorder(new RecorderError('denied'))
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufnahme starten' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Das Mikrofon ist nicht erlaubt.'
    );
  });

  it('drops a take the api refuses and says why', async () => {
    localStorage.setItem('arda.recordingConsent', 'given');
    const { outbox } = renderWith(
      panel(),
      {
        '/api/v1/halaqat': Response.json({ halaqat: [summary(HALAQA, 'H')] }),
        [`POST /api/v1/halaqat/${HALAQA}/recordings`]: () =>
          Response.json({ error: 'too_many_recordings' }, { status: 409 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufnahme starten' }));
    await user.click(screen.getByRole('button', { name: 'Stopp' }));
    await user.click(screen.getByRole('button', { name: 'An meinen Sheikh senden' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Du hast die Höchstzahl an Aufnahmen erreicht.'
    );
    expect(await outbox.all()).toEqual([]);
  });

  it('frees the microphone when closed mid-take', async () => {
    localStorage.setItem('arda.recordingConsent', 'given');
    const recorder = fakeRecorder();
    function Owner() {
      const [open, setOpen] = useState(true);
      return open ? panel({ onClose: () => setOpen(false) }) : null;
    }
    renderWith(
      <Owner />,
      { '/api/v1/halaqat': Response.json({ halaqat: [summary(HALAQA, 'H')] }) },
      STUDENT,
      recorder
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufnahme starten' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(recorder.cancelled).toBe(1);
  });
});

describe('closing the panel', () => {
  it('frees a microphone that opens after the panel closed', async () => {
    localStorage.setItem('arda.recordingConsent', 'given');
    let grant: () => void = () => {};
    const cancelled: string[] = [];
    const factory: RecorderFactory = () => ({
      start: () =>
        new Promise<void>((resolve) => {
          grant = resolve;
        }),
      stop: async () => ({ blob: new Blob(['x']), mime: 'audio/webm', durationMs: 1 }),
      cancel: () => cancelled.push('cancel'),
    });
    function Owner() {
      const [open, setOpen] = useState(true);
      return open ? (
        <RecordPanel
          range={{ sura: 112, from: 1, to: 1 }}
          onClose={() => setOpen(false)}
        />
      ) : null;
    }
    renderWith(
      <Owner />,
      { '/api/v1/halaqat': Response.json({ halaqat: [summary(HALAQA, 'H')] }) },
      STUDENT,
      { started: 0, cancelled: 0, factory }
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufnahme starten' }));
    // The permission prompt is still open when the student closes the panel.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async () => grant());
    expect(cancelled.length).toBeGreaterThanOrEqual(1);
  });
});

describe('the outbox (S4.1, offline-first)', () => {
  const item = (n: number, ownerId = STUDENT.id): OutboxItem => ({
    clientId: `0000000${n}-0000-4000-8000-000000000000`,
    ownerId,
    halaqaId: HALAQA,
    assignmentId: null,
    range: { sura: 112, from: n, to: n },
    mime: 'audio/webm',
    durationMs: 1000,
    blob: new Blob(['x']),
    createdAt: `2026-10-06T10:00:0${n}Z`,
  });

  it('sends oldest first, stops at the first that cannot go now and keeps the rest', async () => {
    const store = memoryOutbox();
    await store.put(item(2));
    await store.put(item(1));
    await store.put(item(3));
    const statuses = [201, 503];
    const { client, calls } = fakeApi({
      [`POST /api/v1/halaqat/${HALAQA}/recordings`]: () =>
        Response.json({ id: REC }, { status: statuses.shift() ?? 201 }),
    });
    const outcome = await flushOutbox(client, store, STUDENT.id);
    expect(outcome).toEqual({ sent: [item(1).clientId], refused: [], waiting: 2 });
    expect(
      calls.map((c) => new URL(c.path, 'https://a').searchParams.get('from'))
    ).toEqual(['1', '2']);
    expect((await store.all()).map((i) => i.range.from)).toEqual([2, 3]);
  });

  it('drops what the api refuses and keeps what an expired session could not send', async () => {
    const store = memoryOutbox();
    await store.put(item(1));
    await store.put(item(2));
    const answers = [
      Response.json({ error: 'invalid_body' }, { status: 400 }),
      Response.json({ error: 'unauthorized' }, { status: 401 }),
    ];
    const { client } = fakeApi({
      [`POST /api/v1/halaqat/${HALAQA}/recordings`]: () => answers.shift()!,
    });
    expect(await flushOutbox(client, store, STUDENT.id)).toEqual({
      sent: [],
      refused: [{ clientId: item(1).clientId, code: 'invalid_body' }],
      waiting: 1,
    });
    expect((await store.all()).map((i) => i.range.from)).toEqual([2]);
  });
});

describe('the outbox and accounts', () => {
  const item = (n: number, ownerId: string): OutboxItem => ({
    clientId: `0000000${n}-0000-4000-8000-000000000000`,
    ownerId,
    halaqaId: HALAQA,
    assignmentId: null,
    range: { sura: 112, from: n, to: n },
    mime: 'audio/webm',
    durationMs: 1000,
    blob: new Blob(['x']),
    createdAt: `2026-10-06T10:00:0${n}Z`,
  });

  it('sends only what the signed-in account recorded', async () => {
    const store = memoryOutbox();
    await store.put(item(1, 'someone-else'));
    await store.put(item(2, STUDENT.id));
    const { client, calls } = fakeApi({
      [`POST /api/v1/halaqat/${HALAQA}/recordings`]: () =>
        Response.json({ id: REC }, { status: 201 }),
    });
    expect(await flushOutbox(client, store, STUDENT.id)).toEqual({
      sent: [item(2, STUDENT.id).clientId],
      refused: [],
      waiting: 0,
    });
    expect(calls).toHaveLength(1);
    expect((await store.all()).map((i) => i.ownerId)).toEqual(['someone-else']);
  });

  it('sends a take queued while another flush is running', async () => {
    const store = memoryOutbox();
    await store.put(item(1, STUDENT.id));
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first = true;
    const { client, calls } = fakeApi({
      [`POST /api/v1/halaqat/${HALAQA}/recordings`]: async () => {
        if (first) {
          first = false;
          await held;
        }
        return Response.json({ id: REC }, { status: 201 });
      },
    });
    const running = flushOutbox(client, store, STUDENT.id);
    await waitFor(() => expect(calls).toHaveLength(1));
    const queued = enqueue(client, store, item(2, STUDENT.id));
    release();
    await running;
    expect((await queued).sent).toEqual([item(2, STUDENT.id).clientId]);
    expect(await store.all()).toEqual([]);
  });
});

describe('the recorder', () => {
  it('names the container the api accepts and counts minutes', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseMime('audio/mp4')).toBe('audio/mp4');
    expect(clock(0)).toBe('0:00');
    expect(clock(125_400)).toBe('2:05');
  });
});

const queued = (over: Partial<QueuedRecitation> = {}): QueuedRecitation => ({
  id: REC,
  halaqaId: HALAQA,
  assignmentId: null,
  range: { sura: 112, from: 1, to: 4 },
  mime: 'audio/webm',
  bytes: 4,
  durationMs: 4200,
  createdAt: '2026-10-06T10:00:00Z',
  review: null,
  studentId: 's',
  studentName: 'Amina',
  studentEmail: 'amina@example.org',
  ...over,
});

describe('listening and answering (S4.2)', () => {
  it('plays a waiting recitation and answers it with a verdict, a remark, a note and marks', async () => {
    const { calls } = renderWith(
      <RecordingQueue halaqaId={HALAQA} />,
      {
        [`GET /api/v1/halaqat/${HALAQA}/recordings`]: Response.json({
          recordings: [queued()],
          more: false,
        }),
        [`PUT /api/v1/halaqat/${HALAQA}/recordings/${REC}/review`]: () =>
          new Response(null, { status: 204 }),
      },
      TEACHER
    );
    const user = userEvent.setup();
    const row = (await screen.findByText('Amina')).closest('li')!;
    expect(within(row).getByText('Sūra 112 · Āyāt 1–4')).toBeInTheDocument();
    expect(row.querySelector('audio')).toHaveAttribute(
      'src',
      `/api/v1/halaqat/${HALAQA}/recordings/${REC}/audio`
    );
    expect(within(row).getByRole('button', { name: 'Antwort senden' })).toBeDisabled();
    await user.click(within(row).getByRole('button', { name: 'Nochmal' }));
    await user.selectOptions(
      within(row).getByRole('combobox', { name: 'Kurze Bemerkung' }),
      'raRolled'
    );
    await user.type(
      within(row).getByRole('textbox'),
      '  Achte auf das Rāʾ in al-ṣamad. '
    );
    // Al-Ikhlāṣ word by word: tap aṣ-ṣamad (2:2) and aḥad (1:4), then tap a word twice.
    const words = await within(row).findByRole('group', {
      name: 'Tippe beim Hören die Wörter an, die noch nicht stimmen.',
    });
    const ayat = [...words.children] as HTMLElement[];
    expect(ayat).toHaveLength(4);
    const word = (aya: number, n: number) =>
      within(ayat[aya - 1]!).getAllByRole('button')[n - 1]!;
    await user.click(word(2, 2));
    await user.click(word(1, 4));
    await user.click(word(3, 1));
    await user.click(word(3, 1));
    expect(word(2, 2)).toHaveAttribute('aria-pressed', 'true');
    expect(word(3, 1)).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(row).getByRole('button', { name: 'Antwort senden' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
        verdict: 'again',
        remark: 'raRolled',
        note: 'Achte auf das Rāʾ in al-ṣamad.',
        marks: [
          { aya: 1, word: 4 },
          { aya: 2, word: 2 },
        ],
      })
    );
    expect(screen.getByText('2 Wörter markiert')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Beantwortet' })
    ).toBeInTheDocument();
    expect(screen.getByText('Gerade wartet keine Aufnahme.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ändern' })).toBeInTheDocument();
  });

  it('offers the remarks for sīn, zāy and rāʾ', async () => {
    renderWith(
      <RecordingQueue halaqaId={HALAQA} />,
      {
        [`GET /api/v1/halaqat/${HALAQA}/recordings`]: Response.json({
          recordings: [queued()],
          more: false,
        }),
      },
      TEACHER
    );
    const remark = await screen.findByRole('combobox', { name: 'Kurze Bemerkung' });
    const options = within(remark)
      .getAllByRole('option')
      .map((o) => o.getAttribute('value'));
    expect(options).toEqual(
      expect.arrayContaining(['sinVoiced', 'zayVoiceless', 'raRolled'])
    );
  });

  it('pages to older recitations', async () => {
    const older = queued({ id: OTHER, studentName: 'Yusuf' });
    const { calls } = renderWith(
      <RecordingQueue halaqaId={HALAQA} />,
      {
        [`/api/v1/halaqat/${HALAQA}/recordings`]: Response.json({
          recordings: [queued()],
          more: true,
        }),
        [`/api/v1/halaqat/${HALAQA}/recordings?before=${REC}`]: Response.json({
          recordings: [older],
          more: false,
        }),
      },
      TEACHER
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Ältere zeigen' }));
    expect(await screen.findByText('Yusuf')).toBeInTheDocument();
    expect(calls.at(-1)?.path).toBe(`/api/v1/halaqat/${HALAQA}/recordings?before=${REC}`);
  });
});

describe('the student’s recitations on Today', () => {
  const own = (over: Partial<OwnRecitation> = {}): OwnRecitation => ({
    ...queued(),
    halaqaName: 'Juzʾ ʿAmma',
    ...over,
  });

  it('shows the sheikh’s answer, plays and deletes', async () => {
    const { calls } = renderWith(
      <MyRecitations />,
      {
        'GET /api/v1/recordings': Response.json({
          recordings: [
            own({
              review: {
                verdict: 'again',
                remark: 'sinVoiced',
                note: 'Noch einmal Āya 2.',
                marks: [{ aya: 2, word: 2 }],
                reviewerName: 'Sheikh Ahmad',
                reviewedAt: '2026-10-06T12:00:00Z',
              },
            }),
            own({ id: OTHER, range: { sura: 113, from: 1, to: 1 } }),
          ],
          more: false,
        }),
        [`DELETE /api/v1/recordings/${OTHER}`]: () => new Response(null, { status: 204 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    const answered = (await screen.findByText('Sūra 112 · Āyāt 1–4')).closest('li')!;
    expect(within(answered).getByText('nochmal')).toBeInTheDocument();
    expect(within(answered).getByText('Sheikh Ahmad schreibt:')).toBeInTheDocument();
    expect(within(answered).getByText(/^Sīn summt/)).toBeInTheDocument();
    expect(within(answered).getByText('Noch einmal Āya 2.')).toBeInTheDocument();
    // The marked word, underlined and named: aṣ-ṣamad in āya 2.
    expect(within(answered).getByText('1 Wort markiert')).toBeInTheDocument();
    const marked = await waitFor(() => {
      const found = answered.querySelectorAll('.recited-mark');
      expect(found).toHaveLength(1);
      return found[0]!;
    });
    expect(marked).toHaveTextContent('(markiert)');
    expect(marked.closest('[lang="ar"]')).toHaveAttribute('dir', 'rtl');
    expect(answered.querySelector('audio')).toHaveAttribute(
      'src',
      `/api/v1/recordings/${REC}/audio`
    );
    const waiting = screen.getByText('Sūra 113 · Āya 1').closest('li')!;
    expect(within(waiting).getByText('wartet auf deinen Sheikh')).toBeInTheDocument();
    await user.click(within(waiting).getByRole('button', { name: 'Löschen' }));
    await waitFor(() => expect(screen.queryByText('Sūra 113 · Āya 1')).toBeNull());
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
  });

  it('shows nothing before the first recitation', async () => {
    const { calls } = renderWith(<MyRecitations />, {}, STUDENT);
    await waitFor(() =>
      expect(calls.some((c) => c.path === '/api/v1/recordings')).toBe(true)
    );
    await act(async () => {});
    expect(screen.queryByRole('heading', { name: 'Deine Rezitationen' })).toBeNull();
  });
});
