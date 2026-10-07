import type { SheetExample } from './sheet';

/**
 * Examples for units 3 and 4 beyond the sheet (spec 03 §4): the sheet gives one example per
 * mīm sākina rule and none for the ghunna of a shadda or for qalqala. These are real words of
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
];
