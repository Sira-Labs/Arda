/**
 * The speech check as the api sees it (ADR-0013, update 2026-11-15): `arda-speech` hears one
 * recitation and answers, per word and rule, `good` or `check`. The service is internal and
 * has no internet access; the api sends it the sound and the range, never the student.
 *
 *   POST {ARDA_SPEECH_URL}/v1/check?sura=&from=&to=&riwaya=hafs
 *   Authorization: Bearer {ARDA_SPEECH_TOKEN}      Content-Type: the take's format
 *   → 200 { "model": "…", "words": [{ "aya": 1, "word": 2, "topic": "ghunna", "verdict": "check" }] }
 *
 * What comes back is checked like any input: a hint for a word outside the recited āyāt, an
 * unknown topic or the same word and topic twice fails the whole answer.
 */
import { z } from 'zod';
import { marksFit, type RecordingMime } from '../recordings/repository.js';
import { TOPICS, type Topic } from '../rules/repository.js';

export const HINT_VERDICTS = ['good', 'check'] as const;
export type HintVerdict = (typeof HINT_VERDICTS)[number];

/** What the service says of one word and one rule. Never "wrong": the teacher decides. */
export interface Hint {
  aya: number;
  word: number;
  topic: Topic;
  verdict: HintVerdict;
}

/** The most hints one answer may carry: every word of a long range with a few rules each. */
export const MAX_HINTS = 5000;
/** The riwāya the packs and the check know today (ADR-0017). */
export const RIWAYA = 'hafs';

export interface SpeechInput {
  range: { sura: number; from: number; to: number };
  mime: RecordingMime;
  audio: Buffer;
}

export interface SpeechResult {
  model: string;
  hints: Hint[];
}

/** Why a check did not give hints; `reason` is a short code kept with the failed check. */
export class SpeechCheckError extends Error {
  constructor(readonly reason: string) {
    super(`speech check failed: ${reason}`);
    this.name = 'SpeechCheckError';
  }
}

export interface SpeechChecker {
  /**
   * Hints for one recitation; throws `SpeechCheckError`. Aborting `stop` ends the check with
   * the reason `stopped` (the api is shutting down).
   */
  check(input: SpeechInput, stop?: AbortSignal): Promise<SpeechResult>;
}

/** The reason of a check ended by the api's shutdown: the try is given back, not counted. */
export const STOPPED = 'stopped';

/** What went wrong while talking to the service, as a reason; `null` for anything else. */
function transportReason(error: unknown, stop?: AbortSignal): string | null {
  if (stop?.aborted) return STOPPED;
  if (error instanceof Error && error.name === 'TimeoutError') return 'timeout';
  // fetch reports a refused connection, a reset or a redirect as a TypeError.
  if (error instanceof TypeError) return 'unreachable';
  return null;
}

const Answer = z
  .object({
    model: z.string().trim().min(1).max(100),
    words: z
      .array(
        z
          .object({
            aya: z.number().int().min(1),
            word: z.number().int().min(1),
            topic: z.enum(TOPICS),
            verdict: z.enum(HINT_VERDICTS),
          })
          .strict()
      )
      .max(MAX_HINTS),
  })
  .strict();

/** The service's answer as hints, or the reason it cannot be used. */
export function parseAnswer(
  body: unknown,
  range: SpeechInput['range']
): SpeechResult | { reason: string } {
  const parsed = Answer.safeParse(body);
  if (!parsed.success) return { reason: 'answer_shape' };
  const { model, words } = parsed.data;
  if (!marksFit(range, words)) return { reason: 'answer_place' };
  const keys = new Set(words.map((h) => `${h.aya}:${h.word}:${h.topic}`));
  if (keys.size !== words.length) return { reason: 'answer_duplicate' };
  return {
    model,
    hints: [...words].sort(
      (a, b) => a.aya - b.aya || a.word - b.word || a.topic.localeCompare(b.topic)
    ),
  };
}

/** A check may take a while on a CPU host; a take is at most ten minutes long. */
export const SPEECH_TIMEOUT_MS = 120_000;

export class HttpSpeechChecker implements SpeechChecker {
  constructor(
    private readonly settings: { url: string; token: string },
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs: number = SPEECH_TIMEOUT_MS
  ) {}

  async check(input: SpeechInput, stop?: AbortSignal): Promise<SpeechResult> {
    const { sura, from, to } = input.range;
    const query = new URLSearchParams({
      sura: String(sura),
      from: String(from),
      to: String(to),
      riwaya: RIWAYA,
    });
    const timeout = AbortSignal.timeout(this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.settings.url}/v1/check?${query}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.settings.token}`,
          'content-type': input.mime,
        },
        body: input.audio,
        // Never follow the service elsewhere: the sound stays on our servers (ADR-0012).
        redirect: 'error',
        signal: stop ? AbortSignal.any([timeout, stop]) : timeout,
      });
    } catch (error) {
      const reason = transportReason(error, stop);
      if (reason) throw new SpeechCheckError(reason);
      throw error;
    }
    if (!response.ok) throw new SpeechCheckError(`http_${response.status}`);
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) throw new SpeechCheckError('answer_json');
      // The timeout, a reset or the shutdown can also strike while the answer is read.
      const reason = transportReason(error, stop);
      if (reason) throw new SpeechCheckError(reason);
      throw error;
    }
    const result = parseAnswer(body, input.range);
    if ('reason' in result) throw new SpeechCheckError(result.reason);
    return result;
  }
}
