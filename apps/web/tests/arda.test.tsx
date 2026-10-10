import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ArdaLog } from '@/modules/arda/ArdaLog';
import { MyArda } from '@/modules/arda/MyArda';
import type { ArdaEntry, HalaqaMember, Me } from '@/services/auth';
import { fakeApi, Providers } from './render';

const HALAQA = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const AMINA = 'a0000000-0000-4000-8000-000000000001';
const YUSUF = 'a0000000-0000-4000-8000-000000000002';
const ENTRY = '33333333-3333-4333-8333-333333333333';
const TEACHER: Me = {
  id: 't',
  email: 'sheikh@example.org',
  name: 'Sheikh Ahmad',
  role: 'teacher',
  timeZone: null,
  language: 'de',
};
const STUDENT: Me = { ...TEACHER, id: AMINA, name: 'Amina', role: 'student' };

const member = (userId: string, name: string): HalaqaMember => ({
  userId,
  name,
  email: null,
  role: 'student',
  status: 'active',
  joinedAt: '2026-10-01T10:00:00Z',
});
const STUDENTS = [member(AMINA, 'Amina'), member(YUSUF, 'Yusuf')];

const entry = (over: Partial<ArdaEntry> = {}): ArdaEntry => ({
  id: ENTRY,
  halaqaId: HALAQA,
  studentId: AMINA,
  studentName: 'Amina',
  range: { sura: 112, from: 1, to: 4 },
  recitedOn: '2026-10-08',
  verdict: 'good',
  remark: null,
  note: null,
  marks: [],
  source: 'in_person',
  recordingId: null,
  writtenByName: 'Sheikh Ahmad',
  createdAt: '2026-10-08T10:00:00Z',
  ...over,
});

function renderWith(ui: ReactNode, answers: Parameters<typeof fakeApi>[0], me: Me) {
  const api = fakeApi(answers, me);
  render(<Providers client={api.client}>{ui}</Providers>);
  return api;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
});

