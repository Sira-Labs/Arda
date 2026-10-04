import type { RuleId } from '@arda/tajweed';
import type { Unit2Card } from '@/content/unit2';
import type { Language } from '@/i18n/languages';

const DAY_MS = 24 * 60 * 60 * 1000;

const localeOf = (language: Language): string => (language === 'ar' ? 'ar-EG' : language);

/** A day on this device's calendar, `YYYY-MM-DD` (due days have no time zone). */
export function localDay(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `day` moved by `days` calendar days. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** A due day for reading: "Fr., 9. Okt.". */
export function formatDay(day: string, language: Language): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(localeOf(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** When something happened, on this device's calendar: "3. Okt.". */
export function formatMoment(iso: string, language: Language): string {
  return new Date(iso).toLocaleDateString(localeOf(language), {
    day: 'numeric',
    month: 'short',
  });
}

export type DueState = 'overdue' | 'today' | 'later';

export function dueState(dueOn: string, today: string = localDay()): DueState {
  if (dueOn < today) return 'overdue';
  return dueOn === today ? 'today' : 'later';
}

/** The rule card that teaches a rule, where one exists yet (unit 2). */
const CARDS: Partial<Record<RuleId, Unit2Card>> = {
  izhar: 'izhar',
  'idgham-ghunna': 'idgham',
  'idgham-no-ghunna': 'idgham',
  iqlab: 'iqlab',
  ikhfa: 'ikhfa',
};

/** Where an assignment leads in the app: its rule card or game; reading needs the muṣḥaf (S2). */
export function linkFor(kind: string, rule: RuleId | null): 'card' | 'game' | null {
  if (!rule || !CARDS[rule]) return null;
  if (kind === 'learn') return 'card';
  return kind === 'practise' ? 'game' : null;
}

/** Whether a rule card teaches the rule yet. */
export const hasCard = (rule: RuleId): boolean => CARDS[rule] !== undefined;

export const cardPath = (rule: RuleId): string => `/pfad/2/${CARDS[rule] ?? ''}`;
export const GAME_PATH = '/pfad/2/spiel/welche-regel';
