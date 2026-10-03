import { IZHAR_EXCEPTIONS, SHEET_EXAMPLES } from '@arda/tajweed';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UNIT2_CARDS, cardName } from '@/content/unit2';
import {
  WORD_POOL,
  letterQuestion,
  questionOf,
  shuffle,
  sortRound,
  whichRuleRound,
} from '@/games/questions';
import { ReviewSession } from '@/modules/games/ReviewSession';
import { SortLetters } from '@/modules/games/SortLetters';
import { WhichRule } from '@/modules/games/WhichRule';
import { Path } from '@/modules/path/Path';
import { DUE_REFRESH_MS, ReviewProvider } from '@/review/ReviewProvider';
import { MemoryReviewStore } from '@/review/store';
import type { Letter } from '@arda/tajweed';
import { fakeApi, Providers } from './render';

/** A small seeded generator, so rounds are the same in every run. */
function seeded(seed = 7) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('question pools', () => {
  it('ask every nūn sākina word of the sheet and the four exceptions, but never give iqlāb away', () => {
    const nun = new Set(['izhar', 'idgham-ghunna', 'idgham-no-ghunna', 'iqlab', 'ikhfa']);
    const texts = [...SHEET_EXAMPLES, ...IZHAR_EXCEPTIONS]
      .filter((e) => nun.has(e.expectedRule))
      .map((e) => e.text)
      .filter((text) => !text.includes('ۢ'));
    expect(WORD_POOL.map((q) => q.prompt).sort()).toEqual(texts.sort());
    expect(WORD_POOL.find((q) => q.prompt === 'صِنْوَانٌ')?.answer).toBe('izhar');
    expect(WORD_POOL.find((q) => q.prompt === 'غَفُورٌ رَحِيمٌ')?.answer).toBe('idgham');
  });

  it('play ten different words a round', () => {
    const round = whichRuleRound(seeded());
    expect(new Set(round.map((q) => q.id)).size).toBe(10);
  });

  it('sort all 28 letters, 6 + 6 + 1 + 15', () => {
    const round = sortRound(seeded());
    expect(new Set(round.map((q) => q.prompt)).size).toBe(28);
    const count = (card: string) => round.filter((q) => q.answer === card).length;
    expect(UNIT2_CARDS.map(count)).toEqual([6, 6, 1, 15]);
  });

  it('shuffle deterministically with an injected random source', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(1))).toEqual(
      shuffle([1, 2, 3, 4, 5], seeded(1))
    );
  });

  it('turn stored cards back into questions, and drop cards whose content is gone', () => {
    expect(questionOf(letterQuestion('ب'))?.answer).toBe('iqlab');
    expect(questionOf(WORD_POOL[0]!)?.prompt).toBe(WORD_POOL[0]!.prompt);
    expect(
      questionOf({
        id: 'which-rule:gone',
        kind: 'which-rule',
        prompt: 'gone',
        answer: 'izhar',
      })
    ).toBeUndefined();
  });
});

function renderGame(path: string, store: MemoryReviewStore, children: ReactNode) {
  const { client } = fakeApi({});
  return render(
    <Providers client={client}>
      <ReviewProvider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path} element={children} />
            <Route path="/pfad" element={<Path />} />
            <Route path="/pfad/wiederholen" element={<ReviewSession />} />
          </Routes>
        </MemoryRouter>
      </ReviewProvider>
    </Providers>
  );
}

describe('Which rule?', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('turns a mistake into a review card that the review session asks again', async () => {
    const store = new MemoryReviewStore();
    const random = seeded(3);
    const first = whichRuleRound(seeded(3))[0]!;
    renderGame('/pfad/2/spiel/welche-regel', store, <WhichRule random={random} />);

    // The question does not give the rule away: one neutral focus, no colour.
    expect(document.querySelectorAll('.tj-focus')).toHaveLength(1);
    expect(document.querySelectorAll('.tj[data-rule]')).toHaveLength(0);

    const wrong = UNIT2_CARDS.find((card) => card !== first.answer)!;
    await userEvent.click(screen.getByRole('button', { name: cardName(wrong, 'de') }));
    expect(screen.getByText('prüfen')).toBeInTheDocument();
    expect(screen.getByText('Kommt in deine Wiederholung.')).toBeInTheDocument();
    expect(store.load().cards[first.id]).toMatchObject({ box: 1, answer: first.answer });

    // Answer the other nine right, then open the review from the results.
    const round = whichRuleRound(seeded(3));
    for (const question of round) {
      if (question !== round[0]) {
        await userEvent.click(
          screen.getByRole('button', { name: cardName(question.answer, 'de') })
        );
        expect(screen.getByText('gut')).toBeInTheDocument();
      }
      await userEvent.click(screen.getByRole('button', { name: /Weiter|Auswerten/ }));
    }
    expect(screen.getByRole('heading', { name: '9 von 10 richtig' })).toBeInTheDocument();
    expect(screen.getByText('1 Karte kommt in deine Wiederholung.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: '1 Karte wiederholen' }));
    expect(screen.getByRole('heading', { name: 'Wiederholen' })).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: cardName(first.answer, 'de') })
    );
    expect(store.load().cards[first.id]).toMatchObject({ box: 2 });
  });
});

