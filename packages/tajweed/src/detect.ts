import {
  ALIF_WASLA,
  type Grapheme,
  type Letter,
  graphemes,
  hasIqlabSign,
  hasShadda,
  hasSukun,
  hasTanwin,
  hasVowel,
  isArabicLetter,
  letterOf,
} from './letters';
import { type RuleId, isQalqalaLetter, mimSakinaRule, nunSakinaRule } from './rules';

/** One place where a rule applies, as code-unit offsets into the text it was found in. */
export interface Occurrence {
  rule: RuleId;
  /** Offset of the letter that carries the rule (the nūn, the tanwīn, the mīm, …). */
  start: number;
  /** Offset after the carrier and its marks: the part a display colours. */
  carrierEnd: number;
  /** Offset after the letter that decides the rule, or `carrierEnd` when none does. */
  end: number;
  /** The letter after the nūn or mīm that decided the rule. */
  follower?: Letter;
  /** Whether that letter starts the next word. */
  acrossWords?: boolean;
  /** Whether the carrier is a tanwīn rather than a nūn or mīm. */
  tanwin?: boolean;
}

interface Follower {
  index: number;
  letter: Letter;
  /** Whether the follower starts another word: idghām happens only across words. */
  acrossWords: boolean;
}

/**
 * A letter without a vowel or shadda is sākin: ʿUthmānī text leaves the sukūn off a nūn or
 * mīm that is hidden or merged, and marks it with the small mīm before bāʾ.
 */
const isSakin = (g: Grapheme): boolean =>
  hasSukun(g) || hasIqlabSign(g) || (!hasVowel(g) && !hasShadda(g));

/** The tanwīn, or the iqlāb sign that the ʿUthmānī script writes in its place. */
const carriesTanwin = (g: Grapheme, letter: Letter): boolean =>
  hasTanwin(g) || (letter !== 'ن' && hasIqlabSign(g));

/**
 * The letter read after the grapheme at `from`, or `undefined` when the reading stops (end of
 * text, an āya sign) or a vowel is carried over (alif waṣla).
 */
function followerOf(
  gs: readonly Grapheme[],
  from: number,
  afterTanwin: boolean
): Follower | undefined {
  let acrossWords = false;
  for (let j = from + 1; j < gs.length; j++) {
    const g = gs[j] as Grapheme;
    if (g.wordStart) acrossWords = true;
    if (!isArabicLetter(g.char) || g.char === ALIF_WASLA) return undefined;
    // The silent seat of fatḥatān: عَلِيمًا, هُدًى.
    if (
      afterTanwin &&
      !g.wordStart &&
      (g.char === 'ا' || g.char === 'ى') &&
      !hasVowel(g)
    ) {
      continue;
    }
    // A bare alif can only start a word here. With a vowel it carries a hamza; without one it
    // is alif waṣla in IndoPak spelling, so a vowel is carried over and no rule applies.
    if (g.char === 'ا' && !hasVowel(g)) return undefined;
    const letter = g.char === 'ا' ? 'ء' : letterOf(g.char);
    return letter ? { index: j, letter, acrossWords } : undefined;
  }
  return undefined;
}

const isIdgham = (rule: RuleId): boolean =>
  rule === 'idgham-ghunna' || rule === 'idgham-no-ghunna' || rule === 'idgham-shafawi';

/**
 * Finds the rules of units 2–4 in vocalised text: nūn sākina and tanwīn, mīm sākina, ghunna on
 * a mushaddad nūn or mīm, and qalqala on a sākin letter. Pure and deterministic; the muṣḥaf's
 * rule layer comes from the content pack (ADR-0008), this is for the sheet's examples, the
 * games and checking the pack.
 *
 * Not covered yet: madd, lām shamsiyya, hamzat al-waṣl and the rules at a stop (waqf).
 */
export function detect(text: string): Occurrence[] {
  const gs = graphemes(text);
  const found: Occurrence[] = [];
  // The letter a nūn or mīm merged into: its shadda is that idghām, not a second ghunna.
  let mergedInto = -1;

  for (let i = 0; i < gs.length; i++) {
    const g = gs[i] as Grapheme;
    const letter = letterOf(g.char);
    if (!letter) continue;

    if ((letter === 'ن' || letter === 'م') && hasShadda(g) && i !== mergedInto) {
      found.push({
        rule: 'ghunna-mushaddad',
        start: g.start,
        carrierEnd: g.end,
        end: g.end,
      });
    }

    const tanwin = carriesTanwin(g, letter);
    if (tanwin || (letter === 'ن' && isSakin(g))) {
      const next = followerOf(gs, i, tanwin);
      if (!next) continue;
      let rule: RuleId = nunSakinaRule(next.letter);
      // Inside one word the idghām letters keep iẓhār: صِنْوَانٌ, قِنْوَانٌ, الدُّنْيَا, بُنْيَانٌ.
      if (isIdgham(rule) && !next.acrossWords) rule = 'izhar';
      if (isIdgham(rule)) mergedInto = next.index;
      found.push({ ...occurrence(rule, g, gs[next.index] as Grapheme, next), tanwin });
      continue;
    }

    if (letter === 'م' && isSakin(g)) {
      const next = followerOf(gs, i, false);
      if (!next) continue;
      const rule = mimSakinaRule(next.letter);
      if (isIdgham(rule)) mergedInto = next.index;
      found.push(occurrence(rule, g, gs[next.index] as Grapheme, next));
      continue;
    }

    if (isQalqalaLetter(letter) && hasSukun(g)) {
      found.push({ rule: 'qalqala', start: g.start, carrierEnd: g.end, end: g.end });
    }
  }
  return found;
}

const occurrence = (
  rule: RuleId,
  carrier: Grapheme,
  decider: Grapheme,
  next: Follower
): Occurrence => ({
  rule,
  start: carrier.start,
  carrierEnd: carrier.end,
  end: decider.end,
  follower: next.letter,
  acrossWords: next.acrossWords,
});
