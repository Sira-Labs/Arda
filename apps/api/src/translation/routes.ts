/**
 * Translation of a written remark, mounted at /api/v1 (ADR-0020):
 *
 *   POST /translations  { text, from?, to } → { status, text, … }
 *
 * Teachers use it to see what a student will read before sending; the listening queue (T3)
 * calls the same service when it delivers a remark. Only teachers and admins may call it
 * (`feedback:translate`); it is never a general-purpose translator.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import { LANGUAGES } from '../i18n/languages.js';
import { MAX_REMARK_LENGTH, type TranslationService } from './service.js';

export interface TranslationRouteDeps {
  service: TranslationService;
  auth: AuthResolver;
  log: AuthorizeLog;
}

const Body = z
  .object({
    text: z.string().trim().min(1).max(MAX_REMARK_LENGTH),
    from: z.enum(LANGUAGES).nullable().optional(),
    to: z.enum(LANGUAGES),
  })
  .strict();

export function createTranslationRoutes(deps: TranslationRouteDeps): Hono<ActorEnv> {
  const app = new Hono<ActorEnv>();

  app.post(
    '/translations',
    authorize(deps.auth, 'feedback:translate', deps.log),
    async (c) => {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'invalid_json' }, 400);
      }
      const parsed = Body.safeParse(body);
      if (!parsed.success) {
        return c.json(
          { error: 'invalid_body', issues: parsed.error.issues.map((i) => i.message) },
          400
        );
      }
      const outcome = await deps.service.translate({
        userId: c.get('actor').id,
        text: parsed.data.text,
        from: parsed.data.from ?? null,
        to: parsed.data.to,
      });
      c.header('Cache-Control', 'no-store');
      return c.json(outcome);
    }
  );

  return app;
}
