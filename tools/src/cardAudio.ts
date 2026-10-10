import {
  IZHAR_EXCEPTIONS,
  SHEET_EXAMPLES,
  UNIT_EXAMPLES,
  detect,
  type RuleId,
  type SheetExample,
} from '@arda/tajweed';
import { joinsNasal, type ShippedTimings } from './lab';
import type { TanzilText } from './tanzil';
import { splitWords } from './words';

/**
 * The rule cards' examples heard (spec F2, "each example playable"): every example of the
 * sheikh's sheet and of units 3–5 is looked up in the whole Qurʾān, where al-Ḥuṣarī's
 * teaching recitation says it, and played from its āya's file. The sheet spells its examples
 * the common way (every sukūn and alif written) and some are set phrases rather than quotations
 * (عَلِيمٌ حَكِيمٌ), so an example is found by its letters, the closest vowels winning, and kept
 * only where the tajweed engine finds the card's rule in the Qurʾān's own spelling and the
 * reciter does not run into it from a nūn or mīm before. An example the Qurʾān does not have
 * stays silent, and the build says which.
 */

/** Every example a card shows: the sheet's, the units' own, and the iẓhār exceptions. */
export const CARD_EXAMPLES: readonly SheetExample[] = [
  ...SHEET_EXAMPLES,
  ...UNIT_EXAMPLES,
  ...IZHAR_EXCEPTIONS,
];

/** One example where it is recited: words `from`–`to` of an āya, and where they sound. */
export interface CardSpan {
  /** The example as the card shows it. */
  text: string;
  rule: RuleId;
  sura: number;
  aya: number;
  from: number;
  to: number;
  /** The words in the Qurʾān's spelling (Tanzil Uthmani). */
  uthmani: string;
  /** The word before, in the Qurʾān's spelling, so the check can be repeated. */
  before: string | null;
  /** The span's timing in the āya's file, milliseconds. */
  timed: [number, number];
  /** Whether the span ends the āya (its last word may sound past its timing). */
  last: boolean;
}

/** The marks on a letter, and the tatweel. */
const MARK = /[\p{Mn}ـ]/gu;
/** fatḥa, ḍamma, kasra and the three tanwīn: what the ear hears of the marks. */
const VOWEL = /[ً-ِ]/gu;

/**
 * A word's letters only, spelling differences aside: every alif and every hamza go, whatever
 * its seat. The Qurʾān writes many a long ā as a small alif (دِيَٰرِهِمْ) and a madd as an alif
 * with a madda sign (مَّآءٍ), and the sheet writes ءَامَنَ as آمَنَ. The vowels and the card's rule
 * decide among words that share their letters.
 */
export function skeleton(word: string): string {
  return word
    .normalize('NFD')
    .replace(MARK, '')
    .replace(/[اأإءؤئٱ]/g, '')
    .replace(/ى/g, 'ي');
}

/** The short vowels and tanwīn of a word, in order. */
const vowels = (word: string): string => word.match(VOWEL)?.join('') ?? '';

function distance(a: string, b: string): number {
  let row = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(
        row[j]! + 1,
        next[j - 1]! + 1,
        row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    row = next;
  }
  return row[b.length]!;
}

/**
 * quran-align's timings of the teaching recitation for every āya. The app's timings
 * (timings.ts) refuse a malformed segment, for the sūras they ship; across the whole Qurʾān a
 * few segments end before they start, and those are left out here: a span that needs one is
 * then not timed (`timedSpan`), and its example is looked for elsewhere.
 */
export function alignedAyat(raw: string): ShippedTimings {
  const data = JSON.parse(raw) as { surah: number; ayah: number; segments: number[][] }[];
  const ayat: Record<string, number[][]> = {};
  for (const { surah, ayah, segments } of data) {
    ayat[`${surah}:${ayah}`] = segments
      .filter((s) => s.length >= 4 && s[0]! < s[1]! && s[2]! <= s[3]!)
      .sort((a, b) => a[2]! - b[2]!);
  }
  return { ayat };
}

/** An āya's words as the packs count them: the basmala Tanzil puts before āya 1 is no word of it. */
export function ayaWords(tanzil: TanzilText, sura: number, aya: number): string[] {
  const text = tanzil.ayat.get(`${sura}:${aya}`);
  if (!text) return [];
  const words = splitWords([...text]).map((w) => w.text);
  return aya === 1 && sura !== 1 && sura !== 9 ? words.slice(4) : words;
}

/**
 * Where the span `from`–`to` sounds: the start of its first word to the end of its last, when
 * the timings have no segment that runs over its edges (a word merged with one outside it).
 */
