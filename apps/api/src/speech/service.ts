/**
 * Runs the speech check over the recordings that wait for it (ADR-0013 update 2026-11-15):
 * takes a few, asks `arda-speech` one after the other and keeps the hints. Until the worker
 * role exists (ADR-0003) the api does this itself, in small turns between requests.
 */
import { SpeechCheckError, type SpeechChecker } from './checker.js';
import type { SpeechRepository } from './repository.js';

/** One recording at a time: the model is slow and the host small. */
export const SPEECH_BATCH = 1;
/** A recording the service cannot hear is left alone after this many tries. */
export const SPEECH_MAX_ATTEMPTS = 3;
/** Longer than a check can take, so a lease only runs out when its api instance died. */
export const SPEECH_LEASE_MS = 10 * 60_000;
/** How often the api looks for recordings to check. */
export const SPEECH_INTERVAL_MS = 30_000;

export interface SpeechLog {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

export interface SpeechTurn {
  checked: number;
  failed: number;
}

export class SpeechCheckService {
  private running = false;

  constructor(
    private readonly deps: {
      checker: SpeechChecker;
      repo: SpeechRepository;
      log: SpeechLog;
    }
  ) {}

  /** One turn: checks up to `SPEECH_BATCH` recordings. Never throws for a failed check. */
  async runOnce(): Promise<SpeechTurn> {
    const { checker, repo, log } = this.deps;
    const turn: SpeechTurn = { checked: 0, failed: 0 };
    const claimed = await repo.claim({
      limit: SPEECH_BATCH,
      maxAttempts: SPEECH_MAX_ATTEMPTS,
      leaseMs: SPEECH_LEASE_MS,
    });
    for (const recording of claimed) {
      try {
        const result = await checker.check(recording);
        await repo.done(recording.id, result.model, result.hints);
        turn.checked++;
        log.info(
          { recordingId: recording.id, model: result.model, hints: result.hints.length },
          'speech.checked'
        );
      } catch (error) {
        if (!(error instanceof SpeechCheckError)) throw error;
        await repo.failed(recording.id, error.reason);
        turn.failed++;
        log.warn({ recordingId: recording.id, reason: error.reason }, 'speech.failed');
      }
    }
    return turn;
  }

  /**
   * Looks for work every `intervalMs`; a turn still running is not started twice. Returns the
   * function that stops it.
   */
  start(intervalMs: number = SPEECH_INTERVAL_MS): () => void {
    const tick = () => {
      if (this.running) return;
      this.running = true;
      this.runOnce()
        .catch((error: unknown) =>
          this.deps.log.error({ err: error }, 'speech.turn_failed')
        )
        .finally(() => {
          this.running = false;
        });
    };
    const timer = setInterval(tick, intervalMs);
    // The poll never keeps the process alive on its own.
    timer.unref();
    return () => clearInterval(timer);
  }
}
