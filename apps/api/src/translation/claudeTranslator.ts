/**
 * Translation with Claude through the official Anthropic SDK (ADR-0020).
 *
 * - Model `claude-opus-5-5` by default, effort `low`: short remarks need no deep reasoning, and
 *   this model's default effort is `medium`, so it is set explicitly.
 * - Server-side refusal fallback (`fallbacks: "default"`): a declined request is retried on the
 *   model Anthropic recommends for that refusal category; a final refusal is reported as such.
 * - The fixed instructions are far below the minimum cacheable prompt length, so no prompt
 *   caching; repeated remarks are served from our own `translations` cache instead.
 */
import Anthropic from '@anthropic-ai/sdk';
import {
  TRANSLATION_INSTRUCTIONS,
  translationPrompt,
  type TranslationRequest,
  type TranslationResult,
  type Translator,
} from './translator.js';

export const DEFAULT_TRANSLATION_MODEL = 'claude-opus-5-5';
/** A remark is at most 1000 characters; its translation fits easily. */
const MAX_OUTPUT_TOKENS = 2000;

export interface TranslatorLog {
  warn(obj: object, msg: string): void;
}

/** The part of the SDK client this adapter calls (a fake in tests). */
export type BetaMessagesClient = Pick<Anthropic, 'beta'>;

export class ClaudeTranslator implements Translator {
  constructor(
    private readonly client: BetaMessagesClient,
    readonly model: string = DEFAULT_TRANSLATION_MODEL,
    private readonly log?: TranslatorLog
  ) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: TRANSLATION_INSTRUCTIONS,
        messages: [{ role: 'user', content: translationPrompt(request) }],
      });
    } catch (error) {
      // Never log the remark: status and type are enough to act on.
      if (error instanceof Anthropic.APIError) {
        this.log?.warn(
          { status: error.status, type: error.name, model: this.model },
          'translate.api_error'
        );
        return { ok: false, reason: 'failed' };
      }
      throw error;
    }
    if (response.stop_reason === 'refusal') {
      this.log?.warn(
        { model: response.model, category: response.stop_details?.category ?? null },
        'translate.refused'
      );
      return { ok: false, reason: 'refused' };
    }
    const text = response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('')
      .trim();
    if (!text) return { ok: false, reason: 'empty' };
    if (response.stop_reason === 'max_tokens') {
      this.log?.warn({ model: response.model }, 'translate.truncated');
      return { ok: false, reason: 'empty' };
    }
    return { ok: true, text };
  }
}
