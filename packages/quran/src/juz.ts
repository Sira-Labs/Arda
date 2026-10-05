/**
 * The thirty ajzāʾ (paras): the āya each starts with, from Tanzil's Quran Metadata 1.0
 * (© 2008–2009 Tanzil.info, CC BY 3.0, https://tanzil.net/docs/quran_metadata; checked
 * against it in the tools tests), and the name the IndoPak muṣḥaf prints in its header: the
 * para's opening words.
 */
export const JUZ_STARTS: readonly (readonly [sura: number, aya: number])[] = [
  [1, 1],
  [2, 142],
  [2, 253],
  [3, 93],
  [4, 24],
  [4, 148],
  [5, 82],
  [6, 111],
  [7, 88],
  [8, 41],
  [9, 93],
  [11, 6],
  [12, 53],
  [15, 1],
  [17, 1],
  [18, 75],
  [21, 1],
  [23, 1],
  [25, 21],
  [27, 56],
  [29, 46],
  [33, 31],
  [36, 28],
  [39, 32],
  [41, 47],
  [46, 1],
  [51, 31],
  [58, 1],
  [67, 1],
  [78, 1],
];

/** The para names as IndoPak prints them (the first para is named after al-Baqara's start). */
export const JUZ_NAMES: readonly string[] = [
  'الٓمّٓ',
  'سَيَقُوْلُ',
  'تِلْكَ الرُّسُلُ',
  'لَنْ تَنَالُوْا',
  'وَالْمُحْصَنٰتُ',
  'لَا يُحِبُّ اللّٰهُ',
  'وَاِذَا سَمِعُوْا',
  'وَلَوْ اَنَّنَا',
  'قَالَ الْمَلَاُ',
  'وَاعْلَمُوْٓا',
  'يَعْتَذِرُوْنَ',
  'وَمَا مِنْ دَآبَّةٍ',
  'وَمَآ اُبَرِّئُ',
  'رُبَمَا',
  'سُبْحٰنَ الَّذِيْٓ',
  'قَالَ اَلَمْ',
  'اِقْتَرَبَ لِلنَّاسِ',
  'قَدْ اَفْلَحَ',
  'وَقَالَ الَّذِيْنَ',
  'اَمَّنْ خَلَقَ',
  'اُتْلُ مَآ اُوْحِيَ',
  'وَمَنْ يَّقْنُتْ',
  'وَمَا لِيَ',
  'فَمَنْ اَظْلَمُ',
  'اِلَيْهِ يُرَدُّ',
  'حٰمٓ',
  'قَالَ فَمَا خَطْبُكُمْ',
  'قَدْ سَمِعَ اللّٰهُ',
  'تَبٰرَكَ الَّذِيْ',
  'عَمَّ',
];

/** The juzʾ (1–30) an āya belongs to. */
export function juzOf(sura: number, aya: number): number {
  let juz = 1;
  JUZ_STARTS.forEach(([s, a], i) => {
    if (sura > s || (sura === s && aya >= a)) juz = i + 1;
  });
  return juz;
}
