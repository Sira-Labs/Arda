import { IZHAR_EXCEPTIONS, SHEET_EXAMPLES } from '@arda/tajweed';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UNIT2_CARDS, cardName } from '@/content/units';
import {
  MADD_POOL,
  UNIT3_POOL,
  WORD_POOL,
  letterQuestion,
  maddRound,
  optionsOf,
  qalqalaQuestion,
  qalqalaRound,
  questionOf,
  shuffle,
  sortRound,
  unit3Round,
  unitTest,
  whichRuleRound,
} from '@/games/questions';
import { MaddLength } from '@/modules/games/MaddLength';
import { QalqalaLetters } from '@/modules/games/QalqalaLetters';
import { WhichRule3 } from '@/modules/games/WhichRule3';
import { ReviewSession } from '@/modules/games/ReviewSession';
import { SortLetters } from '@/modules/games/SortLetters';
import { UnitTest } from '@/modules/games/UnitTest';
import { WhichRule } from '@/modules/games/WhichRule';
import { Path } from '@/modules/path/Path';
import { DUE_REFRESH_MS, ReviewProvider } from '@/review/ReviewProvider';
import { LocalReviewStore, MemoryReviewStore, STORAGE_KEY } from '@/review/store';
import { isQalqalaLetter, type Letter } from '@arda/tajweed';
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

describe('the games of units 3 and 4 (S5.1)', () => {
  it('ask ten words of unit 3, every one with the four cards of unit 3 to choose from', () => {
    expect(UNIT3_POOL).toHaveLength(10);
    expect(new Set(UNIT3_POOL.map((q) => q.answer))).toEqual(
      new Set(['ghunna', 'ikhfa-shafawi', 'idgham-shafawi', 'izhar-shafawi'])
    );
    expect(unit3Round(seeded())).toHaveLength(10);
    for (const question of UNIT3_POOL) {
      expect(optionsOf(question)).toEqual([
        'ghunna',
        'ikhfa-shafawi',
        'idgham-shafawi',
        'izhar-shafawi',
      ]);
    }
    // Unit 2 keeps its own words.
    expect(WORD_POOL.some((q) => q.unit !== 2)).toBe(false);
  });

  it('sort all 28 letters into quṭbu jadd and the rest', () => {
    const round = qalqalaRound(seeded());
    expect(round).toHaveLength(28);
    expect(
      round
        .filter((q) => q.answer === 'qalqala')
        .map((q) => q.prompt)
        .sort()
    ).toEqual(['ب', 'ج', 'د', 'ط', 'ق'].sort());
    expect(optionsOf(round[0]!)).toEqual(['qalqala', 'no-qalqala']);
  });

  it('turn their stored cards back into questions', () => {
    expect(questionOf(qalqalaQuestion('ق'))?.answer).toBe('qalqala');
    expect(questionOf(qalqalaQuestion('س'))?.answer).toBe('no-qalqala');
    expect(questionOf(UNIT3_POOL[0]!)).toMatchObject({ kind: 'which-rule', unit: 3 });
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
    // The round goes into the activity log (ADR-0023): 9 × 2 + 5 XP.
    expect(screen.getByText('+23 XP')).toBeInTheDocument();
    expect(Object.values(store.load().activity ?? {})).toEqual([
      expect.objectContaining({ kind: 'which-rule', ref: '', right: 9, total: 10 }),
    ]);

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
    // A perfect round: 28 × 2 + 5 + 5 XP.
    expect(screen.getByText('+66 XP')).toBeInTheDocument();
    expect(Object.values(store.load().activity ?? {})).toEqual([
      expect.objectContaining({ kind: 'sort-28', right: 28, total: 28 }),
    ]);
  });
});

