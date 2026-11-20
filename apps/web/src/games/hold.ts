/**
 * "Hold the ghunna" (spec F6): the learner hums the ghunna of a nūn or mīm with shadda and
 * holds a button for as long, against a beat. The rule is the rule card's (two counts); the
 * beat is only a practice tempo, so the round is played at two tempi: two counts stay two
 * counts whatever the pace. Pure functions; the screen passes the clock in.
 */
import { shuffle, UNIT3_POOL, type Random, type WordQuestion } from './questions';

/** How long the ghunna of a shadda is held, in counts (rule card "ghunna", step 2). */
export const GHUNNA_COUNTS = 2;

/** Tries in one round. */
export const HOLD_ROUND_SIZE = 6;

/** Milliseconds per beat: calm for the first half of the round, brisker for the second. */
export const TEMPI = { calm: 800, brisk: 600 } as const;
export type Tempo = keyof typeof TEMPI;

/** The tempo of try `index` (from 0) in a round of `size`. */
export function tempoOf(index: number, size: number = HOLD_ROUND_SIZE): Tempo {
  return index < Math.ceil(size / 2) ? 'calm' : 'brisk';
}

export type HoldVerdict = 'short' | 'good' | 'long';

/** Counts held: the time the button was down, in beats. */
export function countsHeld(heldMs: number, beatMs: number): number {
  return beatMs > 0 ? Math.max(0, heldMs) / beatMs : 0;
}

/**
 * Nearer to one count than to two is too short, nearer to three too long: half a count of
 * leeway either way, which a thumb on glass needs.
 */
export function verdictOf(counts: number): HoldVerdict {
  if (counts < GHUNNA_COUNTS - 0.5) return 'short';
  if (counts > GHUNNA_COUNTS + 0.5) return 'long';
  return 'good';
}

/** The words of the game: the checked examples of the ghunna card, nothing else. */
export const HOLD_POOL: readonly WordQuestion[] = UNIT3_POOL.filter(
  (question) => question.answer === 'ghunna'
);

/** One round: the pool in a new order, again from the start when it is shorter than the round. */
export function holdRound(
  random: Random,
  size: number = HOLD_ROUND_SIZE
): WordQuestion[] {
  const round: WordQuestion[] = [];
  while (HOLD_POOL.length > 0 && round.length < size) {
    const next = shuffle(HOLD_POOL, random);
    // The same word twice in a row reads like a stuck screen.
    if (round.at(-1)?.id === next[0]?.id && next.length > 1) next.push(next.shift()!);
    round.push(...next);
  }
  return round.slice(0, size);
}
