import { storedChoice } from '@/modules/mushaf/storedChoice';

/**
 * The student agreed to record (ADR-0012: asked once, before the first take). Kept on the
 * device; a guardian's consent for a student under 16 is recorded by the teacher.
 */
const choice = storedChoice<'given' | 'unasked'>('arda.recordingConsent', 'unasked', [
  'given',
  'unasked',
]);

export const giveConsent = () => choice.choose('given');
export const useConsent = choice.use;
export const resetConsentForTests = choice.resetForTests;
