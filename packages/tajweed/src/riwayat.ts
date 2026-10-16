import { graphemes, type Grapheme, letterOf } from './letters';
import { detect } from './detect';

/**
 * The riwāyāt unit 8 names (spec 03 §4e): a reader (imām) of the ten and one of his two
 * narrators (rāwī). Ḥafṣ ʿan ʿĀṣim is the learner's; the others are read across the Muslim
 * world today. Their places and what they change are in the catalogs.
 */
export const RIWAYAT = [
  { id: 'hafs', arabic: 'حَفْصٌ عَنْ عَاصِمٍ' },
  { id: 'shuba', arabic: 'شُعْبَةُ عَنْ عَاصِمٍ' },
  { id: 'warsh', arabic: 'وَرْشٌ عَنْ نَافِعٍ' },
  { id: 'qalun', arabic: 'قَالُونُ عَنْ نَافِعٍ' },
  { id: 'duri', arabic: 'الدُّورِيُّ عَنْ أَبِي عَمْرٍو' },
] as const;

export type Riwaya = (typeof RIWAYAT)[number];
export type RiwayaId = Riwaya['id'];

/**
 * What another riwāya reads differently from Ḥafṣ (spec 03 §4e). Warsh: the separated madd
 * held 6, the madd after a hamza (badal) 2, 4 or 6, the hamza's vowel carried to the letter
 * before it (naql), a hamza sākina read as a madd letter (ibdāl), alif maqṣūra between fatḥa
 * and kasra (taqlīl), a thinner rāʾ, a heavier lām. Then whole words (farsh), Qālūn's wāw after
 * the mīm of the plural (ṣila) and ad-Dūrī's leaning ā (imāla).
 */
export const RIWAYA_CHANGES = [
  'madd-munfasil',
  'madd-badal',
  'naql',
  'ibdal',
  'taqlil',
  'ra-tarqiq',
  'lam-taghliz',
  'word',
  'sila',
  'imala',
] as const;

export type RiwayaChange = (typeof RIWAYA_CHANGES)[number];

/** The unit's cards group the changes: the madds, the hamza, the sounds, other words. */
export type ChangeGroup = 'madd' | 'hamza' | 'sound' | 'word';

export const CHANGE_GROUP: Readonly<Record<RiwayaChange, ChangeGroup>> = {
  'madd-munfasil': 'madd',
  'madd-badal': 'madd',
  naql: 'hamza',
  ibdal: 'hamza',
  taqlil: 'sound',
  'ra-tarqiq': 'sound',
  'lam-taghliz': 'sound',
  word: 'word',
  sila: 'word',
  imala: 'word',
};

/**
 * A place where another riwāya reads differently: the words as Ḥafṣ reads them (spelt like the
 * sheet, every sukūn written), the key of the first word in Tanzil's text, and who reads it how.
 */
export interface RiwayaExample {
  text: string;
  wordKey: string;
  change: RiwayaChange;
  /** The riwāyāt that read it this way; Ḥafṣ is never among them. */
  by: readonly RiwayaId[];
  /**
   * How they say it, where letters change: written as spoken (قَدَ ٱفْلَحَ), not as their
   * muṣḥaf spells it. Left out where only a length or a sound changes.
   */
  spoken?: string;
  /**
   * The āya in ʿAbd al-Bāsiṭ's two recordings on EveryAyah, as `SSSAAA`: Ḥafṣ by the Kūfan
   * count, Warsh by the Madanī one (al-Fātiḥa: ملك يوم الدين is its third āya). Given only
   * where both counts were matched by the clips' lengths (ADR-0027).
   */
  audio?: { hafs: string; warsh: string };
}

/**
 * The examples of unit 8, checked against the Tanzil text like those of units 3–7 (tools
 * test). Drafts until the sheikh has reviewed them; what each riwāya reads follows ash-Shāṭibiyya
 * as commonly taught (ADR-0027).
 */
