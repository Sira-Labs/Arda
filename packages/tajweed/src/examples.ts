import type { SheetExample } from './sheet';

/**
 * Examples for units 3–7 beyond the sheet (spec 03 §4): the sheet gives one example per mīm
 * sākina rule and none for the ghunna of a shadda,  for qalqala, madd, tafkhīm or
 * waqf. These are real words of
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

  // Tafkhīm: one word for each of the seven heavy letters, خ ص ض غ ط ق ظ.
  { text: 'خَلَقَ', expectedRule: 'tafkhim', wordKey: 'hafs:96:1:5' },
  { text: 'الصَّمَدُ', expectedRule: 'tafkhim', wordKey: 'hafs:112:2:2' },
  { text: 'وَالضُّحَى', expectedRule: 'tafkhim', wordKey: 'hafs:93:1:1' },
  { text: 'الْغَٰشِيَةِ', expectedRule: 'tafkhim', wordKey: 'hafs:88:1:4' },
  { text: 'وَالطَّارِقِ', expectedRule: 'tafkhim', wordKey: 'hafs:86:1:2' },
  { text: 'قُلْ', expectedRule: 'tafkhim', wordKey: 'hafs:112:1:1' },
  { text: 'الْعَظِيمِ', expectedRule: 'tafkhim', wordKey: 'hafs:78:2:3' },

  // The lām of Allāh: heavy after fatḥa or ḍamma and at the start, light after kasra.
  { text: 'نَصْرُ اللَّهِ', expectedRule: 'lam-heavy', wordKey: 'hafs:110:1:3' },
  { text: 'إِنَّ اللَّهَ', expectedRule: 'lam-heavy', wordKey: 'hafs:2:20:20' },
  { text: 'رَسُولُ اللَّهِ', expectedRule: 'lam-heavy', wordKey: 'hafs:91:13:3' },
  { text: 'اللَّهُ الصَّمَدُ', expectedRule: 'lam-heavy', wordKey: 'hafs:112:2:1' },
  { text: 'بِسْمِ اللَّهِ', expectedRule: 'lam-light', wordKey: 'hafs:1:1:1' },
  { text: 'الْحَمْدُ لِلَّهِ', expectedRule: 'lam-light', wordKey: 'hafs:1:2:1' },
  { text: 'دِينِ اللَّهِ', expectedRule: 'lam-light', wordKey: 'hafs:110:2:5' },
  { text: 'بِاللَّهِ', expectedRule: 'lam-light', wordKey: 'hafs:2:8:6' },

  // Rāʾ: heavy with fatḥa or ḍamma and sākina after them, after hamzat al-waṣl or before a
  // heavy letter; light with kasra and sākina after kasra.
  { text: 'رَبِّ', expectedRule: 'ra-heavy', wordKey: 'hafs:1:2:3' },
  { text: 'مَرْيَمَ', expectedRule: 'ra-heavy', wordKey: 'hafs:2:87:12' },
  { text: 'ارْجِعِي', expectedRule: 'ra-heavy', wordKey: 'hafs:89:28:1' },
  { text: 'مِرْصَادًا', expectedRule: 'ra-heavy', wordKey: 'hafs:78:21:4' },
  { text: 'رِزْقًا', expectedRule: 'ra-light', wordKey: 'hafs:2:22:16' },
  { text: 'فِرْعَوْنَ', expectedRule: 'ra-light', wordKey: 'hafs:79:17:3' },
  { text: 'فَذَكِّرْ', expectedRule: 'ra-light', wordKey: 'hafs:87:9:1' },
  { text: 'وَالْفَجْرِ', expectedRule: 'ra-light', wordKey: 'hafs:89:1:1' },

  // Waqf: the last word as the reciter stops on it, each at the end of an āya.
  { text: 'أَحَدٌ', expectedRule: 'waqf-sukun', wordKey: 'hafs:112:1:4' },
  { text: 'الْفَلَقِ', expectedRule: 'waqf-sukun', wordKey: 'hafs:113:1:4' },
  { text: 'لَهَبٍ', expectedRule: 'waqf-sukun', wordKey: 'hafs:111:3:4' },
  { text: 'عَلَقٍ', expectedRule: 'waqf-sukun', wordKey: 'hafs:96:2:4' },
  { text: 'أَوْتَادًا', expectedRule: 'madd-iwad', wordKey: 'hafs:78:7:2' },
  { text: 'سُبَاتًا', expectedRule: 'madd-iwad', wordKey: 'hafs:78:9:3' },
  { text: 'لِبَاسًا', expectedRule: 'madd-iwad', wordKey: 'hafs:78:10:3' },
  { text: 'أَفْوَاجًا', expectedRule: 'madd-iwad', wordKey: 'hafs:110:2:7' },
  { text: 'الْقَارِعَةُ', expectedRule: 'waqf-ha', wordKey: 'hafs:101:1:1' },
  { text: 'الْبَيِّنَةُ', expectedRule: 'waqf-ha', wordKey: 'hafs:98:1:12' },
  { text: 'الْحُطَمَةُ', expectedRule: 'waqf-ha', wordKey: 'hafs:104:5:4' },
  { text: 'الْمُوقَدَةُ', expectedRule: 'waqf-ha', wordKey: 'hafs:104:6:3' },

  // Madd ʿāriḍ and līn: before the last letter of an āya, 2, 4 or 6 counts.
  { text: 'الرَّحِيمِ', expectedRule: 'madd-arid', wordKey: 'hafs:1:1:4' },
  { text: 'الْعَٰلَمِينَ', expectedRule: 'madd-arid', wordKey: 'hafs:1:2:4' },
  { text: 'نَسْتَعِينُ', expectedRule: 'madd-arid', wordKey: 'hafs:1:5:4' },
  { text: 'الْمُسْتَقِيمَ', expectedRule: 'madd-arid', wordKey: 'hafs:1:6:3' },
  { text: 'قُرَيْشٍ', expectedRule: 'madd-lin', wordKey: 'hafs:106:1:2' },
  { text: 'وَالصَّيْفِ', expectedRule: 'madd-lin', wordKey: 'hafs:106:2:4' },
  { text: 'الْبَيْتِ', expectedRule: 'madd-lin', wordKey: 'hafs:106:3:4' },
  { text: 'خَوْفٍ', expectedRule: 'madd-lin', wordKey: 'hafs:106:4:7' },

  // Ibtidāʾ on alif waṣla: fatḥa and kasra where an āya begins with it, ḍamma within an āya.
  { text: 'الْحَمْدُ', expectedRule: 'ibtida-fatha', wordKey: 'hafs:1:2:1' },
  { text: 'الَّذِي', expectedRule: 'ibtida-fatha', wordKey: 'hafs:78:3:1' },
  { text: 'النَّجْمُ', expectedRule: 'ibtida-fatha', wordKey: 'hafs:86:3:1' },
  { text: 'النَّارِ', expectedRule: 'ibtida-fatha', wordKey: 'hafs:85:5:1' },
  { text: 'ادْعُ', expectedRule: 'ibtida-damma', wordKey: 'hafs:2:68:2' },
  { text: 'اعْبُدُوا', expectedRule: 'ibtida-damma', wordKey: 'hafs:2:21:3' },
  { text: 'اسْكُنْ', expectedRule: 'ibtida-damma', wordKey: 'hafs:2:35:3' },
  { text: 'ادْخُلُوا', expectedRule: 'ibtida-damma', wordKey: 'hafs:2:58:3' },
  { text: 'اقْرَأْ', expectedRule: 'ibtida-kasra', wordKey: 'hafs:96:1:1' },
  { text: 'اهْدِنَا', expectedRule: 'ibtida-kasra', wordKey: 'hafs:1:6:1' },
  { text: 'اذْهَبْ', expectedRule: 'ibtida-kasra', wordKey: 'hafs:79:17:1' },
];
