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
 * throat (2026-10-07), which German lacks but for hāʾ and the glottal stop, and five of the tongue
 * (2026-10-09): qāf and kāf at its back, jīm, shīn and yāʾ at its middle, then ḍād at its edge
 * and ṭāʾ, dāl and tāʾ at its tip. The texts are in the
 * i18n catalogs (`lab`); this module says which letter has which point, area and ṣifāt. Every
 * makhraj and its drawing is a draft until the sheikh has reviewed it (spec 03 §6, ADR-0018).
 */

/** The five areas of the makhārij, in the order of the legend. */
export const AREAS = ['jawf', 'halq', 'lisan', 'shafatan', 'khayshum'] as const;
export type Area = (typeof AREAS)[number];

/**
 * Where a letter is made, as a point on the head (HeadDiagram): the whistling letters, rāʾ, and
 * the three parts of the throat – the deepest (ء ه), the middle (ع ح), the nearest the mouth
 * (غ خ) – and the tongue under the palate: its very back (ق), a little before it (ك), its
 * middle (ج ش ي), its edge at the upper molars (ض) and its tip at the roots of the upper
 * incisors (ط د ت).
 */
export type Point =
  | 'whistle'
  | 'ra'
  | 'halqDeep'
  | 'halqMid'
  | 'halqNear'
  | 'tongueFar'
  | 'tongueBack'
  | 'tongueMid'
  | 'tongueSide'
  | 'tongueTip';

/** The ṣifāt of the lab's letters; each has a name and a one-line meaning in the catalogs. */
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
  'qalqala',
  'tafashshi',
  'istitala',
] as const;
export type Sifa = (typeof SIFAT)[number];

/**
 * What a listening quiz asks: which of the letters heard against each other (the whistling
 * three; hamza or ʿayn; hāʾ, ḥāʾ or khāʾ; khāʾ or ghayn; qāf or kāf; jīm, shīn or yāʾ; ḍād
 * or dāl; ṭāʾ, dāl or tāʾ), or whether the rāʾ is heavy.
 */
export type QuizKind =
  | 'whistling'
  | 'hamzaAyn'
  | 'hSounds'
  | 'khGh'
  | 'qafKaf'
  | 'middle'
  | 'dadDal'
  | 'tip'
  | 'weight';

/** The letters each quiz offers, in a fixed order; `weight` offers heavy and light. */
export const QUIZ_LETTERS: Record<Exclude<QuizKind, 'weight'>, readonly HeardId[]> = {
  whistling: ['sin', 'zay', 'sad'],
  hamzaAyn: ['hamza', 'ayn'],
  hSounds: ['ha', 'hha', 'kha'],
  khGh: ['kha', 'ghayn'],
  qafKaf: ['qaf', 'kaf'],
  middle: ['jim', 'shin', 'ya'],
  dadDal: ['dad', 'dal'],
  tip: ['tta', 'dal', 'ta'],
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
  qaf: {
    id: 'qaf',
    letter: 'ق',
    arabicName: 'قَاف',
    area: 'lisan',
    point: 'tongueFar',
    sifat: ['jahr', 'shidda', 'istila', 'infitah', 'ismat', 'qalqala'],
    quiz: 'qafKaf',
    review: { status: 'draft' },
  },
  kaf: {
    id: 'kaf',
    letter: 'ك',
    arabicName: 'كَاف',
    area: 'lisan',
    point: 'tongueBack',
    sifat: ['hams', 'shidda', 'istifal', 'infitah', 'ismat'],
    quiz: 'qafKaf',
    review: { status: 'draft' },
  },
  jim: {
    id: 'jim',
    letter: 'ج',
    arabicName: 'جِيم',
    area: 'lisan',
    point: 'tongueMid',
    sifat: ['jahr', 'shidda', 'istifal', 'infitah', 'ismat', 'qalqala'],
    quiz: 'middle',
    review: { status: 'draft' },
  },
  shin: {
    id: 'shin',
    letter: 'ش',
    arabicName: 'شِين',
    area: 'lisan',
    point: 'tongueMid',
    sifat: ['hams', 'rakhawa', 'istifal', 'infitah', 'ismat', 'tafashshi'],
    quiz: 'middle',
    review: { status: 'draft' },
  },
  ya: {
    id: 'ya',
    letter: 'ي',
    arabicName: 'يَاء',
    area: 'lisan',
    point: 'tongueMid',
    sifat: ['jahr', 'rakhawa', 'istifal', 'infitah', 'ismat'],
    quiz: 'middle',
    review: { status: 'draft' },
  },
  dad: {
    id: 'dad',
    letter: 'ض',
    arabicName: 'ضَاد',
    area: 'lisan',
    point: 'tongueSide',
    sifat: ['jahr', 'rakhawa', 'istila', 'itbaq', 'ismat', 'istitala'],
    quiz: 'dadDal',
    review: { status: 'draft' },
  },
  tta: {
    id: 'tta',
    letter: 'ط',
    arabicName: 'طَاء',
    area: 'lisan',
    point: 'tongueTip',
    sifat: ['jahr', 'shidda', 'istila', 'itbaq', 'ismat', 'qalqala'],
    quiz: 'tip',
    review: { status: 'draft' },
  },
  dal: {
    id: 'dal',
    letter: 'د',
    arabicName: 'دَال',
    area: 'lisan',
    point: 'tongueTip',
    sifat: ['jahr', 'shidda', 'istifal', 'infitah', 'ismat', 'qalqala'],
    quiz: 'tip',
    review: { status: 'draft' },
  },
  ta: {
    id: 'ta',
    letter: 'ت',
    arabicName: 'تَاء',
    area: 'lisan',
    point: 'tongueTip',
    sifat: ['hams', 'shidda', 'istifal', 'infitah', 'ismat'],
    quiz: 'tip',
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