export const RIWAYA_EXAMPLES: readonly RiwayaExample[] = [
  // Warsh holds the separated madd 6 counts (Ḥafṣ: 4 or 5).
  {
    text: 'إِنَّآ أَعْطَيْنَاكَ',
    wordKey: 'hafs:108:1:1',
    change: 'madd-munfasil',
    by: ['warsh'],
    audio: { hafs: '108001', warsh: '108001' },
  },
  {
    text: 'لَآ أُقْسِمُ',
    wordKey: 'hafs:90:1:1',
    change: 'madd-munfasil',
    by: ['warsh'],
    audio: { hafs: '090001', warsh: '090001' },
  },
  {
    text: 'قُلْ يَٰٓأَيُّهَا',
    wordKey: 'hafs:109:1:1',
    change: 'madd-munfasil',
    by: ['warsh'],
    audio: { hafs: '109001', warsh: '109001' },
  },
  // Warsh may hold a madd after a hamza (badal) 2, 4 or 6 counts (Ḥafṣ: 2).
  {
    text: 'ءَامَنُوا',
    wordKey: 'hafs:95:6:3',
    change: 'madd-badal',
    by: ['warsh'],
    audio: { hafs: '095006', warsh: '095006' },
  },

  // Naql: the hamza falls away, its vowel goes to the sākin letter before it.
  {
    text: 'قَدْ أَفْلَحَ',
    wordKey: 'hafs:87:14:1',
    change: 'naql',
    by: ['warsh'],
    spoken: 'قَدَ ٱفْلَحَ',
    audio: { hafs: '087014', warsh: '087014' },
  },
  {
    text: 'قَدْ أَفْلَحَ',
    wordKey: 'hafs:91:9:1',
    change: 'naql',
    by: ['warsh'],
    spoken: 'قَدَ ٱفْلَحَ',
    audio: { hafs: '091009', warsh: '091009' },
  },
  // Ibdāl: a hamza sākina that begins the root is read as the madd letter of the vowel before it.
  {
    text: 'مَأْكُولٍ',
    wordKey: 'hafs:105:5:3',
    change: 'ibdal',
    by: ['warsh'],
    spoken: 'مَاكُولٍ',
    audio: { hafs: '105005', warsh: '105005' },
  },
  {
    text: 'مُؤْصَدَةٌ',
    wordKey: 'hafs:104:8:3',
    change: 'ibdal',
    by: ['shuba', 'warsh', 'qalun'],
    spoken: 'مُوصَدَةٌ',
    audio: { hafs: '104008', warsh: '104008' },
  },

  // Taqlīl: Warsh reads the alif maqṣūra at the end of these āyāt between fatḥa and kasra.
  {
    text: 'وَالضُّحَىٰ',
    wordKey: 'hafs:93:1:1',
    change: 'taqlil',
    by: ['warsh'],
    audio: { hafs: '093001', warsh: '093001' },
  },
  {
    text: 'سَجَىٰ',
    wordKey: 'hafs:93:2:3',
    change: 'taqlil',
    by: ['warsh'],
    audio: { hafs: '093002', warsh: '093002' },
  },
  // Warsh reads a rāʾ with fatḥa or ḍamma light after kasra or yāʾ sākina.
  {
    text: 'بَصِيرًا',
    wordKey: 'hafs:84:15:6',
    change: 'ra-tarqiq',
    by: ['warsh'],
    audio: { hafs: '084015', warsh: '084015' },
  },
  // Warsh reads a lām with fatḥa heavy after ṣād, ṭāʾ or ẓāʾ with fatḥa or sukūn.
  {
    text: 'صَلَاتِهِمْ',
    wordKey: 'hafs:107:5:4',
    change: 'lam-taghliz',
    by: ['warsh'],
    audio: { hafs: '107005', warsh: '107005' },
  },

  // Other words (farsh al-ḥurūf).
  {
    text: 'مَٰلِكِ',
    wordKey: 'hafs:1:4:1',
    change: 'word',
    by: ['warsh', 'qalun', 'duri'],
    spoken: 'مَلِكِ',
    audio: { hafs: '001004', warsh: '001003' },
  },
  {
    text: 'كُفُوًا',
    wordKey: 'hafs:112:4:4',
    change: 'word',
    by: ['shuba', 'warsh', 'qalun', 'duri'],
    spoken: 'كُفُؤًا',
    audio: { hafs: '112004', warsh: '112004' },
  },
  {
    text: 'يَخْدَعُونَ',
    wordKey: 'hafs:2:9:6',
    change: 'word',
    by: ['warsh', 'qalun', 'duri'],
    spoken: 'يُخَادِعُونَ',
  },
  {
    text: 'يَكْذِبُونَ',
    wordKey: 'hafs:2:10:12',
    change: 'word',
    by: ['warsh', 'qalun', 'duri'],
    spoken: 'يُكَذِّبُونَ',
  },
  // Qālūn may join a wāw to the mīm of the plural (ṣila).
  {
    text: 'عَلَيْهِمْ',
    wordKey: 'hafs:1:7:4',
    change: 'sila',
    by: ['qalun'],
    spoken: 'عَلَيْهِمُو',
  },
  // Ad-Dūrī leans the ā of an-nās towards ē when it has kasra (imāla).
  { text: 'النَّاسِ', wordKey: 'hafs:114:1:4', change: 'imala', by: ['duri'] },
];

