import type { AnswerId } from '@/content/units';

/**
 * Leitner scheduling for review cards (ADR-0021): five boxes, a mistake goes back to box 1,
 * a right answer moves up one box. Pure functions; the clock is passed in.
 */

export const BOXES = 5;
const DAY = 24 * 60 * 60 * 1000;
/** Days until a card in box n (index n - 1) is due again; box 5 stays at 30 once mastered. */
const INTERVAL_DAYS = [0, 1, 3, 7, 16] as const;
const MASTERED_DAYS = 30;

export type CardKind =
  'which-rule' | 'sort-letter' | 'qalqala-letter' | 'madd-length' | 'weight';

export interface ReviewCard {
  /** Content-derived and stable (`which-rule:<text>`, `sort:<letter>`), so sync can merge. */
  id: string;
  kind: CardKind;
  /** The word or the letter that was asked. */
  prompt: string;
  answer: AnswerId;
  box: number;
  /** Epoch milliseconds. */
  due: number;
  lapses: number;
  updatedAt: number;
}

export type NewCard = Pick<ReviewCard, 'id' | 'kind' | 'prompt' | 'answer'>;

/** A new card from a mistake: box 1, due at once. */
export function fromMistake(card: NewCard, now: number): ReviewCard {
  return { ...card, box: 1, due: now, lapses: 1, updatedAt: now };
}

/** The card after an answer: up one box when right, back to box 1 when wrong. */
export function answer(card: ReviewCard, correct: boolean, now: number): ReviewCard {
  if (!correct)
    return { ...card, box: 1, due: now, lapses: card.lapses + 1, updatedAt: now };
  const mastered = card.box >= BOXES;
  const box = Math.min(BOXES, card.box + 1);
  const days = mastered ? MASTERED_DAYS : (INTERVAL_DAYS[box - 1] ?? MASTERED_DAYS);
  return { ...card, box, due: now + days * DAY, updatedAt: now };
}

export const isDue = (card: ReviewCard, now: number): boolean => card.due <= now;
