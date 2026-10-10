import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { RuleByRule } from '@/modules/rules/RuleByRule';
import type { Me, Struggle } from '@/services/auth';
import { fakeApi, Providers } from './render';

const HALAQA = '11111111-1111-4111-8111-111111111111';
const TEACHER: Me = {
  id: 't',
  email: 'sheikh@example.org',
  name: 'Sheikh Ahmad',
  role: 'teacher',
  timeZone: null,
  language: 'de',
};

const struggle = (over: Partial<Struggle>): Struggle => ({
  studentId: 'a',
  studentName: 'Amina',
  topic: 'ikhfa',
  openCards: 0,
  lapses: 0,
  remarks: 0,
  marks: 0,
  lastNotedOn: null,
  ...over,
});

function renderWith(struggles: Struggle[] | Response) {
  const answer =
    struggles instanceof Response
      ? struggles
      : Response.json({ since: '2026-07-12', struggles });
  const api = fakeApi({ [`GET /api/v1/halaqat/${HALAQA}/rules`]: answer }, TEACHER);
  render(
    <Providers client={api.client}>
      <MemoryRouter>
        <RuleByRule halaqaId={HALAQA} />
      </MemoryRouter>
    </Providers>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
});

describe('rule by rule for the sheikh (T5)', () => {
  it('lists per rule who struggles, the rule most students struggle with first', async () => {
    renderWith([
      struggle({ topic: 'qalqala', openCards: 2 }),
      struggle({
        studentId: 'y',
        studentName: 'Yusuf',
        topic: 'qalqala',
        marks: 2,
        lastNotedOn: '2026-10-08',
      }),
      struggle({ topic: 'ikhfa', openCards: 2, remarks: 2, lastNotedOn: '2026-10-01' }),
      struggle({
        studentId: 'y',
        studentName: 'Yusuf',
        topic: 'ikhfa',
        remarks: 1,
        lastNotedOn: '2026-10-05',
      }),
      struggle({
        studentId: 'y',
        studentName: null,
        topic: 'makhraj',
        remarks: 1,
        lastNotedOn: '2026-10-05',
      }),
    ]);
    const section = (
      await screen.findByRole('heading', { name: 'Regel für Regel' })
    ).closest('section')!;
    const names = [...section.querySelectorAll('strong')].map((el) => el.textContent);
    expect(names).toEqual(['Ikhfāʾ', 'Qalqala', 'Aussprache der Buchstaben (Makhārij)']);
    const ikhfa = within(section).getByText('Ikhfāʾ').closest('li')!;
    expect(within(ikhfa).getByText('Amina').closest('li')).toHaveTextContent(
      /2 Fehler im Spiel offen · 2× angemerkt · zuletzt .*1\. Okt/
    );
    expect(within(ikhfa).getByText('Yusuf').closest('li')).toHaveTextContent(
      /^Yusuf1× angemerkt · zuletzt/
    );
    expect(within(ikhfa).getByRole('link', { name: 'Regelkarte' })).toHaveAttribute(
      'href',
      '/pfad/2/ikhfa'
    );
    const qalqala = within(section).getByText('Qalqala').closest('li')!;
    expect(within(qalqala).getByText('Yusuf').closest('li')).toHaveTextContent(
      /2 Wörter markiert · zuletzt/
    );
    const makhraj = within(section)
      .getByText('Aussprache der Buchstaben (Makhārij)')
      .closest('li')!;
    expect(within(makhraj).queryByRole('link')).toBeNull();
    expect(within(makhraj).getByText('ohne Namen')).toBeInTheDocument();
  });

  it('says when nobody struggles', async () => {
    renderWith([]);
    expect(
      await screen.findByText(
        'Gerade kämpft niemand mit einer Regel – oder es wurde noch nicht geübt.'
      )
    ).toBeInTheDocument();
  });

  it('says when it cannot be loaded', async () => {
    renderWith(Response.json({ error: 'forbidden' }, { status: 403 }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dafür fehlt die Berechtigung.'
    );
  });
});
