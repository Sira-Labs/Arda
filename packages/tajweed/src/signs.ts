/**
 * The pause signs of the Madīna muṣḥaf (Tanzil's ʿUthmānī text, spec 03 §4d), as the packs keep
 * them after a word: what each asks of the reciter. Sakta is no pause sign but a short breathless
 * stop, written with a small sīn in four places of Ḥafṣ (بَلْ ۜ رَانَ).
 */
export const WAQF_SIGNS = [
  { sign: 'ۘ', id: 'lazim', arabic: 'وَقْف لَازِم' },
  { sign: 'ۙ', id: 'mamnu', arabic: 'وَقْف مَمْنُوع' },
  { sign: 'ۚ', id: 'jaiz', arabic: 'وَقْف جَائِز' },
  { sign: 'ۖ', id: 'wasl-awla', arabic: 'الوَصْل أَوْلَى' },
  { sign: 'ۗ', id: 'waqf-awla', arabic: 'الوَقْف أَوْلَى' },
  { sign: 'ۛ', id: 'muanaqa', arabic: 'وَقْف المُعَانَقَة' },
  { sign: 'ۜ', id: 'sakta', arabic: 'سَكْتَة' },
] as const;

export type WaqfSign = (typeof WAQF_SIGNS)[number];
export type WaqfSignId = WaqfSign['id'];

/** The pause sign a character is, if it is one. */
export function waqfSignOf(char: string): WaqfSign | undefined {
  return WAQF_SIGNS.find((s) => s.sign === char);
}
