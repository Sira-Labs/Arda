import type { RuleId } from '../src/rules';

/**
 * Every example of the sheikh's sheet ("Tajweed – Regeln zum Ausdrucken", spec 03 §4).
 * `expectedRule` is the rule the sheet shows the example for; `all` lists every rule in the
 * example, in reading order, when it holds more than that one.
 */
export interface SheetFixture {
  text: string;
  expectedRule: RuleId;
  all?: readonly RuleId[];
  wordKey?: string;
}

export const SHEET_FIXTURES: readonly SheetFixture[] = [
  // Iẓhār: the six throat letters.
  { text: 'مَنْ آمَنَ', expectedRule: 'izhar' },
  { text: 'مِنْ هَادٍ', expectedRule: 'izhar' },
  {
    text: 'أَنْعَمْتَ',
    expectedRule: 'izhar',
    all: ['izhar', 'izhar-shafawi'],
    wordKey: 'hafs:1:7:3',
  },
  { text: 'عَلِيمٌ حَكِيمٌ', expectedRule: 'izhar' },
  { text: 'مِنْ غَائِبَةٍ', expectedRule: 'izhar' },
  { text: 'وَالْمُنْخَنِقَةُ', expectedRule: 'izhar' },

  // Idghām with ghunna: yanmū.
  { text: 'مَنْ يَقُولُ', expectedRule: 'idgham-ghunna' },
  { text: 'مِنْ نُورٍ', expectedRule: 'idgham-ghunna' },
  { text: 'مِنْ مَاءٍ', expectedRule: 'idgham-ghunna' },
  { text: 'مِنْ وَالٍ', expectedRule: 'idgham-ghunna' },

  // Idghām without ghunna: lām and rāʾ.
  {
    text: 'مِنْ لَدُنْهُ',
    expectedRule: 'idgham-no-ghunna',
    all: ['idgham-no-ghunna', 'izhar'],
  },
  { text: 'غَفُورٌ رَحِيمٌ', expectedRule: 'idgham-no-ghunna' },

  // Iqlāb: bāʾ.
  { text: 'مِنْ بَعْدِ', expectedRule: 'iqlab' },
  { text: 'مِنْۢ بَعْدِ', expectedRule: 'iqlab' },
  { text: 'سَمِيعٌ بَصِيرٌ', expectedRule: 'iqlab' },
  { text: 'زَوْجٍ بَهِيجٍ', expectedRule: 'iqlab' },

  // Ikhfāʾ: the fifteen remaining letters.
  { text: 'مِنْ تَابَ', expectedRule: 'ikhfa' },
  { text: 'مِنْ ثَمَرَةٍ', expectedRule: 'ikhfa' },
  { text: 'مَنْ جَاءَ', expectedRule: 'ikhfa' },
  { text: 'مِنْ دِيَارِهِمْ', expectedRule: 'ikhfa' },
  { text: 'نَفْسٍ ذَائِقَةٍ', expectedRule: 'ikhfa' },
  { text: 'مِنْكُمْ', expectedRule: 'ikhfa' },

  // Mīm sākina.
  {
    text: 'تَرْمِيهِمْ بِحِجَارَةٍ',
    expectedRule: 'ikhfa-shafawi',
    wordKey: 'hafs:105:4:1',
  },
  { text: 'لَكُمْ مَا', expectedRule: 'idgham-shafawi' },
  { text: 'عَلَيْهِمْ سَلَامٌ', expectedRule: 'izhar-shafawi' },
];

/** The four words where nūn sākina meets an idghām letter inside one word and stays clear. */
export const IZHAR_EXCEPTIONS: readonly SheetFixture[] = [
  { text: 'صِنْوَانٌ', expectedRule: 'izhar' }, // ar-Raʿd 4
  { text: 'قِنْوَانٌ', expectedRule: 'izhar' }, // al-Anʿām 99
  { text: 'الدُّنْيَا', expectedRule: 'izhar' }, // e.g. al-Baqara 85
  { text: 'بُنْيَانٌ', expectedRule: 'izhar' }, // aṣ-Ṣaff 4
];
