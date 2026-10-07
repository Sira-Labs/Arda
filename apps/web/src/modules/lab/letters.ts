import type { Review } from '@/content/units';
import { LAB_LETTERS, type LabLetterId, type WhistlingId } from './types';

/**
 * The letter lab's first set (spec F5, owner 2026-10-06): sīn, zāy and ṣād, the three
 * whistling letters a German speaker easily mixes up, and rāʾ. The texts are in the i18n
 * catalogs (`lab`); this module says which letter has which point, area and ṣifāt. Every
 * makhraj and its drawing is a draft until the sheikh has reviewed it (spec 03 §6, ADR-0018).
 */

/** The five areas of the makhārij, in the order of the legend. */
export const AREAS = ['jawf', 'halq', 'lisan', 'shafatan', 'khayshum'] as const;
export type Area = (typeof AREAS)[number];

/** Where a letter of the first set is made, as a point on the head (HeadDiagram). */
export type Point = 'whistle' | 'ra';

/** The ṣifāt of the first set; each has a name and a one-line meaning in the catalogs. */
export const SIFAT = [
  'hams',
  'jahr',
  'rakhawa',
  'tawassut',
  'istifal',
  'istila',
  'infitah',
  'itbaq',
  'ismat',
  'idhlaq',
  'safir',
  'inhiraf',
  'takrir',
] as const;
export type Sifa = (typeof SIFAT)[number];

/** What the listening quiz asks: which whistling letter, or whether the rāʾ is heavy. */
export type QuizKind = 'whistling' | 'weight';

export interface LetterContent {
  id: LabLetterId;
  /** The letter on its own, shown large in muṣḥaf script. */
  letter: string;
  /** Its Arabic name. */
  arabicName: string;
  area: Area;
  point: Point;
  sifat: readonly Sifa[];
  quiz: QuizKind;
  review: Review;
}

export const LETTERS: Readonly<Record<LabLetterId, LetterContent>> = {
  sin: {
    id: 'sin',
    letter: 'س',
    arabicName: 'سِين',
    area: 'lisan',
    point: 'whistle',
    sifat: ['hams', 'rakhawa', 'istifal', 'infitah', 'ismat', 'safir'],
    quiz: 'whistling',
    review: { status: 'draft' },
  },
  zay: {
    id: 'zay',
    letter: 'ز',
    arabicName: 'زَاي',
    area: 'lisan',
    point: 'whistle',
    sifat: ['jahr', 'rakhawa', 'istifal', 'infitah', 'ismat', 'safir'],
    quiz: 'whistling',
    review: { status: 'draft' },
  },
  sad: {
    id: 'sad',
    letter: 'ص',
    arabicName: 'صَاد',
    area: 'lisan',
    point: 'whistle',
    sifat: ['hams', 'rakhawa', 'istila', 'itbaq', 'ismat', 'safir'],
    quiz: 'whistling',
    review: { status: 'draft' },
  },
  ra: {
    id: 'ra',
    letter: 'ر',
    arabicName: 'رَاء',
    area: 'lisan',
    point: 'ra',
    sifat: ['jahr', 'tawassut', 'istifal', 'infitah', 'idhlaq', 'inhiraf', 'takrir'],
    quiz: 'weight',
    review: { status: 'draft' },
  },
};

/** The whistling letters, the answers of their listening quiz. */
export const WHISTLING: readonly WhistlingId[] = ['sin', 'zay', 'sad'];

/** Whether a route parameter names a letter of the lab. */
export function isLabLetter(value: string | undefined): value is LabLetterId {
  return (LAB_LETTERS as readonly string[]).includes(value ?? '');
}

export { LAB_LETTERS, type LabLetterId };