describe('Which rule? of unit 3', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('offers the four cards of unit 3 and logs the round', async () => {
    const store = new MemoryReviewStore();
    renderGame('/pfad/3/spiel/welche-regel', store, <WhichRule3 random={seeded(2)} />);
    expect(screen.getByText('Einheit 3 · Üben')).toBeInTheDocument();
    expect(
      screen.getByText('Welche Regel gilt für das markierte Mīm oder Nūn?')
    ).toBeInTheDocument();
    const options = screen.getByRole('group', { name: 'Regeln' });
    expect(
      Array.from(options.querySelectorAll('button')).map((b) => b.textContent)
    ).toEqual(['Ghunna', 'Ikhfāʾ shafawī', 'Idghām shafawī', 'Iẓhār shafawī']);
    for (const question of unit3Round(seeded(2))) {
      await userEvent.click(
        screen.getByRole('button', { name: cardName(question.answer, 'de') })
      );
      // A shadda says why, the mīm says which letter follows.
      expect(
        screen.getByText(
          question.answer === 'ghunna' ? /Nūn oder Mīm mit Shadda/ : /es folgt/
        )
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /Weiter|Auswerten/ }));
    }
    expect(
      screen.getByRole('heading', { name: '10 von 10 richtig' })
    ).toBeInTheDocument();
    expect(Object.values(store.load().activity ?? {})).toEqual([
      expect.objectContaining({ kind: 'which-rule-3', right: 10, total: 10 }),
    ]);
  });
});

describe('the qalqala letters', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('asks every letter and turns a mistake into a review card', async () => {
    const store = new MemoryReviewStore();
    renderGame('/pfad/4/spiel/buchstaben', store, <QalqalaLetters random={seeded(4)} />);
    const round = qalqalaRound(seeded(4));
    for (const [i, question] of round.entries()) {
      // The first letter is answered wrongly on purpose.
      const right = question.answer === 'qalqala' ? 'Qalqala' : 'keine Qalqala';
      const wrong = right === 'Qalqala' ? 'keine Qalqala' : 'Qalqala';
      await userEvent.click(
        screen.getByRole('button', { name: i === 0 ? wrong : right })
      );
      if (i === 0) {
        expect(
          screen.getByText(
            question.answer === 'qalqala'
              ? /gehört zu quṭbu jadd/
              : /gehört nicht zu quṭbu jadd/
          )
        ).toBeInTheDocument();
      }
      await userEvent.click(screen.getByRole('button', { name: /Weiter|Auswerten/ }));
    }
    expect(
      screen.getByRole('heading', { name: '27 von 28 richtig' })
    ).toBeInTheDocument();
    expect(store.load().cards[`qalqala:${round[0]!.prompt}`]).toMatchObject({
      kind: 'qalqala-letter',
      answer: round[0]!.answer,
      box: 1,
    });
    expect(Object.values(store.load().activity ?? {})).toEqual([
      expect.objectContaining({ kind: 'qalqala-letters', right: 27, total: 28 }),
    ]);
  });
});