export function timedSpan(
  timings: ShippedTimings,
  sura: number,
  aya: number,
  from: number,
  to: number
): { timed: [number, number]; last: boolean } | null {
  const segments = timings.ayat[`${sura}:${aya}`] ?? [];
  const first = segments.find(([a, b]) => a! <= from - 1 && from - 1 < b!);
  const end = segments.find(([a, b]) => a! < to && to <= b!);
  if (!first || !end || first[0] !== from - 1 || end[1] !== to) return null;
  return {
    timed: [first[2]!, end[3]!],
    last: !segments.some(([a]) => a! >= to),
  };
}

/**
 * Where the Qurʾān says the example, or null: the occurrences with its letters, the card's rule
 * and no nūn or mīm running into them, timed as words of their own; the example's own word key
 * first, then the closest vowels, then the first in the muṣḥaf's order.
 */
export function locate(
  example: SheetExample,
  tanzil: TanzilText,
  timings: ShippedTimings
): CardSpan | null {
  const words = example.text.split(' ');
  const want = words.map(skeleton).join(' ');
  const keyed = example.wordKey?.split(':').slice(1).map(Number);
  const found: (CardSpan & { rank: [number, number] })[] = [];
  for (const ref of tanzil.ayat.keys()) {
    const [sura, aya] = ref.split(':').map(Number) as [number, number];
    const ayaText = ayaWords(tanzil, sura, aya);
    for (let i = 0; i + words.length <= ayaText.length; i++) {
      const span = ayaText.slice(i, i + words.length);
      if (span.map(skeleton).join(' ') !== want) continue;
      const uthmani = span.join(' ');
      const rules = detect(uthmani, { madd: true });
      if (!rules.some((o) => o.rule === example.expectedRule)) continue;
      const before = i > 0 ? ayaText[i - 1]! : null;
      if (before !== null && joinsNasal(before, span[0]!)) continue;
      const time = timedSpan(timings, sura, aya, i + 1, i + words.length);
      if (!time) continue;
      const own = keyed && keyed[0] === sura && keyed[1] === aya && keyed[2] === i + 1;
      found.push({
        text: example.text,
        rule: example.expectedRule,
        sura,
        aya,
        from: i + 1,
        to: i + words.length,
        uthmani,
        before,
        ...time,
        rank: [
          own ? -1 : distance(vowels(example.text), vowels(uthmani)),
          sura * 1000 + aya,
        ],
      });
    }
  }
  found.sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1]);
  const best = found[0];
  if (!best) return null;
  const { rank: _rank, ...span } = best;
  return span;
}

/** A located example with where it really sounds, measured like the lab's words. */
export interface CardAudio extends CardSpan {
  clip: [number, number];
}

/** `tools/card-audio.json`: every example heard, and the ones the Qurʾān does not have. */
export interface CardAudioData {
  reciter: 'husary-muallim';
  note: string;
  examples: CardAudio[];
  missing: string[];
}

export function serialiseCardAudio(data: CardAudioData): string {
  const { examples, missing, ...head } = data;
  return `{\n${Object.entries(head)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n')}\n  "examples": [\n${examples
    .map((e) => `    ${JSON.stringify(e)}`)
    .join(',\n')}\n  ],\n  "missing": ${JSON.stringify(missing)}\n}\n`;
}

/**
 * `apps/web/src/content/cardAudio.ts`: the example's text to its āya and clip. Generated; one
 * example per line, so Prettier leaves it alone (.prettierignore).
 */
export function cardAudioModule(data: CardAudioData): string {
  const line = (e: CardAudio) =>
    `  ${JSON.stringify(e.text)}: ${JSON.stringify({
      key: `hafs:${e.sura}:${e.aya}:${e.from}-${e.to}`,
      sura: e.sura,
      aya: e.aya,
      clip: e.clip,
      // The Qurʾān's wording, where the reciter's vowels are not the sheet's (مَن تَابَ).
      ...(vowels(e.text) === vowels(e.uthmani) ? {} : { quran: e.uthmani }),
    })},`;
  return `/**
 * Where al-Ḥuṣarī's teaching recitation says each rule card example (spec F2): its āya and,
 * measured in the sound, where in the āya's file it starts and ends (milliseconds). Examples the
 * Qurʾān does not have as written are not here and stay silent: ${data.missing.join(', ') || 'none'}.
 * Generated by \`npm run card-audio -w @arda/tools\` (tools/src/cardAudio.ts); do not edit.
 */

export interface ExampleAudio {
  /** \`hafs:sura:aya:from-to\`: the words the example is. */
  key: string;
  sura: number;
  aya: number;
  clip: readonly [number, number];
  /** What the reciter says, where its vowels differ from the example as the sheet writes it. */
  quran?: string;
}

export const CARD_AUDIO: Readonly<Record<string, ExampleAudio>> = {
${data.examples.map(line).join('\n')}
};
`;
}
