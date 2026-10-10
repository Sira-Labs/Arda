/**
 * An in-memory ProgressRepository for route tests: the same contract as the Postgres one
 * (checked against it in auth.pg.integration.test.ts), built on the same pure merge.
 */
import {
  clampToNow,
  EVENT_PAGE,
  eventsUpToNow,
  MAX_CARDS,
  MAX_EVENTS,
  MAX_GAMES,
  MAX_NOTES,
  mergeProgress,
  type Progress,
  type ProgressRepository,
  type StoredEvent,
  type SyncInput,
  type SyncOutcome,
} from '../src/progress/repository.js';

export class MemoryProgressRepository implements ProgressRepository {
  readonly stored = new Map<string, Progress>();
  readonly logs = new Map<string, StoredEvent[]>();
  private seq = 0;

  constructor(private readonly now: () => number = Date.now) {}

  async sync(userId: string, incoming: SyncInput): Promise<SyncOutcome> {
    const current = this.stored.get(userId) ?? { cards: [], bestTimes: {} };
    const merged = mergeProgress(current, clampToNow(incoming, this.now()));
    const log = [...(this.logs.get(userId) ?? [])];
    const sent = eventsUpToNow(incoming.events ?? [], this.now());
    let seq = this.seq;
    for (const event of sent) {
      if (!log.some((e) => e.id === event.id)) log.push({ ...event, seq: ++seq });
    }
    if (
      merged.cards.length > MAX_CARDS ||
      Object.keys(merged.bestTimes).length > MAX_GAMES ||
      (merged.notes ?? []).length > MAX_NOTES ||
      log.length > MAX_EVENTS
    ) {
      return { ok: false, error: 'too_many' };
    }
    this.seq = seq;
    merged.cards.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    merged.places?.sort((a, b) => a.script.localeCompare(b.script));
    merged.notes?.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    this.stored.set(userId, merged);
    this.logs.set(userId, log);
    const ids = new Set(sent.map((e) => e.id));
    const page = log.filter((e) => e.seq > (incoming.since ?? 0) || ids.has(e.id));
    return {
      ok: true,
      progress: {
        ...structuredClone(merged),
        events: structuredClone(page.slice(0, EVENT_PAGE)),
        more: page.length > EVENT_PAGE,
      },
    };
  }
}
