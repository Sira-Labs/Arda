import { createHash } from 'node:crypto';
import { sura as suraOf } from '@arda/quran';

/**
 * DigitalKhatt's IndoPak text (ADR-0009 update 2026-10-04): `quran_text_indopak_15.ts` from
 * DigitalKhatt/digitalkhatt-js (MIT), the muṣḥaf as it is printed, 610 pages of 15 lines
 * (the first two pages 8). Lines hold a sūra heading, a basmala, or text; an āya ends with
 * `۝` and its number in Arabic-Indic digits, followed by the pause signs printed after it.
 * Nothing here changes a letter: words keep the source's characters, including U+034F.
 */

/** A word or end marker and where it stands: page (as in the source, from 1) and line. */
export interface Placed {
  text: string;
  page: number;
  line: number;
}

export interface IndopakWord extends Placed {
  /** The āya-end marker printed after the word (`۝٣٠ۙ`), when one follows it. */
  after: string;
}

export interface IndopakSura {
  sura: number;
  /** Where the sūra heading stands. */
  heading: Placed;
  /** The basmala line, except for at-Tawba; al-Fātiḥa's is its āya 1. */
  basmala?: IndopakWord[];
  /** Ḥafṣ (Kūfan) āyāt, each a list of words. */
  ayat: IndopakWord[][];
}

export interface IndopakText {
  pages: number;
  suras: IndopakSura[];
  /** SHA-256 of the file as published. */
  sha256: string;
}

const MARKER = /^۝([٠-٩]*)(.*)$/u;
const digits = (arabic: string) =>
  Number([...arabic].map((d) => d.charCodeAt(0) - 0x0660).join(''));

/** The array literal of the TypeScript file, read as data (never evaluated). */
function pagesOf(raw: string): string[][] {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (!raw.startsWith('let quranText = [') || end < start) {
    throw new Error('DigitalKhatt: unexpected file layout');
  }
  // Single-quoted strings without escapes; turned into JSON before parsing.
  const json = raw
    .slice(start, end + 1)
    .replace(/'([^'\\]*)'/g, (_, s: string) => JSON.stringify(s))
    .replace(/,(\s*\])/g, '$1');
  const pages = JSON.parse(json) as unknown;
  if (
    !Array.isArray(pages) ||
    !pages.every((p) => Array.isArray(p) && p.every((l) => typeof l === 'string'))
  ) {
    throw new Error('DigitalKhatt: not a list of pages of lines');
  }
  return pages as string[][];
}

/**
 * Al-Fātiḥa is numbered the IndoPak way in the source: the basmala carries a bare `۝`, and
 * the āya ending at عَلَيْهِمْ is numbered 6. In Ḥafṣ (Kūfan) the basmala is āya 1 and 6–7
 * of the source are āya 7. Source number → the Ḥafṣ āya it closes (none for 6).
 */
const FATIHA: Record<number, number | null> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: null,
  7: 7,
};

/**
 * Reads the file. `partial` (tests) accepts fewer than 114 sūras and leaves the āya counts
 * unchecked.
 */
export function parseIndopak(raw: string, { partial = false } = {}): IndopakText {
  const pages = pagesOf(raw);
  const suras: IndopakSura[] = [];
  let current: IndopakSura | undefined;
  let words: IndopakWord[] = [];
  let basmalaLine = false;

  const close = (number: number, where: string) => {
    if (!current) throw new Error(`DigitalKhatt: text before the first sūra (${where})`);
    if (number !== current.ayat.length + 1) {
      throw new Error(`DigitalKhatt: ${current.sura}:${number} out of order (${where})`);
    }
    current.ayat.push(words);
    words = [];
  };

  pages.forEach((lines, p) => {
    lines.forEach((text, l) => {
      const where = `page ${p + 1}, line ${l + 1}`;
      const page = p + 1;
      const line = l + 1;
      if (text.startsWith('سُورَةُ ')) {
        if (words.length)
          throw new Error(`DigitalKhatt: words without an end (${where})`);
        current = { sura: suras.length + 1, heading: { text, page, line }, ayat: [] };
        suras.push(current);
        basmalaLine = current.sura !== 9;
        return;
      }
      for (const token of text.split(' ').filter(Boolean)) {
        const marker = MARKER.exec(token);
        if (!marker) {
          // Al-Fātiḥa 6 (IndoPak count) is printed inside the word, after U+202E: the word
          // ends there, and the number and its signs follow it like a marker.
          const cut = token.indexOf('\u202E');
          words.push(
            cut > 0
              ? { text: token.slice(0, cut), page, line, after: token.slice(cut) }
              : { text: token, page, line, after: '' }
          );
          continue;
        }
        const last = words.at(-1);
        if (!last || !current) throw new Error(`DigitalKhatt: a marker alone (${where})`);
        last.after = token;
        if (basmalaLine && marker[1] === '') {
          // The unnumbered basmala line; al-Fātiḥa's is its first āya.
          if (current.sura === 1) close(1, where);
          else current.basmala = words.splice(0);
          basmalaLine = false;
          continue;
        }
        basmalaLine = false;
        const number = digits(marker[1]!);
        if (current.sura === 1) {
          const hafs = FATIHA[number];
          if (hafs === undefined) throw new Error(`DigitalKhatt: 1:${number} (${where})`);
          if (hafs !== null) close(hafs, where);
        } else {
          close(number, where);
        }
      }
    });
  });

  if (words.length) throw new Error('DigitalKhatt: words after the last āya');
  if (!partial && suras.length !== 114) {
    throw new Error(`DigitalKhatt: ${suras.length} sūras`);
  }
  for (const s of partial ? [] : suras) {
    if (s.ayat.length !== suraOf(s.sura)!.ayas) {
      throw new Error(`DigitalKhatt: sūra ${s.sura} has ${s.ayat.length} āyāt`);
    }
  }
  return {
    pages: pages.length,
    suras,
    sha256: createHash('sha256').update(raw).digest('hex'),
  };
}