describe('How long? (unit 5)', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('asks four words of each madd, with three lengths to choose from', () => {
    expect(MADD_POOL).toHaveLength(16);
    for (const card of ['madd-tabii', 'madd-muttasil', 'madd-munfasil', 'madd-lazim']) {
      expect(
        MADD_POOL.filter((q) => q.card === card),
        card
      ).toHaveLength(4);
    }
    expect(optionsOf(MADD_POOL[0]!)).toEqual(['two-counts', 'four-counts', 'six-counts']);
    const round = maddRound(seeded());
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.id)).size).toBe(10);
    // The question marks the madd letter itself.
    const lazim = MADD_POOL.find((q) => q.card === 'madd-lazim')!;
    expect(lazim.prompt.slice(lazim.focus.start, lazim.focus.carrierEnd)).toBe('ا\u0653');
    expect(questionOf(lazim)).toEqual(lazim);
  });

  it('says why after an answer and turns a mistake into a review card', async () => {
    const store = new MemoryReviewStore();
    renderGame('/pfad/5/spiel/wie-lang', store, <MaddLength random={seeded(4)} />);
    expect(screen.getByRole('heading', { name: 'Wie lang?' })).toBeInTheDocument();
    expect(
      screen.getByText('Wie lange dehnst du den markierten Buchstaben?')
    ).toBeInTheDocument();
    const round = maddRound(seeded(4));
    const names = {
      'two-counts': '2 Zählzeiten',
      'four-counts': '4–5 Zählzeiten',
      'six-counts': '6 Zählzeiten',
    } as const;
    const why = {
      'madd-tabii': 'Madd ṭabīʿī: danach kein Hamza, keine Shadda, kein Sukūn',
      'madd-muttasil': 'Madd muttaṣil: Hamza im selben Wort',
      'madd-munfasil': 'Madd munfaṣil: Hamza am Anfang des nächsten Wortes',
      'madd-lazim': 'Madd lāzim: Shadda oder Sukūn im selben Wort',
    } as const;
    for (const [i, question] of round.entries()) {
      // The first word is answered wrongly on purpose.
      const wrong = question.answer === 'six-counts' ? 'two-counts' : 'six-counts';
      await userEvent.click(
        screen.getByRole('button', { name: names[i === 0 ? wrong : question.answer] })
      );
      expect(screen.getByRole('status')).toHaveTextContent(why[question.card]);
      await userEvent.click(screen.getByRole('button', { name: /Weiter|Auswerten/ }));
    }
    expect(screen.getByRole('heading', { name: '9 von 10 richtig' })).toBeInTheDocument();
    expect(store.load().cards[round[0]!.id]).toMatchObject({
      kind: 'madd-length',
      answer: round[0]!.answer,
      box: 1,
    });
    expect(Object.values(store.load().activity ?? {})).toEqual([
      expect.objectContaining({ kind: 'madd-length', right: 9, total: 10 }),
    ]);
  });
});