describe('Sort the 28', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('moves on after each right answer and keeps the best time', async () => {
    const store = new MemoryReviewStore();
    let now = 0;
    const clock = () => now;
    renderGame(
      '/pfad/2/spiel/sortieren',
      store,
      <SortLetters random={seeded(5)} clock={clock} />
    );
    for (let i = 0; i < 28; i++) {
      const letter = document.querySelector('.paper .quran')!.textContent as Letter;
      now += 1500;
      await userEvent.click(
        screen.getByRole('button', {
          name: cardName(letterQuestion(letter).answer, 'de'),
        })
      );
    }
    expect(
      screen.getByRole('heading', { name: '28 von 28 richtig' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Neue Bestzeit!/)).toBeInTheDocument();
    expect(store.load().bestTimes['sort-28']).toBe(42_000);
    expect(store.load().cards).toEqual({});
  });
});

describe('the review session', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('starts again with what is still due, from its own results', async () => {
    const store = new MemoryReviewStore();
    const card = letterQuestion('ب');
    store.save({
      cards: { [card.id]: { ...card, box: 1, due: 0, lapses: 1, updatedAt: 0 } },
      bestTimes: {},
    });
    renderGame('/pfad/wiederholen', store, <ReviewSession />);
    await userEvent.click(screen.getByRole('button', { name: 'Ikhfāʾ' }));
    await userEvent.click(screen.getByRole('button', { name: 'Auswerten' }));
    expect(screen.getByRole('heading', { name: '0 von 1 richtig' })).toBeInTheDocument();
    // Inside the review the results offer "again", not a link to the page itself.
    expect(screen.queryByRole('link', { name: /wiederholen/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Nochmal' }));
    expect(screen.getByText('ب')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Iqlāb' }));
    expect(store.load().cards[card.id]).toMatchObject({ box: 2 });
  });
});

describe('the due list', () => {
  afterEach(() => vi.useRealTimers());

  it('follows the clock while the app stays open', () => {
    vi.useFakeTimers();
    localStorage.setItem('arda.language', 'de');
    let now = 0;
    const store = new MemoryReviewStore();
    const card = letterQuestion('ب');
    store.save({
      cards: { [card.id]: { ...card, box: 2, due: 1000, lapses: 1, updatedAt: 0 } },
      bestTimes: {},
    });
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <ReviewProvider store={store} now={() => now}>
          <MemoryRouter initialEntries={['/pfad']}>
            <Path />
          </MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
    expect(screen.getByText('Gerade ist nichts fällig. Gut so!')).toBeInTheDocument();
    now = 2000;
    act(() => vi.advanceTimersByTime(DUE_REFRESH_MS));
    expect(screen.getByRole('link', { name: '1 Karte wiederholen' })).toBeInTheDocument();
  });
});

describe('an empty review session', () => {
  afterEach(() => vi.useRealTimers());

  it('starts once a card falls due, without leaving the page', () => {
    vi.useFakeTimers();
    localStorage.setItem('arda.language', 'de');
    let now = 0;
    const store = new MemoryReviewStore();
    const card = letterQuestion('ب');
    store.save({
      cards: { [card.id]: { ...card, box: 2, due: 1000, lapses: 1, updatedAt: 0 } },
      bestTimes: {},
    });
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <ReviewProvider store={store} now={() => now}>
          <MemoryRouter initialEntries={['/pfad/wiederholen']}>
            <ReviewSession />
          </MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
    expect(screen.getByText('Gerade ist nichts fällig. Gut so!')).toBeInTheDocument();
    now = 2000;
    act(() => vi.advanceTimersByTime(DUE_REFRESH_MS));
    expect(screen.getByText('ب')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });
});
