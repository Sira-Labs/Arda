import type { RemarkId } from '@/i18n/messages';

/**
 * The teacher's quick remarks, in the order offered (ADR-0020): the same ids the api accepts
 * (apps/api/src/recordings/repository.ts), each written in every catalog.
 */
export const REMARKS: readonly RemarkId[] = [
  'ghunnaShort',
  'ghunnaLong',
  'nunTooClear',
  'qalqalaMissing',
  'maddShort',
  'sinVoiced',
  'zayVoiceless',
  'raRolled',
  'good',
];
