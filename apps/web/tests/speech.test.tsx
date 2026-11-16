import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { EvaluationOptIn } from '@/modules/speech/EvaluationOptIn';
import { SpeechAgreement } from '@/modules/speech/SpeechAgreement';
import type { Me, SpeechAgreement as Row, SpeechAgreementReport } from '@/services/auth';
import { fakeApi, Providers } from './render';

const HALAQA = 'b0000000-0000-4000-8000-000000000001';
const STUDENT = { id: 's', email: 'a@example.org', name: 'Amina', role: 'student' } as Me;
const TEACHER = {
  id: 't',
  email: 't@example.org',
  name: 'Sheikh',
  role: 'teacher',
} as Me;

function renderWith(ui: React.ReactNode, answers: Parameters<typeof fakeApi>[0], me: Me) {
  const api = fakeApi(answers, me);
  render(
    <Providers client={api.client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Providers>
  );
  return api;
}

const row = (over: Partial<Row> = {}): Row => ({
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
  ...over,
});
const report = (rows: Row[]): SpeechAgreementReport => ({
  recordings: 12,
  students: 3,
  gate: { occurrences: 200, agreement: 0.9 },
  rows,
});

beforeEach(() => localStorage.setItem('arda.language', 'de'));

describe('the opt-in for measuring the speech check (S6.2)', () => {
  it('is off until the student allows it, and can be taken back', async () => {
    const { calls } = renderWith(
      <EvaluationOptIn />,
      {
        'GET /api/v1/speech/evaluation': Response.json({
          available: true,
          optedIn: false,
          since: null,
        }),
        'PUT /api/v1/speech/evaluation': () => new Response(null, { status: 204 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    expect(
      await screen.findByRole('heading', { name: 'Automatische Prüfung messen' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Nicht erlaubt.');
    // What it means is said before the button, not after.
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Erlauben' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/Erlaubt seit/)
    );
    await user.click(screen.getByRole('button', { name: 'Zurücknehmen' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Nicht erlaubt.')
    );
    expect(calls.filter((c) => c.method === 'PUT').map((c) => c.body)).toEqual([
      { optedIn: true },
      { optedIn: false },
    ]);
  });

  it('is not offered where no speech check runs', async () => {
    const { calls } = renderWith(
      <EvaluationOptIn />,
      {
        'GET /api/v1/speech/evaluation': Response.json({
          available: false,
          optedIn: false,
          since: null,
        }),
      },
      STUDENT
    );
    await waitFor(() =>
      expect(calls.some((c) => c.path.endsWith('/evaluation'))).toBe(true)
    );
    expect(screen.queryByText('Automatische Prüfung messen')).toBeNull();
  });

  it('can still be taken back after the check was switched off', async () => {
    renderWith(
      <EvaluationOptIn />,
      {
        'GET /api/v1/speech/evaluation': Response.json({
          available: false,
          optedIn: true,
          since: '2026-11-16T08:00:00.000Z',
        }),
      },
      STUDENT
    );
    expect(
      await screen.findByRole('button', { name: 'Zurücknehmen' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Erlaubt seit/);
  });

  it('says so when the change is refused and keeps what was', async () => {
    renderWith(
      <EvaluationOptIn />,
      {
        'GET /api/v1/speech/evaluation': Response.json({
          available: true,
          optedIn: false,
          since: null,
        }),
        'PUT /api/v1/speech/evaluation': () =>
          Response.json({ error: 'speech_unavailable' }, { status: 409 }),
      },
      STUDENT
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Erlauben' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Nicht erlaubt.');
  });
});

describe('the speech check against the teacher (S6.2)', () => {
  it('lists per rule the words compared, the share and both kinds of difference', async () => {
    renderWith(
      <SpeechAgreement halaqaId={HALAQA} />,
      {
        [`GET /api/v1/halaqat/${HALAQA}/speech/agreement`]: Response.json(
          report([
            row(),
            row({
              topic: 'madd',
              bothCheck: 20,
              bothGood: 170,
              falseAlarms: 6,
              misses: 4,
              occurrences: 200,
              agreement: 0.95,
              reachesGate: true,
            }),
            row({
              topic: 'qalqala',
              occurrences: 0,
              agreement: null,
              bothCheck: 0,
              bothGood: 0,
              falseAlarms: 0,
              misses: 0,
            }),
          ])
        ),
      },
      TEACHER
    );
    expect(
      await screen.findByRole('heading', { name: 'Automatische Prüfung und du' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Aus 12 beantworteten Aufnahmen von 3 Schüler·innen/)
    ).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    const cells = (r: HTMLElement) =>
      within(r)
        .getAllByRole('cell')
        .map((c) => c.textContent);
    expect(within(rows[0]!).getByRole('rowheader')).toHaveTextContent('Ghunna');
    expect(cells(rows[0]!)).toEqual(['10', '80 %', '1', '1']);
    expect(cells(rows[1]!)).toEqual(['200', '95 %', '6', '4']);
    // The gate is named with the rule, in words.
    expect(within(rows[1]!).getByRole('rowheader')).toHaveTextContent(
      'Schwelle erreicht'
    );
    expect(within(rows[0]!).getByRole('rowheader')).not.toHaveTextContent('Schwelle');
    // Nothing compared yet: no share is claimed.
    expect(cells(rows[2]!)).toEqual(['0', '–', '0', '0']);
    expect(screen.getByText(/mindestens 200 Wörter .* 90 %/)).toBeInTheDocument();
  });

  it('keeps the models apart and names them', async () => {
    renderWith(
      <SpeechAgreement halaqaId={HALAQA} />,
      {
        [`GET /api/v1/halaqat/${HALAQA}/speech/agreement`]: Response.json(
          report([row({ model: 'm1' }), row({ model: 'm2' })])
        ),
      },
      TEACHER
    );
    expect(await screen.findByText('m1')).toBeInTheDocument();
    expect(screen.getByText('m2')).toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(2);
  });

  it('shows nothing before there is anything to compare, or when the load fails', async () => {
    const empty = renderWith(
      <SpeechAgreement halaqaId={HALAQA} />,
      {
        [`GET /api/v1/halaqat/${HALAQA}/speech/agreement`]: Response.json(report([])),
      },
      TEACHER
    );
    await waitFor(() =>
      expect(empty.calls.some((c) => c.path.endsWith('/agreement'))).toBe(true)
    );
    expect(screen.queryByText('Automatische Prüfung und du')).toBeNull();
  });
});
