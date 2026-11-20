import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BeatSound } from '@/games/beat';
import {
  countsHeld,
  GHUNNA_COUNTS,
  HOLD_POOL,
  HOLD_ROUND_SIZE,
  holdRound,
  TEMPI,
  tempoOf,
  verdictOf,
} from '@/games/hold';
import { HoldGhunna } from '@/modules/games/HoldGhunna';
import { ReviewSession } from '@/modules/games/ReviewSession';
import { Path } from '@/modules/path/Path';
import { ReviewProvider } from '@/review/ReviewProvider';
import { MemoryReviewStore } from '@/review/store';
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

describe('holding the ghunna: the rules of the game', () => {
  it('counts the hold in beats and calls two counts good, with half a count of leeway', () => {
    expect(GHUNNA_COUNTS).toBe(2);
    expect(countsHeld(1600, 800)).toBe(2);
    expect(countsHeld(900, 600)).toBe(1.5);
    expect(countsHeld(-5, 600)).toBe(0);
    expect(countsHeld(500, 0)).toBe(0);
    expect([0, 1, 1.49].map(verdictOf)).toEqual(['short', 'short', 'short']);
    expect([1.5, 2, 2.5].map(verdictOf)).toEqual(['good', 'good', 'good']);
    expect([2.51, 3, 9].map(verdictOf)).toEqual(['long', 'long', 'long']);
  });

  it('plays the first half calmly and the second brisker', () => {
    expect(Array.from({ length: HOLD_ROUND_SIZE }, (_, i) => tempoOf(i))).toEqual([
      'calm',
      'calm',
      'calm',
      'brisk',
      'brisk',
      'brisk',
    ]);
    expect(TEMPI.brisk).toBeLessThan(TEMPI.calm);
  });

  it('asks only the checked words of the ghunna card, never the same twice in a row', () => {
    expect(HOLD_POOL.length).toBeGreaterThan(1);
    expect(
      HOLD_POOL.every((q) => q.answer === 'ghunna' && q.focus.rule === 'ghunna-mushaddad')
    ).toBe(true);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const round = holdRound(seeded(seed));
      expect(round).toHaveLength(HOLD_ROUND_SIZE);
      expect(round.every((q) => HOLD_POOL.includes(q))).toBe(true);
      round.forEach((q, i) => expect(q.id).not.toBe(round[i + 1]?.id));
      // Every word of the pool is practised before one comes back.
      expect(new Set(round.slice(0, HOLD_POOL.length).map((q) => q.id)).size).toBe(
        HOLD_POOL.length
      );
    }
  });
});

