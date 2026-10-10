import type { SheetExample } from './sheet';

/**
 * Examples for units 3–5 beyond the sheet (spec 03 §4): the sheet gives one example per mīm
 * sākina rule and none for the ghunna of a shadda, for qalqala or for madd. These are real words of
 * the Qurʾān, spelt like the sheet (every sukūn written), each with the word key it was
 * checked against in the Tanzil text. Drafts until the sheikh has reviewed them.
 */
export const UNIT_EXAMPLES: readonly SheetExample[] = [
  // Ghunna of a nūn or mīm with shadda: always two counts.
  { text: 'إِنَّ', expectedRule: 'ghunna-mushaddad', wordKey: 'hafs:103:2:1' },
  { text: 'النَّاسِ', expectedRule: 'ghunna-mushaddad', wordKey: 'hafs:114:1:4' },
  { text: 'ثُمَّ', expectedRule: 'ghunna-mushaddad', wordKey: 'hafs:102:4:1' },
  { text: 'عَمَّ', expectedRule: 'ghunna-mushaddad', wordKey: 'hafs:78:1:1' },

  // Mīm sākina, one more each beside the sheet's.
  {
    text: 'وَمَا هُمْ بِمُؤْمِنِينَ',
    expectedRule: 'ikhfa-shafawi',
    wordKey: 'hafs:2:8:9',
  },
  { text: 'كَمْ مِنْ فِئَةٍ', expectedRule: 'idgham-shafawi', wordKey: 'hafs:2:249:49' },
  { text: 'أَلَمْ تَرَ', expectedRule: 'izhar-shafawi', wordKey: 'hafs:105:1:1' },

  // Qalqala: one word for each of ق ط ب ج د with sukūn.
  { text: 'قَدْ أَفْلَحَ', expectedRule: 'qalqala', wordKey: 'hafs:87:14:1' },
  { text: 'أَطْعَمَهُمْ', expectedRule: 'qalqala', wordKey: 'hafs:106:4:2' },
  { text: 'الْأَبْتَرُ', expectedRule: 'qalqala', wordKey: 'hafs:108:3:4' },
  { text: 'النَّجْدَيْنِ', expectedRule: 'qalqala', wordKey: 'hafs:90:10:2' },
  { text: 'خَلَقْنَا', expectedRule: 'qalqala', wordKey: 'hafs:90:4:2' },

  // Madd ṭabīʿī: an alif, wāw or yāʾ (or the small alif) with nothing after it that lengthens it.
  { text: 'الرَّحْمَٰنِ', expectedRule: 'madd-tabii', wordKey: 'hafs:1:1:3' },
  { text: 'الدِّينِ', expectedRule: 'madd-tabii', wordKey: 'hafs:1:4:3' },
  { text: 'سَيَعْلَمُونَ', expectedRule: 'madd-tabii', wordKey: 'hafs:78:4:2' },
  { text: 'سِرَاجًا', expectedRule: 'madd-tabii', wordKey: 'hafs:78:13:2' },

  // Madd muttaṣil: a hamza after the madd letter in the same word; the muṣḥaf writes the madda.
  { text: 'جَآءَ', expectedRule: 'madd-muttasil', wordKey: 'hafs:110:1:2' },
  { text: 'السَّمَآءُ', expectedRule: 'madd-muttasil', wordKey: 'hafs:82:1:2' },
  { text: 'جَزَآءً', expectedRule: 'madd-muttasil', wordKey: 'hafs:78:26:1' },
  { text: 'حَدَآئِقَ', expectedRule: 'madd-muttasil', wordKey: 'hafs:78:32:1' },

  // Madd munfaṣil: the madd letter ends a word and the next starts with a hamza.
  {
    text: 'إِنَّآ أَعْطَيْنَاكَ',
    expectedRule: 'madd-munfasil',
    wordKey: 'hafs:108:1:1',
  },
  { text: 'بِمَآ أُنْزِلَ', expectedRule: 'madd-munfasil', wordKey: 'hafs:2:4:3' },
  { text: 'لَآ أُقْسِمُ', expectedRule: 'madd-munfasil', wordKey: 'hafs:90:1:1' },
  { text: 'فِيٓ أَيِّ', expectedRule: 'madd-munfasil', wordKey: 'hafs:82:8:1' },

  // Madd lāzim: a shadda after the madd letter in the same word (al-kalimī al-muthaqqal).
  { text: 'الضَّآلِّينَ', expectedRule: 'madd-lazim', wordKey: 'hafs:1:7:9' },
  { text: 'الطَّآمَّةُ', expectedRule: 'madd-lazim', wordKey: 'hafs:79:34:3' },
  { text: 'الصَّآخَّةُ', expectedRule: 'madd-lazim', wordKey: 'hafs:80:33:3' },
  { text: 'دَآبَّةٍ', expectedRule: 'madd-lazim', wordKey: 'hafs:2:164:33' },
];
