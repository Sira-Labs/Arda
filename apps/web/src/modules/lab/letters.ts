import type { Review } from '@/content/units';
import {
  LAB_LETTERS,
  LAB_SETS,
  type HeardId,
  type LabLetterId,
  type LabSet,
} from './types';

/**
 * The letter lab's letters (spec F5): the first set (owner 2026-10-06) – sīn, zāy and ṣād,
 * the three whistling letters a German speaker easily mixes up, and rāʾ – and the six of the
 * throat (2026-10-07), which German lacks but for hāʾ and the glottal stop. The texts are in the
 * i18n catalogs (`lab`); this module says which letter has which point, area and ṣifāt. Every
 * makhraj and its drawing is a draft until the sheikh has reviewed it (spec 03 §6, ADR-0018).
 */

/** The five areas of the makhārij, in the order of the legend. */
export const AREAS = ['jawf', 'halq', 'lisan', 'shafatan', 'khayshum'] as const;
export type Area = (typeof AREAS)[number];

/**
 * Where a letter is made, as a point on the head (HeadDiagram): the whistling letters, rāʾ, and
 * the three parts of the throat – the deepest (ء ه), the middle (ع ح), the nearest the mouth
 * (غ خ).
 */
export type Point = 'whistle' | 'ra' | 'halqDeep' | 'halqMid' | 'halqNear';

/** The ṣifāt of the first set; each has a name and a one-line meaning in the catalogs. */
export const SIFAT = [
  'hams',
  'jahr',
  'shidda',
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

/**
 * What a listening quiz asks: which of the letters heard against each other (the whistling
 * three; hamza or ʿayn; hāʾ, ḥāʾ or khāʾ; khāʾ or ghayn), or whether the rāʾ is heavy.
 */
export type QuizKind = 'whistling' | 'hamzaAyn' | 'hSounds' | 'khGh' | 'weight';

/** The letters each quiz offers, in a fixed order; `weight` offers heavy and light. */
export const QUIZ_LETTERS: Record<Exclude<QuizKind, 'weight'>, readonly HeardId[]> = {
  whistling: ['sin', 'zay', 'sad'],
  hamzaAyn: ['hamza', 'ayn'],
  hSounds: ['ha', 'hha', 'kha'],
  khGh: ['kha', 'ghayn'],
};

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
  hamza: {
    id: 'hamza',
    letter: 'ء',
    arabicName: 'هَمْزَة',
    area: 'halq',
    point: 'halqDeep',
    sifat: ['jahr', 'shidda', 'istifal', 'infitah', 'ismat'],
    quiz: 'hamzaAyn',
    review: { status: 'draft' },
  },
  ha: {
    id: 'ha',
    letter: 'ه',
    arabicName: 'هَاء',
    area: 'halq',
    point: 'halqDeep',
    sifat: ['hams', 'rakhawa', 'istifal', 'infitah', 'ismat'],
    quiz: 'hSounds',
    review: { status: 'draft' },
  },
  ayn: {
    id: 'ayn',
    letter: 'ع',
    arabicName: 'عَيْن',
    area: 'halq',
    point: 'halqMid',
    sifat: ['jahr', 'tawassut', 'istifal', 'infitah', 'ismat'],
    quiz: 'hamzaAyn',
    review: { status: 'draft' },
  },
  hha: {
    id: 'hha',
    letter: 'ح',
    arabicName: 'حَاء',
    area: 'halq',
    point: 'halqMid',
    sifat: ['hams', 'rakhawa', 'istifal', 'infitah', 'ismat'],
    quiz: 'hSounds',
    review: { status: 'draft' },
  },
  ghayn: {
    id: 'ghayn',
    letter: 'غ',
    arabicName: 'غَيْن',
    area: 'halq',
    point: 'halqNear',
    sifat: ['jahr', 'rakhawa', 'istila', 'infitah', 'ismat'],
    quiz: 'khGh',
    review: { status: 'draft' },
  },
  kha: {
    id: 'kha',
    letter: 'خ',
    arabicName: 'خَاء',
    area: 'halq',
    point: 'halqNear',
    sifat: ['hams', 'rakhawa', 'istila', 'infitah', 'ismat'],
    quiz: 'hSounds',
    review: { status: 'draft' },
  },
};

/** The lab's sets, in the order they are taught. */
export const SETS = Object.keys(LAB_SETS) as LabSet[];

/** Whether a route parameter names a letter of the lab. */
export function isLabLetter(value: string | undefined): value is LabLetterId {
  return (LAB_LETTERS as readonly string[]).includes(value ?? '');
}

export { LAB_LETTERS, LAB_SETS, type LabLetterId, type LabSet };
