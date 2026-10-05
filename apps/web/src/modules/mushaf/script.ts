import { storedChoice } from './storedChoice';

/** The muṣḥaf scripts the app has packs for (ADR-0017). */
export type MushafScript = 'indopak' | 'uthmani';

/** IndoPak first: it is the sheikh's muṣḥaf (ADR-0017 update 2026-10-04). */
export const DEFAULT_SCRIPT: MushafScript = 'indopak';

const choice = storedChoice<MushafScript>('arda.mushafScript', DEFAULT_SCRIPT, [
  'indopak',
  'uthmani',
]);

/** The script this device shows. */
export const readScript = choice.read;
export const chooseScript = choice.choose;
/** The chosen script, re-rendering when it changes. */
export const useMushafScript = choice.use;
export const resetScriptForTests = choice.resetForTests;