describe('unit tests (ADR-0024)', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('ask ten questions from what each unit taught', () => {
    const two = unitTest(2, seeded());
    expect(two).toHaveLength(10);
    expect(two.filter((q) => q.kind === 'which-rule')).toHaveLength(6);
    expect(two.filter((q) => q.kind === 'sort-letter')).toHaveLength(4);
    expect(new Set(two.map((q) => q.id)).size).toBe(10);
    const three = unitTest(3, seeded());
    expect(three).toHaveLength(10);
    expect(three.every((q) => q.kind === 'which-rule' && q.unit === 3)).toBe(true);
    const four = unitTest(4, seeded());
    expect(four).toHaveLength(10);
    // All five quṭbu jadd letters, among five others: "qalqala" every time cannot pass.
    expect(four.filter((q) => q.answer === 'qalqala')).toHaveLength(5);
    expect(new Set(four.map((q) => q.prompt)).size).toBe(10);
    const five = unitTest(5, seeded());
    expect(five).toHaveLength(10);
    expect(new Set(five.map((q) => q.id)).size).toBe(10);
    // Three of two counts, four of four to five, three of six: no single length passes.
    const lengths = five.map((q) => q.answer);
    expect(lengths.filter((a) => a === 'two-counts')).toHaveLength(3);
    expect(lengths.filter((a) => a === 'four-counts')).toHaveLength(4);
    expect(lengths.filter((a) => a === 'six-counts')).toHaveLength(3);
  });

  /** Answers the current letter question, rightly or not. */
  const answerLetter = async (right: boolean) => {
    const letter = document.querySelector('.paper .quran')!.textContent as Letter;
    const bounces = isQalqalaLetter(letter);
    await userEvent.click(
      screen.getByRole('button', {
        name: bounces === right ? 'Qalqala' : 'keine Qalqala',
      })
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter|Auswerten/ }));
  };

  it('is passed with eight of ten, logged for its unit and marked on the path', async () => {
    const store = new MemoryReviewStore();
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <ReviewProvider store={store}>
          <MemoryRouter initialEntries={['/pfad/4/test']}>
            <Routes>
              <Route path="/pfad/:unit/test" element={<UnitTest random={seeded(4)} />} />
              <Route path="/pfad" element={<Path />} />
            </Routes>
          </MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
    expect(screen.getByRole('heading', { name: 'Einheitentest' })).toBeInTheDocument();
    // Seven of ten: not yet.
    for (let i = 0; i < 10; i++) await answerLetter(i >= 3);
    expect(
      screen.getByText(/Noch nicht bestanden: Es braucht 8 von 10/)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Nochmal' }));
    for (let i = 0; i < 10; i++) await answerLetter(i >= 2);
    // Unit 4 passed: unit 5 comes next.
    expect(screen.getByText('Bestanden – weiter mit Einheit 5.')).toBeInTheDocument();
    expect(
      Object.values(store.load().activity ?? {}).map((e) => [e.kind, e.ref, e.right])
    ).toEqual([
      ['unit-test', 'unit-4', 7],
      ['unit-test', 'unit-4', 8],
    ]);
    await userEvent.click(screen.getByRole('link', { name: 'Zur Einheit' }));
    expect(
      screen.getByRole('heading', { name: /Einheit 4 · Qalqala/ })
    ).toHaveTextContent('✓ Bestanden');
    // Unit 3 is still open and recommended after unit 2's test; nothing is locked.
    expect(
      screen.getByText('Empfohlen nach dem Test von Einheit 2.')
    ).toBeInTheDocument();
    expect(document.querySelector('a[href="/pfad/3/ghunna"]')).not.toBeNull();
  });

  /** Answers the current "How long?" question rightly, from the word it shows. */
  const answerMadd = async () => {
    const word = document.querySelector('.paper .quran')!.textContent;
    const question = MADD_POOL.find((q) => q.prompt === word)!;
    const name = { 'two-counts': '2', 'four-counts': '4–5', 'six-counts': '6' }[
      question.answer
    ];
    await userEvent.click(screen.getByRole('button', { name: `${name} Zählzeiten` }));
    await userEvent.click(screen.getByRole('button', { name: /Weiter|Auswerten/ }));
  };

  it('says every unit is done only when the other tests are passed too', async () => {
    const passed = (unit: number, n: number) => ({
      id: `00000000-0000-4000-8000-00000000000${n}`,
      kind: 'unit-test' as const,
      ref: `unit-${unit}`,
      at: Date.now() - 1000,
      right: 9,
      total: 10,
    });
    const store = new MemoryReviewStore({
      cards: {},
      bestTimes: {},
      activity: {
        [passed(1, 3).id]: passed(1, 3),
        [passed(2, 1).id]: passed(2, 1),
        [passed(3, 2).id]: passed(3, 2),
        [passed(4, 4).id]: passed(4, 4),
      },
    });
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <ReviewProvider store={store}>
          <MemoryRouter initialEntries={['/pfad/5/test']}>
            <Routes>
              <Route path="/pfad/:unit/test" element={<UnitTest random={seeded(4)} />} />
            </Routes>
          </MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
    for (let i = 0; i < 10; i++) await answerMadd();
    expect(screen.getByText('Bestanden – alle Einheiten geschafft.')).toBeInTheDocument();
  });

  it('sends an unknown unit back to the path', () => {
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <MemoryRouter initialEntries={['/pfad/9/test']}>
          <Routes>
            <Route path="/pfad/:unit/test" element={<UnitTest />} />
            <Route path="/pfad" element={<p>Pfad</p>} />
          </Routes>
        </MemoryRouter>
      </Providers>
    );
    expect(screen.getByText('Pfad')).toBeInTheDocument();
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

describe('two tabs', () => {
  it('show what the other tab practised', () => {
    localStorage.setItem('arda.language', 'de');
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <ReviewProvider store={new LocalReviewStore(storage)}>
          <MemoryRouter initialEntries={['/pfad']}>
            <Path />
          </MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
    expect(screen.getByText('Gerade ist nichts fällig. Gut so!')).toBeInTheDocument();
    // The other tab saves a mistake; this tab hears of it through the storage event.
    const card = letterQuestion('ب');
    data.set(
      STORAGE_KEY,
      JSON.stringify({
        cards: { [card.id]: { ...card, box: 1, due: 0, lapses: 1, updatedAt: 1 } },
        bestTimes: {},
      })
    );
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });
    expect(screen.getByRole('link', { name: '1 Karte wiederholen' })).toBeInTheDocument();
  });
});