const HAMZA = new Set(['ء', 'أ', 'إ', 'ؤ', 'ئ']);
const isHamza = (g: Grapheme | undefined): boolean =>
  g !== undefined && HAMZA.has(g.char);
const SUKUN = /[ْۡ]/u;
const HEAVY_BEFORE_LAM = new Set(['ص', 'ط', 'ظ']);

/** The part of the example the change is on, as code-unit offsets into its text. */
export interface ChangeMark {
  start: number;
  end: number;
}

/**
 * Where the change is in the example's Ḥafṣ text, for the card and the game to mark: the madd
 * letter that is held longer, the hamza that moves or turns, the alif maqṣūra, the rāʾ or lām
 * whose weight changes; for a word, ṣila or imāla the word itself (the last of the text).
 */
export function changeMark({ text, change }: RiwayaExample): ChangeMark {
  const gs = graphemes(text);
  const span = (g: Grapheme, last: Grapheme = g): ChangeMark => ({
    start: g.start,
    end: last.end,
  });
  const find = (test: (g: Grapheme, i: number) => boolean): ChangeMark | undefined => {
    const i = gs.findIndex(test);
    return i < 0 ? undefined : span(gs[i] as Grapheme);
  };
  let mark: ChangeMark | undefined;
  switch (change) {
    case 'madd-munfasil': {
      const madd = detect(text, { madd: true }).find((o) => o.rule === 'madd-munfasil');
      mark = madd && { start: madd.start, end: madd.carrierEnd };
      break;
    }
    case 'madd-badal': {
      // The madd letter right after a hamza (ءَامَنُوا: the alif after the hamza).
      const madd = detect(text, { madd: true }).find(
        (o) =>
          o.rule === 'madd-tabii' &&
          isHamza(gs[gs.findIndex((g) => g.start === o.start) - 1])
      );
      mark = madd && { start: madd.start, end: madd.carrierEnd };
      break;
    }
    case 'naql':
      // The hamza that starts a word after a sākin letter.
      mark = find(
        (g, i) => g.wordStart && isHamza(g) && SUKUN.test(gs[i - 1]?.marks ?? '')
      );
      break;
    case 'ibdal':
      mark = find((g) => isHamza(g) && SUKUN.test(g.marks));
      break;
    case 'taqlil':
      mark = find((g) => g.char === 'ى');
      break;
    case 'ra-tarqiq':
      mark = find((g) => g.char === 'ر');
      break;
    case 'lam-taghliz':
      mark = find(
        (g, i) => letterOf(g.char) === 'ل' && HEAVY_BEFORE_LAM.has(gs[i - 1]?.char ?? '')
      );
      break;
    case 'word':
    case 'sila':
    case 'imala': {
      let first = gs.length - 1;
      while (first > 0 && !(gs[first] as Grapheme).wordStart) first--;
      mark = span(gs[first] as Grapheme, gs[gs.length - 1] as Grapheme);
      break;
    }
  }
  if (!mark) throw new Error(`no ${change} in ${text}`);
  return mark;
}

/** The examples of one card of unit 8. */
export const examplesOf = (group: ChangeGroup): readonly RiwayaExample[] =>
  RIWAYA_EXAMPLES.filter((e) => CHANGE_GROUP[e.change] === group);