describe('the ʿarḍ log for the sheikh (T4)', () => {
  const summary = [
    {
      studentId: AMINA,
      studentName: 'Amina',
      sura: 112,
      times: 2,
      lastOn: '2026-10-08',
      lastVerdict: 'good',
    },
    {
      studentId: AMINA,
      studentName: 'Amina',
      sura: 113,
      times: 1,
      lastOn: '2026-10-02',
      lastVerdict: 'again',
    },
  ];

  it('shows each student sūra by sūra, opens the history and removes an entry', async () => {
    let removed = false;
    const { calls } = renderWith(
      <ArdaLog halaqaId={HALAQA} students={STUDENTS} />,
      {
        [`GET /api/v1/halaqat/${HALAQA}/arda-log/summary`]: () =>
          Response.json({ summary: removed ? summary.slice(1) : summary }),
        [`GET /api/v1/halaqat/${HALAQA}/arda-log?student=${AMINA}`]: () =>
          Response.json({
            entries: removed
              ? []
              : [
                  entry({ note: 'Madd zu kurz.', remark: 'maddShort' }),
                  entry({
                    id: OTHER,
                    recitedOn: '2026-10-06',
                    verdict: 'again',
                    source: 'recording',
                    marks: [{ aya: 2, word: 2 }],
                  }),
                ],
            more: false,
          }),
        [`DELETE /api/v1/halaqat/${HALAQA}/arda-log/${ENTRY}`]: () => {
          removed = true;
          return new Response(null, { status: 204 });
        },
      },
      TEACHER
    );
    const user = userEvent.setup();
    const amina = (await screen.findByText('Amina', { selector: 'strong' })).closest(
      'li'
    )!;
    const rows = within(amina).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Sūra 112');
    expect(within(rows[0]!).getByText('الإخلاص')).toHaveAttribute('lang', 'ar');
    expect(within(rows[0]!).getByText(/^2-mal · zuletzt/)).toBeInTheDocument();
    expect(within(rows[0]!).getByText('gut')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('nochmal')).toBeInTheDocument();
    const yusuf = screen.getByText('Yusuf', { selector: 'strong' }).closest('li')!;
    expect(within(yusuf).getByText('Noch kein Vortrag eingetragen.')).toBeInTheDocument();

    await user.click(within(amina).getByRole('button', { name: 'Verlauf' }));
    expect(await within(amina).findByText('Madd zu kurz.')).toBeInTheDocument();
    expect(within(amina).getByText('Im Unterricht · Sheikh Ahmad')).toBeInTheDocument();
    expect(
      within(amina).getByText('Aufnahme · Sheikh Ahmad · 1 Wort markiert')
    ).toBeInTheDocument();
    expect(within(amina).getByText(/^Madd zu kurz – dehne länger/)).toBeInTheDocument();
    await user.click(within(amina).getAllByRole('button', { name: 'Entfernen' })[0]!);
    await waitFor(() => expect(within(amina).queryByText('Madd zu kurz.')).toBeNull());
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
    await waitFor(() => expect(within(amina).queryByText(/Sūra 112/)).toBeNull());
  });

  it('writes what was recited face to face', async () => {
    const { calls } = renderWith(
      <ArdaLog halaqaId={HALAQA} students={STUDENTS} />,
      {
        [`POST /api/v1/halaqat/${HALAQA}/arda-log`]: () =>
          Response.json({ id: ENTRY }, { status: 201 }),
      },
      TEACHER
    );
    const user = userEvent.setup();
    const form = (
      await screen.findByRole('heading', { name: 'Vortrag aus dem Unterricht eintragen' })
    ).closest('form')!;
    const submit = within(form).getByRole('button', { name: 'Eintragen' });
    expect(submit).toBeDisabled();
    await user.selectOptions(
      within(form).getByRole('combobox', { name: 'Schüler·in' }),
      YUSUF
    );
    await user.selectOptions(within(form).getByRole('combobox', { name: 'Sūra' }), '112');
    fireEvent.change(within(form).getByLabelText('Tag'), {
      target: { value: '2026-01-05' },
    });
    await user.selectOptions(
      within(form).getByRole('combobox', { name: 'Kurze Bemerkung' }),
      'ghunnaShort'
    );
    await user.type(within(form).getByRole('textbox'), '  Sehr schön gelesen. ');
    await user.click(within(form).getByRole('button', { name: 'Nochmal' }));
    await user.click(submit);
    expect(await within(form).findByRole('status')).toHaveTextContent('Eingetragen.');
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      studentId: YUSUF,
      range: { sura: 112, from: 1, to: 4 },
      recitedOn: '2026-01-05',
      verdict: 'again',
      remark: 'ghunnaShort',
      note: 'Sehr schön gelesen.',
    });
    // The summary is read again after writing.
    expect(
      calls.filter((c) => c.path === `/api/v1/halaqat/${HALAQA}/arda-log/summary`)
    ).toHaveLength(2);
  });

  it('keeps the entries of those who left, under former students', async () => {
    renderWith(
      <ArdaLog halaqaId={HALAQA} students={[member(AMINA, 'Amina')]} />,
      {
        [`GET /api/v1/halaqat/${HALAQA}/arda-log/summary`]: Response.json({
          summary: [
            {
              studentId: YUSUF,
              studentName: 'Yusuf',
              sura: 114,
              times: 2,
              lastOn: '2026-09-20',
              lastVerdict: 'good',
            },
          ],
        }),
      },
      TEACHER
    );
    const heading = await screen.findByRole('heading', { name: 'Frühere Schüler·innen' });
    const former = heading.nextElementSibling as HTMLElement;
    expect(within(former).getByText('Yusuf')).toBeInTheDocument();
    expect(within(former).getByText('Sūra 114')).toBeInTheDocument();
    // Nothing can be written for him any more: the form lists only active students.
    const form = screen
      .getByRole('heading', { name: 'Vortrag aus dem Unterricht eintragen' })
      .closest('form')!;
    expect(
      within(within(form).getByRole('combobox', { name: 'Schüler·in' })).queryByText(
        'Yusuf'
      )
    ).toBeNull();
  });

  it('says why writing failed', async () => {
    renderWith(
      <ArdaLog halaqaId={HALAQA} students={STUDENTS} />,
      {
        [`POST /api/v1/halaqat/${HALAQA}/arda-log`]: () =>
          Response.json({ error: 'too_many_entries' }, { status: 409 }),
      },
      TEACHER
    );
    const user = userEvent.setup();
    const form = (
      await screen.findByRole('heading', { name: 'Vortrag aus dem Unterricht eintragen' })
    ).closest('form')!;
    await user.click(within(form).getByRole('button', { name: 'Gut' }));
    await user.click(within(form).getByRole('button', { name: 'Eintragen' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Für diese·n Schüler·in stehen schon sehr viele Einträge im Heft.'
    );
  });
});

describe('the student’s own ʿarḍ (T4)', () => {
  it('shows the sūras recited in this ḥalaqa only', async () => {
    renderWith(
      <MyArda halaqaId={HALAQA} />,
      {
        'GET /api/v1/arda-log/summary': Response.json({
          summary: [
            {
              halaqaId: HALAQA,
              halaqaName: 'Juzʾ ʿAmma',
              sura: 114,
              times: 3,
              lastOn: '2026-10-09',
              lastVerdict: 'good',
            },
            {
              halaqaId: OTHER,
              halaqaName: 'Andere',
              sura: 1,
              times: 1,
              lastOn: '2026-10-01',
              lastVerdict: 'again',
            },
          ],
        }),
      },
      STUDENT
    );
    const section = (await screen.findByRole('heading', { name: 'Dein ʿArḍ' })).closest(
      'section'
    )!;
    const rows = within(section).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Sūra 114');
    expect(within(rows[0]!).getByText(/^3-mal · zuletzt/)).toBeInTheDocument();
  });

  it('shows nothing before the first recitation', async () => {
    const { calls } = renderWith(<MyArda halaqaId={HALAQA} />, {}, STUDENT);
    await waitFor(() =>
      expect(calls.some((c) => c.path === '/api/v1/arda-log/summary')).toBe(true)
    );
    expect(screen.queryByRole('heading', { name: 'Dein ʿArḍ' })).toBeNull();
  });
});