describe('Halte die Ghunna', () => {
  let now = 0;
  const clock = () => now;
  const ticks: boolean[] = [];
  const sound: BeatSound = { tick: (accent) => ticks.push(accent), close: vi.fn() };

  beforeEach(() => {
    localStorage.setItem('arda.language', 'de');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    now = 0;
    ticks.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  function mount(store = new MemoryReviewStore()) {
    const { client } = fakeApi({});
    const path = '/pfad/3/spiel/ghunna-halten';
    render(
      <Providers client={client}>
        <ReviewProvider store={store}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route
                path={path}
                element={<HoldGhunna random={seeded(3)} clock={clock} sound={sound} />}
              />
              <Route path="/pfad" element={<Path />} />
              <Route path="/pfad/wiederholen" element={<ReviewSession />} />
            </Routes>
          </MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
    return store;
  }

  const button = () => screen.getByRole('button', { name: 'Gedrückt halten und summen' });
  /** Holds the button for `ms` on the game's clock. */
  const hold = (ms: number) => {
    fireEvent.pointerDown(button());
    expect(screen.getByRole('button', { name: 'Halten …' })).toBeInTheDocument();
    now += ms;
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Halten …' }));
  };
  const onward = () =>
    fireEvent.click(screen.getByRole('button', { name: /^(Weiter|Auswerten)$/ }));

  it('explains itself first and makes no sound before the learner starts', () => {
    mount();
    expect(screen.getByText('Einheit 3 · Üben')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Halte die Ghunna' })).toBeInTheDocument();
    expect(screen.getByText(/Es wird nichts aufgenommen/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(ticks).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));
    expect(screen.getByText('1 / 6')).toBeInTheDocument();
    // The word is Qurʾān text: Arabic, right to left.
    const word = document.querySelector('.paper [lang="ar"]');
    expect(word).toHaveAttribute('dir', 'rtl');
    expect(HOLD_POOL.map((q) => q.prompt)).toContain(holdRound(seeded(3))[0]!.prompt);
  });

  it('beats in bars of four, the first marked, and falls silent on request', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));
    expect(ticks).toEqual([true]);
    act(() => vi.advanceTimersByTime(TEMPI.calm * 4));
    expect(ticks).toEqual([true, false, false, false, true]);
    expect(document.querySelectorAll('.beat-dot')).toHaveLength(4);
    expect(document.querySelectorAll('.beat-dot[data-on]')).toHaveLength(1);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Takt hören' }));
    const heard = ticks.length;
    act(() => vi.advanceTimersByTime(TEMPI.calm * 3));
    expect(ticks).toHaveLength(heard);
    // Still shown.
    expect(document.querySelectorAll('.beat-dot[data-on]')).toHaveLength(1);
  });

  it('says good for two counts, too short for one and too long for three, in words', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));
    hold(TEMPI.calm * 2);
    expect(screen.getByText('gut')).toBeInTheDocument();
    expect(
      screen.getByText(/Zwei Zählzeiten\. Gehalten: etwa 2 Zählzeiten\./)
    ).toBeInTheDocument();
    // The beat rests while the answer is read, and the button with it.
    expect(button()).toBeDisabled();
    onward();

    hold(TEMPI.calm * 1.1);
    expect(screen.getByText('prüfen')).toBeInTheDocument();
    expect(
      screen.getByText(/Zu kurz: Halte zwei ganze Schläge lang\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/etwa 1,1 Zählzeiten/)).toBeInTheDocument();
    expect(screen.getByText('Kommt in deine Wiederholung.')).toBeInTheDocument();
    onward();

    hold(TEMPI.calm * 3);
    expect(
      screen.getByText(/Zu lang: Lass nach zwei ganzen Schlägen los\./)
    ).toBeInTheDocument();
  });

  it('measures against the brisker beat in the second half, logs the round and feeds the review', () => {
    const store = mount();
    const round = holdRound(seeded(3));
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));
    expect(screen.getByText('Ruhiges Tempo')).toBeInTheDocument();
    for (let i = 0; i < 3; i++) {
      hold(TEMPI.calm * 2);
      onward();
    }
    expect(screen.getByText(/Etwas zügiger/)).toBeInTheDocument();
    // What was two counts at the calm tempo is too long now.
    hold(TEMPI.calm * 2);
    expect(screen.getByText(/Zu lang/)).toBeInTheDocument();
    onward();
    hold(TEMPI.brisk * 2);
    expect(screen.getByText('gut')).toBeInTheDocument();
    onward();
    hold(TEMPI.brisk * 2);
    onward();

    expect(screen.getByRole('heading', { name: '5 von 6 richtig' })).toBeInTheDocument();
    expect(screen.getByText('1 Karte kommt in deine Wiederholung.')).toBeInTheDocument();
    const state = store.load();
    expect(Object.values(state.activity ?? {})).toEqual([
      expect.objectContaining({ kind: 'hold-ghunna', ref: '', right: 5, total: 6 }),
    ]);
    // The word held too long is a card now, asked for its rule in the review.
    expect(Object.values(state.cards)).toEqual([
      expect.objectContaining({ id: round[3]!.id, kind: 'which-rule', answer: 'ghunna' }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Nochmal' }));
    expect(screen.getByText('1 / 6')).toBeInTheDocument();
    expect(screen.getByText('Ruhiges Tempo')).toBeInTheDocument();
  });

  it('counts a word missed twice as one card for the review', () => {
    const store = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));
    // Every try too short: six misses on a pool of four words.
    for (let i = 0; i < HOLD_ROUND_SIZE; i++) {
      hold(100);
      onward();
    }
    expect(screen.getByRole('heading', { name: '0 von 6 richtig' })).toBeInTheDocument();
    const cards = Object.values(store.load().cards);
    expect(cards).toHaveLength(HOLD_POOL.length);
    expect(
      screen.getByText(`${HOLD_POOL.length} Karten kommen in deine Wiederholung.`)
    ).toBeInTheDocument();

    // A new round counts anew.
    fireEvent.click(screen.getByRole('button', { name: 'Nochmal' }));
    hold(100);
    onward();
    for (let i = 1; i < HOLD_ROUND_SIZE; i++) {
      hold((i < 3 ? TEMPI.calm : TEMPI.brisk) * 2);
      onward();
    }
    expect(screen.getByText('1 Karte kommt in deine Wiederholung.')).toBeInTheDocument();
  });

  it('can be played with the keyboard, and by tapping instead of holding', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));
    // Space down, held (the key repeats), space up.
    fireEvent.keyDown(button(), { key: ' ' });
    now += TEMPI.calm;
    fireEvent.keyDown(screen.getByRole('button', { name: 'Halten …' }), {
      key: ' ',
      repeat: true,
    });
    now += TEMPI.calm;
    fireEvent.keyUp(screen.getByRole('button', { name: 'Halten …' }), { key: ' ' });
    expect(screen.getByText('gut')).toBeInTheDocument();
    onward();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Antippen statt halten' }));
    const tap = screen.getByRole('button', { name: 'Antippen und summen' });
    expect(tap).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(tap);
    const end = screen.getByRole('button', { name: 'Antippen zum Beenden' });
    expect(end).toHaveAttribute('aria-pressed', 'true');
    now += TEMPI.calm * 2;
    fireEvent.click(end);
    expect(screen.getByText('gut')).toBeInTheDocument();
  });

  it('ends a hold when the finger slides away or the button loses focus', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Los' }));
    fireEvent.pointerDown(button());
    now += TEMPI.calm * 2;
    fireEvent.pointerCancel(screen.getByRole('button', { name: 'Halten …' }));
    expect(screen.getByText('gut')).toBeInTheDocument();
    onward();
    fireEvent.pointerDown(button());
    now += TEMPI.calm;
    fireEvent.blur(screen.getByRole('button', { name: 'Halten …' }));
    expect(screen.getByText(/Zu kurz/)).toBeInTheDocument();
  });

  it('is offered on the path under unit 3', async () => {
    vi.useRealTimers();
    mount();
    await userEvent.click(screen.getByRole('link', { name: 'Schließen' }));
    const link = await screen.findByRole('link', { name: /Halte die Ghunna/ });
    expect(link).toHaveAttribute('href', '/pfad/3/spiel/ghunna-halten');
    expect(link).toHaveTextContent('zwei Zählzeiten, nicht eine, nicht drei');
  });
});
