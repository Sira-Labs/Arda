import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlanCard } from '@/modules/plan/PlanCard';
import { StudyPlan } from '@/modules/plan/StudyPlan';
import { ReviewProvider } from '@/review/ReviewProvider';
import {
  mergeStates,
  parseState,
  sameDeck,
  MemoryReviewStore,
  type ReviewState,
  type StudyNote,
} from '@/review/store';
import { fakeApi, Providers } from './render';

const NOW = Date.UTC(2026, 9, 10, 12);

const note = (id: string, over: Partial<StudyNote> = {}): StudyNote => ({
  id,
  kind: 'learn',
  text: `Notiz ${id}`,
  range: null,
  pages: null,
  done: false,
  deleted: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

function renderPlan(store: MemoryReviewStore, ui = <StudyPlan />) {
  let time = NOW;
  render(
    <Providers client={fakeApi({}).client}>
      <ReviewProvider store={store} now={() => (time += 1000)}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ReviewProvider>
    </Providers>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
});

describe('Mein Lernplan', () => {
  it('notes what to learn with its pages, marks it learnt, changes and deletes it', async () => {
    const store = new MemoryReviewStore();
    renderPlan(store);
    const user = userEvent.setup();
    const form = screen.getByRole('heading', { name: 'Neue Notiz' }).closest('section')!;
    const add = within(form).getByRole('button', { name: 'Notieren' });
    expect(add).toBeDisabled();
    await user.type(
      within(form).getByRole('textbox', { name: 'Notiz' }),
      'Zwei Seiten Baqara'
    );
    await user.selectOptions(
      within(form).getByRole('combobox', { name: 'Wo im Qurʾān (optional)' }),
      'pages'
    );
    const pageFrom = within(form).getByRole('spinbutton', { name: 'von Seite' });
    await user.clear(pageFrom);
    await user.type(pageFrom, '8');
    const pageTo = within(form).getByRole('spinbutton', { name: 'bis Seite' });
    await user.clear(pageTo);
    await user.type(pageTo, '9');
    await user.click(add);

    const learn = screen.getByRole('heading', { name: 'Lernen' }).closest('section')!;
    const item = within(learn).getByText('Zwei Seiten Baqara').closest('li')!;
    expect(within(item).getByText(/^Seiten 8–9/)).toBeInTheDocument();
    expect(within(item).getByRole('link', { name: 'Im Muṣḥaf öffnen' })).toHaveAttribute(
      'href',
      '/mushaf/seite/8?layout=indopak-15&seiten=8-9'
    );
    const [stored] = Object.values(store.load().notes ?? {});
    expect(stored).toMatchObject({
      kind: 'learn',
      text: 'Zwei Seiten Baqara',
      range: null,
      pages: { layout: 'indopak-15', from: 8, to: 9 },
      done: false,
    });
    // The form is empty again for the next note.
    expect(within(form).getByRole('textbox', { name: 'Notiz' })).toHaveValue('');

    await user.click(within(item).getByRole('button', { name: 'Gelernt' }));
    expect(within(item).getByRole('button', { name: '✓ Gelernt' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(store.load().notes?.[stored!.id]?.done).toBe(true);

    await user.click(within(item).getByRole('button', { name: 'Bearbeiten' }));
    const text = within(learn).getByRole('textbox', { name: 'Notiz' });
    await user.clear(text);
    await user.type(text, 'Drei Seiten Baqara');
    await user.click(within(learn).getByRole('button', { name: 'Speichern' }));
    expect(within(learn).getByText('Drei Seiten Baqara')).toBeInTheDocument();
    expect(store.load().notes?.[stored!.id]).toMatchObject({
      text: 'Drei Seiten Baqara',
      done: true,
      createdAt: stored!.createdAt,
    });

    await user.click(within(learn).getByRole('button', { name: 'Löschen' }));
    expect(within(learn).queryByText('Drei Seiten Baqara')).toBeNull();
    expect(
      within(learn).getByText('Noch nichts geplant. Was willst du als Nächstes lernen?')
    ).toBeInTheDocument();
    // Kept as a tombstone, without what it said, so the deletion syncs.
    expect(store.load().notes?.[stored!.id]).toMatchObject({
      deleted: true,
      text: '',
      pages: null,
    });
  });

  it('notes a difficulty on āyāt, under its own heading', async () => {
    const store = new MemoryReviewStore();
    renderPlan(store);
    const user = userEvent.setup();
    const form = screen.getByRole('heading', { name: 'Neue Notiz' }).closest('section')!;
    await user.click(within(form).getByRole('button', { name: 'Schwierigkeiten' }));
    await user.type(
      within(form).getByRole('textbox', { name: 'Notiz' }),
      'Das ḍād klingt wie dāl'
    );
    await user.selectOptions(
      within(form).getByRole('combobox', { name: 'Wo im Qurʾān (optional)' }),
      'ayat'
    );
    await user.selectOptions(within(form).getByRole('combobox', { name: 'Sūra' }), '1');
    await user.click(within(form).getByRole('button', { name: 'Notieren' }));
    const hard = screen
      .getByRole('heading', { name: 'Schwierigkeiten' })
      .closest('section')!;
    const item = within(hard).getByText('Das ḍād klingt wie dāl').closest('li')!;
    expect(item).toHaveTextContent('Sūra 1');
    expect(within(item).getByText('الفاتحة')).toHaveAttribute('lang', 'ar');
    expect(within(item).getByRole('link', { name: 'Im Muṣḥaf öffnen' })).toHaveAttribute(
      'href',
      '/mushaf/1?von=1&bis=5'
    );
    expect(within(item).getByRole('button', { name: 'Gelöst' })).toBeInTheDocument();
  });

  it('shows the open plans on Today, not the difficulties or what is done', () => {
    const store = new MemoryReviewStore({
      cards: {},
      bestTimes: {},
      notes: {
        a: note('a', { text: 'Zwei Seiten Baqara', createdAt: NOW - 3 }),
        b: note('b', { kind: 'review', text: 'al-Mulk', createdAt: NOW - 2 }),
        c: note('c', { kind: 'difficulty', text: 'Qalqala' }),
        d: note('d', { text: 'Schon gelernt', done: true }),
        e: note('e', { text: '', deleted: true }),
      },
    });
    renderPlan(store, <PlanCard />);
    const card = screen
      .getByRole('heading', { name: 'Mein Lernplan' })
      .closest('section')!;
    const items = within(card).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Lernen Zwei Seiten Baqara',
      'Wiederholen al-Mulk',
    ]);
    expect(within(card).getByRole('link', { name: 'Lernplan öffnen' })).toHaveAttribute(
      'href',
      '/lernplan'
    );
  });

  it('invites a first note on Today when there is none', () => {
    renderPlan(new MemoryReviewStore(), <PlanCard />);
    expect(
      screen.getByText(
        'Notiere, was du lernen und wiederholen willst und was dir schwerfiel.'
      )
    ).toBeInTheDocument();
  });
});

describe('notes in the stored deck', () => {
  const deck = (notes: StudyNote[]): ReviewState => ({
    cards: {},
    bestTimes: {},
    notes: Object.fromEntries(notes.map((n) => [n.id, n])),
  });

  it('merge by the later version, a tombstone included', () => {
    const merged = mergeStates(
      deck([note('a', { updatedAt: NOW }), note('b')]),
      deck([
        note('a', { text: 'älter', updatedAt: NOW - 1 }),
        note('b', { text: '', deleted: true, updatedAt: NOW + 1 }),
      ])
    );
    expect(merged.notes?.a?.text).toBe('Notiz a');
    expect(merged.notes?.b?.deleted).toBe(true);
    expect(sameDeck(merged, deck([note('a'), note('b')]))).toBe(false);
    expect(sameDeck(merged, structuredClone(merged))).toBe(true);
  });

  it('drop a damaged note and keep the rest', () => {
    const state = parseState({
      cards: {},
      bestTimes: {},
      notes: {
        a: note('a'),
        b: { ...note('b'), kind: 'todo' },
        c: { ...note('c'), range: { sura: 112, from: 1, to: 9 } },
        d: { ...note('x') },
        e: { ...note('e'), text: 'x'.repeat(501) },
      },
    });
    expect(Object.keys(state?.notes ?? {})).toEqual(['a']);
  });
});
