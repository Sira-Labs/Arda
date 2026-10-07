import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  cardPath,
  dueState,
  gamePath,
  hasCard,
  linkFor,
  localDay,
} from '@/modules/assignments/format';
import { Halaqa } from '@/modules/halaqa/Halaqa';
import { Today } from '@/modules/today/Today';
import type { Me, StudentAssignment, TeacherAssignment } from '@/services/auth';
import { fakeApi, Providers } from './render';

const HALAQA = '11111111-1111-4111-8111-111111111111';
const STUDENT: Me = {
  id: 's',
  email: 'amina@example.org',
  name: 'Amina',
  role: 'student',
  timeZone: null,
  language: 'de',
};
const TEACHER: Me = {
  ...STUDENT,
  id: 't',
  email: 'sheikh@example.org',
  name: 'Sheikh Ahmad',
  role: 'teacher',
};

/** Saturday, 3 October 2026, noon on this machine's clock. */
const NOW = new Date(2026, 9, 3, 12, 0, 0);

const task = (over: Partial<StudentAssignment> = {}): StudentAssignment => ({
  id: 'a1',
  kind: 'read',
  studentId: null,
  range: { sura: 2, from: 1, to: 5 },
  pages: null,
  focusRule: 'ikhfa',
  repetitions: 3,
  note: 'Achte auf die Ghunna.',
  dueOn: '2026-10-09',
  createdAt: '2026-10-01T10:00:00Z',
  halaqaId: HALAQA,
  halaqaName: 'Juzʾ ʿAmma',
  fromName: 'Sheikh Ahmad',
  doneAt: null,
  ...over,
});

