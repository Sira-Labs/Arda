import { storedChoice } from './storedChoice';

/**
 * Whether the muṣḥaf page shows the tajwīd colours or plain ink, as the printed copy does
 * (owner, 2026-10-05). Colours are the default: they are what the app teaches.
 */
export type MushafColours = 'tajweed' | 'plain';

const choice = storedChoice<MushafColours>('arda.mushafColours', 'tajweed', [
  'tajweed',
  'plain',
]);

export const chooseColours = choice.choose;
export const useMushafColours = choice.use;
export const resetColoursForTests = choice.resetForTests;
