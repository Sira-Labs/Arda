import type { WaqfSignId } from '@arda/tajweed';

/**
 * Where the Madīna muṣḥaf writes each pause sign (spec 03 §4d): the words as Tanzil spells them,
 * the sign after the word it follows. The card shows them; the game asks what each one means.
 */
export const SIGN_EXAMPLES: Readonly<Record<WaqfSignId, { text: string; key: string }>> =
  {
    lazim: { text: 'بِهَٰذَا مَثَلًاۘ', key: 'hafs:2:26:27-28' },
    mamnu: { text: 'مِن ثَمَرَةٍ رِّزْقًاۙ', key: 'hafs:2:25:16-18' },
    jaiz: { text: 'حَذَرَ ٱلْمَوْتِۚ', key: 'hafs:2:19:15-16' },
    'wasl-awla': { text: 'مِّن رَّبِّهِمْۖ', key: 'hafs:2:5:4-5' },
    'waqf-awla': { text: 'ءَامَنَ ٱلسُّفَهَآءُۗ', key: 'hafs:2:13:11-12' },
    muanaqa: { text: 'لَا رَيْبَۛ فِيهِۛ', key: 'hafs:2:2:3-5' },
    sakta: { text: 'كَلَّاۖ بَلْۜ رَانَ', key: 'hafs:83:14:1-3' },
  };
