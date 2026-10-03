/**
 * Translating a remark for a student (ADR-0020): same language → the original; cached → the
 * cached text; otherwise the translator, within the teacher's daily limit. A failure never
 * blocks the teacher: the caller delivers the original with "translation unavailable".
 */
import type { Language } from '../i18n/languages.js';
import { sourceHash, type TranslationRepository } from './repository.js';
import type { Translator } from './translator.js';

export const MAX_REMARK_LENGTH = 1000;

export type TranslateOutcome =
  | { status: 'original'; text: string }
  | { status: 'translated'; text: string; model: string; cached: boolean }
  | { status: 'unavailable'; reason: 'not_configured' | 'limit' | 'refused' | 'failed' };

export interface TranslationServiceOptions {
  translator: Translator | null;
  repo: TranslationRepository;
  dailyLimit: number;
}

export class TranslationService {
  constructor(private readonly options: TranslationServiceOptions) {}

  get enabled(): boolean {
    return this.options.translator !== null;
  }

  async translate(input: {
    userId: string;
    text: string;
    from: Language | null;
    to: Language;
  }): Promise<TranslateOutcome> {
    const text = input.text.trim();
    if (input.from === input.to) return { status: 'original', text };
    const translator = this.options.translator;
    if (!translator) return { status: 'unavailable', reason: 'not_configured' };

    const hash = sourceHash(text);
    const cached = await this.options.repo.find(hash, input.to);
    if (cached) {
      return {
        status: 'translated',
        text: cached.text,
        model: cached.model,
        cached: true,
      };
    }
    if ((await this.options.repo.countLastDay(input.userId)) >= this.options.dailyLimit) {
      return { status: 'unavailable', reason: 'limit' };
    }
    const result = await translator.translate({ text, from: input.from, to: input.to });
    if (!result.ok) {
      return {
        status: 'unavailable',
        reason: result.reason === 'refused' ? 'refused' : 'failed',
      };
    }
    await this.options.repo.save({
      createdBy: input.userId,
      sourceHash: hash,
      from: input.from,
      to: input.to,
      sourceText: text,
      text: result.text,
      model: translator.model,
    });
    return {
      status: 'translated',
      text: result.text,
      model: translator.model,
      cached: false,
    };
  }
}