function renderAt(path: string, answers: Parameters<typeof fakeApi>[0], me: Me) {
  const api = fakeApi(answers, me);
  render(
    <Providers client={api.client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/halaqa/:id" element={<Halaqa />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </Providers>
  );
  return api;
}

beforeEach(() => {
  // Only the date is fixed; timers stay real for the user events.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('due days', () => {
  it('are days on the device calendar, never shifted by a time zone', () => {
    expect(localDay(NOW)).toBe('2026-10-03');
    expect(addDays('2026-10-03', 7)).toBe('2026-10-10');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(dueState('2026-10-02', '2026-10-03')).toBe('overdue');
    expect(dueState('2026-10-03', '2026-10-03')).toBe('today');
    expect(dueState('2026-10-04', '2026-10-03')).toBe('later');
  });
});

describe('"Von meinem Sheikh" on Today (T2)', () => {
  it('puts the open assignments first, soonest due on top', async () => {
    renderAt(
      '/',
      {
        'GET /api/v1/halaqat': Response.json({ halaqat: [] }),
        'GET /api/v1/assignments': Response.json({
          assignments: [
            task({
              id: 'late',
              kind: 'recite',
              range: { sura: 112, from: 1, to: 4 },
              pages: null,
              focusRule: null,
              repetitions: null,
              note: null,
              dueOn: '2026-10-01',
            }),
            task(),
            task({
              id: 'learn',
              kind: 'learn',
              range: null,
              pages: null,
              focusRule: 'idgham-no-ghunna',
              repetitions: null,
              note: null,
              dueOn: '2026-10-03',
            }),
          ],
        }),
      },
      STUDENT
    );
    const card = (await screen.findByRole('heading', { name: 'Aufgaben' })).closest(
      'section'
    )!;
    const items = within(card).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    expect(items[0]).toHaveTextContent('Nochmal rezitieren');
    expect(items[0]).toHaveTextContent('Sūra 112, Āyāt 1–4');
    expect(within(items[0]!).getByText('الإخلاص')).toHaveAttribute('lang', 'ar');
    expect(within(items[0]!).getByText(/überfällig seit/)).toHaveClass('due-overdue');

    expect(items[1]).toHaveTextContent('Lesen · 3-mal');
    expect(items[1]).toHaveTextContent('Sūra 2, Āyāt 1–5');
    expect(within(items[1]!).getByText('البقرة')).toHaveAttribute('dir', 'rtl');
    expect(items[1]).toHaveTextContent('Achte auf Ikhfāʾ');
    expect(items[1]).toHaveTextContent('Achte auf die Ghunna.');
    expect(items[1]).toHaveTextContent('von Sheikh Ahmad · Juzʾ ʿAmma');
    expect(items[1]).toHaveTextContent(/bis Fr\., 9\. Okt\./);

    // The two idghām rules share a term; the label says which one.
    expect(items[2]).toHaveTextContent('Achte auf Idghām ohne Ghunna');
    expect(items[2]).toHaveTextContent('heute fällig');
    expect(
      within(items[2]!).getByRole('link', { name: 'Zur Regelkarte' })
    ).toHaveAttribute('href', '/pfad/2/idgham');
    expect(screen.queryByText('Noch keine Aufgaben')).not.toBeInTheDocument();
  });

  it('tells the sheikh when it is done, and can take it back', async () => {
    const { calls } = renderAt(
      '/',
      {
        'GET /api/v1/halaqat': Response.json({ halaqat: [] }),
        'GET /api/v1/assignments': Response.json({ assignments: [task()] }),
        [`PUT /api/v1/halaqat/${HALAQA}/assignments/a1/done`]: () =>
          new Response(null, { status: 204 }),
        [`DELETE /api/v1/halaqat/${HALAQA}/assignments/a1/done`]: () =>
          new Response(null, { status: 204 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Erledigt' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Erledigt – dein Sheikh sieht es.'
    );
    expect(screen.getByText(/erledigt am 3\. Okt\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Doch nicht erledigt' }));
    expect(await screen.findByRole('button', { name: 'Erledigt' })).toBeEnabled();
    expect(
      calls.filter((c) => c.path.endsWith('/done')).map((c) => `${c.method} ${c.path}`)
    ).toEqual([
      `PUT /api/v1/halaqat/${HALAQA}/assignments/a1/done`,
      `DELETE /api/v1/halaqat/${HALAQA}/assignments/a1/done`,
    ]);
  });

  it('lists three and points to the rest', async () => {
    renderAt(
      '/',
      {
        'GET /api/v1/halaqat': Response.json({ halaqat: [] }),
        'GET /api/v1/assignments': Response.json({
          assignments: ['a', 'b', 'c', 'd', 'e'].map((id) => task({ id })),
        }),
      },
      STUDENT
    );
    expect(
      await screen.findByRole('link', { name: '2 weitere Aufgaben' })
    ).toHaveAttribute('href', '/sheikh');
    expect(screen.getAllByRole('button', { name: 'Erledigt' })).toHaveLength(3);
  });

  it('says when the assignments could not be loaded, instead of "none"', async () => {
    renderAt(
      '/',
      {
        'GET /api/v1/halaqat': Response.json({ halaqat: [] }),
        'GET /api/v1/assignments': Response.json({ error: 'x' }, { status: 500 }),
      },
      STUDENT
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Serverfehler (500).');
    expect(screen.queryByText('Noch keine Aufgaben')).not.toBeInTheDocument();
  });
});

const view = (role: 'teacher' | 'student') =>
  Response.json(
    role === 'teacher'
      ? {
          role,
          halaqa: {
            id: HALAQA,
            name: 'Juzʾ ʿAmma',
            oneToOne: false,
            teacherName: 'Sheikh Ahmad',
            createdAt: '2026-10-01T10:00:00Z',
          },
          members: [
            {
              userId: 't',
              name: 'Sheikh Ahmad',
              email: 'sheikh@example.org',
              role: 'teacher',
              status: 'active',
              joinedAt: '2026-10-01T10:00:00Z',
            },
            {
              userId: 's',
              name: 'Amina',
              email: 'amina@example.org',
              role: 'student',
              status: 'active',
              joinedAt: '2026-10-01T10:00:00Z',
            },
            {
              userId: 'y',
              name: null,
              email: 'yusuf@example.org',
              role: 'student',
              status: 'active',
              joinedAt: '2026-10-01T10:00:00Z',
            },
          ],
          invite: null,
        }
      : {
          role,
          halaqa: {
            id: HALAQA,
            name: 'Juzʾ ʿAmma',
            oneToOne: false,
            teacherName: 'Sheikh Ahmad',
            createdAt: '2026-10-01T10:00:00Z',
          },
        }
  );

const given = (over: Partial<TeacherAssignment> = {}): TeacherAssignment => ({
  id: 'g1',
  kind: 'recite',
  studentId: null,
  range: { sura: 112, from: 1, to: 4 },
  pages: null,
  focusRule: null,
  repetitions: null,
  note: null,
  dueOn: '2026-10-09',
  createdAt: '2026-10-01T10:00:00Z',
  studentName: null,
  targets: 2,
  done: [
    { userId: 's', name: 'Amina', email: 'amina@example.org', doneAt: NOW.toISOString() },
  ],
  ...over,
});

describe('giving assignments on the ḥalaqa page (T2)', () => {
  it('shows the teacher who is done, and takes an assignment back', async () => {
    let list = [given()];
    const { calls } = renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('teacher'),
        [`GET /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ role: 'teacher', assignments: list, more: false }),
        [`DELETE /api/v1/halaqat/${HALAQA}/assignments/g1`]: () => {
          list = [];
          return new Response(null, { status: 204 });
        },
      },
      TEACHER
    );
    const row = (await screen.findByText('1 von 2 erledigt')).closest('li')!;
    expect(row).toHaveTextContent('Erledigt von Amina');
    expect(row).toHaveTextContent('für alle');
    await userEvent
      .setup()
      .click(within(row).getByRole('button', { name: 'Zurückziehen' }));
    expect(
      await screen.findByText('Noch keine Aufgaben in dieser Ḥalaqa.')
    ).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith('/g1'))).toBe(true);
  });

  it('gives one student a range of āyāt to read, with a rule and a note', async () => {
    const { calls } = renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('teacher'),
        [`GET /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ role: 'teacher', assignments: [], more: false }),
        [`POST /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ id: 'new' }, { status: 201 }),
      },
      TEACHER
    );
    const user = userEvent.setup();
    const form = (await screen.findByRole('heading', { name: 'Aufgabe geben' })).closest(
      'form'
    )!;
    const f = within(form);
    // Only the ḥalaqa's active students can be chosen; one without a name by their email.
    expect(
      within(f.getByLabelText('Für'))
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['alle Schüler·innen', 'Amina', 'yusuf@example.org']);
    await user.selectOptions(f.getByLabelText('Für'), 's');
    await user.selectOptions(f.getByLabelText('Art'), 'read');
    await user.selectOptions(f.getByLabelText('Sūra'), '2');
    // Choosing a sūra takes all of it; the teacher narrows it down.
    expect(f.getByLabelText('bis Āya')).toHaveValue(286);
    await user.clear(f.getByLabelText('bis Āya'));
    await user.type(f.getByLabelText('bis Āya'), '5');
    await user.clear(f.getByLabelText('Wie oft'));
    await user.type(f.getByLabelText('Wie oft'), '3');
    await user.selectOptions(f.getByLabelText('Regel'), 'ikhfa');
    await user.type(f.getByLabelText('Notiz (optional)'), '  Langsam.  ');
    await user.click(f.getByRole('button', { name: 'Aufgabe geben' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Aufgabe gegeben.');
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      kind: 'read',
      studentId: 's',
      range: { sura: 2, from: 1, to: 5 },
      pages: null,
      focusRule: 'ikhfa',
      repetitions: 3,
      note: 'Langsam.',
      // A week ahead by default.
      dueOn: '2026-10-10',
    });
    // The list is loaded again after giving.
    expect(
      calls.filter((c) => c.path === `/api/v1/halaqat/${HALAQA}/assignments`).length
    ).toBe(3);
  });

  it('gives pages of the sheikh’s IndoPak muṣḥaf, showing the āyāt on them', async () => {
    const { calls } = renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('teacher'),
        [`GET /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ role: 'teacher', assignments: [], more: false }),
        [`POST /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ id: 'new' }, { status: 201 }),
      },
      TEACHER
    );
    const user = userEvent.setup();
    const form = (await screen.findByRole('heading', { name: 'Aufgabe geben' })).closest(
      'form'
    )!;
    const f = within(form);
    await user.selectOptions(f.getByLabelText('Art'), 'read');
    await user.click(f.getByRole('radio', { name: 'Seiten' }));
    expect(f.queryByLabelText('Sūra')).not.toBeInTheDocument();
    expect(f.getByLabelText('Muṣḥaf')).toHaveValue('indopak-15');
    // The copy's first page is 2 (al-Fātiḥa); a later first page moves the last one along.
    expect(f.getByLabelText('von Seite')).toHaveValue(2);
    await user.clear(f.getByLabelText('von Seite'));
    await user.type(f.getByLabelText('von Seite'), '8');
    expect(f.getByLabelText('bis Seite')).toHaveValue(8);
    await user.clear(f.getByLabelText('bis Seite'));
    await user.type(f.getByLabelText('bis Seite'), '9');
    expect(f.getByText(/Auf diesen Seiten:/)).toHaveTextContent('البقرة 38–57');
    await user.click(f.getByRole('button', { name: 'Aufgabe geben' }));

    expect(await screen.findByText('Aufgabe gegeben.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      kind: 'read',
      range: null,
      pages: { layout: 'indopak-15', from: 8, to: 9 },
    });
  });

  it('shows the āyāt of each sūra on Madīna pages that cross sūras', async () => {
    renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('teacher'),
        [`GET /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ role: 'teacher', assignments: [], more: false }),
      },
      TEACHER
    );
    const user = userEvent.setup();
    const form = (await screen.findByRole('heading', { name: 'Aufgabe geben' })).closest(
      'form'
    )!;
    const f = within(form);
    await user.click(f.getByRole('radio', { name: 'Seiten' }));
    await user.selectOptions(f.getByLabelText('Muṣḥaf'), 'madina');
    expect(f.getByLabelText('von Seite')).toHaveValue(1);
    await user.clear(f.getByLabelText('von Seite'));
    await user.type(f.getByLabelText('von Seite'), '604');
    expect(f.getByText(/Auf diesen Seiten:/)).toHaveTextContent(
      'الإخلاص 1–4 · الفلق 1–5 · الناس 1–6'
    );
    // Past the last page there is nothing to give.
    await user.clear(f.getByLabelText('bis Seite'));
    await user.type(f.getByLabelText('bis Seite'), '605');
    expect(f.getByRole('button', { name: 'Aufgabe geben' })).toBeDisabled();
  });

  it('asks for a rule, not āyāt, when the student is to learn or practise', async () => {
    renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('teacher'),
        [`GET /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ role: 'teacher', assignments: [], more: false }),
      },
      TEACHER
    );
    const user = userEvent.setup();
    const form = (await screen.findByRole('heading', { name: 'Aufgabe geben' })).closest(
      'form'
    )!;
    const f = within(form);
    const submit = f.getByRole('button', { name: 'Aufgabe geben' });
    expect(submit).toBeEnabled();
    await user.selectOptions(f.getByLabelText('Art'), 'practise');
    expect(f.queryByLabelText('Sūra')).not.toBeInTheDocument();
    expect(f.queryByLabelText('Wie oft')).not.toBeInTheDocument();
    expect(submit).toBeDisabled();
    await user.selectOptions(f.getByLabelText('Regel'), 'iqlab');
    expect(submit).toBeEnabled();
  });

  it('says why giving failed', async () => {
    renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('teacher'),
        [`GET /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ role: 'teacher', assignments: [], more: false }),
        [`POST /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({ error: 'too_many_assignments' }, { status: 409 }),
      },
      TEACHER
    );
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Aufgabe geben' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Diese Ḥalaqa hat die Höchstzahl an Aufgaben erreicht.'
    );
  });

  it('shows a student their assignments here too, and pages back', async () => {
    const { calls } = renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('student'),
        [`GET /api/v1/halaqat/${HALAQA}/assignments`]: () =>
          Response.json({
            role: 'student',
            assignments: [task({ id: 'new' })],
            more: true,
          }),
        [`GET /api/v1/halaqat/${HALAQA}/assignments?before=new`]: () =>
          Response.json({
            role: 'student',
            assignments: [
              task({ id: 'old', dueOn: '2026-09-20', doneAt: '2026-09-19T08:00:00Z' }),
            ],
            more: false,
          }),
        [`PUT /api/v1/halaqat/${HALAQA}/assignments/new/done`]: () =>
          new Response(null, { status: 204 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    expect(
      screen.queryByRole('heading', { name: 'Aufgabe geben' })
    ).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Ältere zeigen' }));
    expect(await screen.findByText(/erledigt am 19\. Sept\./)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ältere zeigen' })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Erledigt' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Doch nicht erledigt' })).toHaveLength(
        2
      )
    );
    expect(calls.map((c) => `${c.method} ${c.path}`)).toContain(
      `PUT /api/v1/halaqat/${HALAQA}/assignments/new/done`
    );
  });
});

describe('assignments in Arabic', () => {
  it('reads right to left, with the Arabic rule names', async () => {
    localStorage.setItem('arda.language', 'ar');
    renderAt(
      '/',
      {
        'GET /api/v1/halaqat': Response.json({ halaqat: [] }),
        'GET /api/v1/assignments': Response.json({
          assignments: [task({ focusRule: 'idgham-ghunna' })],
        }),
      },
      { ...STUDENT, language: 'ar' }
    );
    const item = (await screen.findByRole('heading', { name: 'المهام' }))
      .closest('section')!
      .querySelector('li')!;
    expect(item).toHaveTextContent('قراءة · ٣ مرات');
    expect(item).toHaveTextContent('سورة ٢، الآيات ١–٥');
    // The Arabic name already says "with ghunna"; nothing is added to it.
    expect(item).toHaveTextContent('انتبه إلى إِدْغَام بِغُنَّة');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });
});

describe('the language on Today', () => {
  it('switches the app to English from the first screen', async () => {
    const api = renderAt(
      '/',
      {
        'GET /api/v1/halaqat': Response.json({ halaqat: [] }),
        'GET /api/v1/assignments': Response.json({ assignments: [] }),
        '/api/v1/account/settings': new Response(null, { status: 204 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Sprache' }),
      'en'
    );
    expect(await screen.findByRole('combobox', { name: 'Language' })).toHaveValue('en');
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    await waitFor(() =>
      expect(api.calls.filter((c) => c.path === '/api/v1/account/settings')).toEqual([
        { path: '/api/v1/account/settings', method: 'PATCH', body: { language: 'en' } },
      ])
    );
  });
});

describe('an assignment of pages', () => {
  it('names the pages and their āyāt, and opens them in that muṣḥaf', async () => {
    renderAt(
      '/',
      {
        'GET /api/v1/halaqat': Response.json({ halaqat: [] }),
        'GET /api/v1/assignments': Response.json({
          assignments: [
            task({
              id: '00000000-0000-4000-8000-0000000000a1',
              range: null,
              pages: { layout: 'indopak-15', from: 8, to: 9 },
              focusRule: null,
            }),
          ],
        }),
      },
      STUDENT
    );
    const row = (await screen.findByText(/Seiten 8–9/)).closest('li')!;
    expect(row).toHaveTextContent('Seiten 8–9 (IndoPak, 15 Zeilen) · البقرة 38–57');
    expect(within(row).getByRole('link', { name: 'Im Muṣḥaf öffnen' })).toHaveAttribute(
      'href',
      `/mushaf/seite/8?layout=indopak-15&seiten=8-9&aufgabe=00000000-0000-4000-8000-0000000000a1&halaqa=${
        task().halaqaId
      }`
    );
  });
});

describe('where an assignment leads (units 2–4)', () => {
  it('opens the rule card or the game of the rule’s unit', () => {
    expect(cardPath('idgham-no-ghunna')).toBe('/pfad/2/idgham');
    expect(cardPath('ikhfa-shafawi')).toBe('/pfad/3/ikhfa-shafawi');
    expect(cardPath('ghunna-mushaddad')).toBe('/pfad/3/ghunna');
    expect(cardPath('qalqala')).toBe('/pfad/4/qalqala');
    expect(gamePath('iqlab')).toBe('/pfad/2/spiel/welche-regel');
    expect(gamePath('izhar-shafawi')).toBe('/pfad/3/spiel/welche-regel');
    expect(gamePath('qalqala')).toBe('/pfad/4/spiel/buchstaben');
    expect(hasCard('qalqala')).toBe(true);
    expect(linkFor('learn', 'qalqala')).toBe('card');
    expect(linkFor('practise', 'idgham-shafawi')).toBe('game');
    expect(linkFor('read', 'qalqala')).toBeNull();
  });
});
