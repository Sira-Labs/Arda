/**
 * Recitations (spec F7, T3; ADR-0012), mounted at /api/v1:
 *
 *   POST   /halaqat/:id/recordings                send a take to the ḥalaqa  halaqa:study
 *   GET    /halaqat/:id/recordings                the teacher's queue         halaqa:review
 *   GET    /halaqat/:id/recordings/:rid/audio     hear it                     halaqa:review
 *   PUT    /halaqat/:id/recordings/:rid/review    answer it                   halaqa:review
 *   GET    /recordings                            my recordings and answers   recitation:own
 *   GET    /recordings/:rid/audio                 hear my own                 recitation:own
 *   DELETE /recordings/:rid                       delete my own               recitation:own
 *
 * The take is the request body itself (its Content-Type the format), what it recites in the
 * query. Sound is served with byte ranges: Safari plays media only from servers that answer
 * them. Every answer is private and never cached.
 */
import type { Context, MiddlewareHandler } from 'hono';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { isAyaRange } from '@arda/quran';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import type { Actor, HalaqaScope } from '../authz/policies.js';
import type { HalaqaRepository } from '../halaqat/repository.js';
import {
  RECORDING_MIMES,
  REMARK_IDS,
  VERDICTS,
  type Audio,
  type RecordingMime,
  type RecordingRepository,
} from './repository.js';

export interface RecordingRouteDeps {
  repo: RecordingRepository;
  /** How the caller relates to the ḥalaqa in the path. */
  halaqat: Pick<HalaqaRepository, 'membership'>;
  auth: AuthResolver;
  log: AuthorizeLog & { info(obj: object, msg: string): void };
}

/** Ten minutes of speech at the bitrates browsers record with stays well below this. */
export const MAX_BYTES = 6_000_000;
/** The longest take: a long āya range at a slow pace. */
export const MAX_DURATION_MS = 600_000;
/** Recordings one student may keep; they can delete old ones. */
export const MAX_RECORDINGS_PER_STUDENT = 500;
/** One page of a list. */
export const PAGE_SIZE = 50;

const Id = z.string().uuid();

const Meta = z
  .object({
    clientId: Id,
    sura: z.coerce.number().int(),
    from: z.coerce.number().int(),
    to: z.coerce.number().int(),
    durationMs: z.coerce.number().int().min(1).max(MAX_DURATION_MS),
    assignment: Id.optional(),
  })
  .strict()
  .refine((meta) => isAyaRange({ sura: meta.sura, from: meta.from, to: meta.to }), {
    message: 'range',
  });

const ReviewBody = z
  .object({
    verdict: z.enum(VERDICTS),
    remark: z.enum(REMARK_IDS).nullable().default(null),
    note: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .default(null)
      .transform((note) => (note ? note : null)),
  })
  .strict();

/** The format named by a Content-Type such as `audio/webm;codecs=opus`. */
export function mimeOf(contentType: string | undefined): RecordingMime | null {
  const type = contentType?.split(';')[0]?.trim().toLowerCase();
  return (RECORDING_MIMES as readonly string[]).includes(type ?? '')
    ? (type as RecordingMime)
    : null;
}

/**
 * The part of `size` bytes a `Range: bytes=…` header asks for: the whole when there is none,
 * `null` when it cannot be satisfied. Only single ranges; a multipart answer is never needed
 * by a media element.
 */
export function rangeOf(
  header: string | undefined,
  size: number
): { start: number; end: number; partial: boolean } | null {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  let start: number;
  let end: number;
  if (match[1] === '') {
    // The last N bytes.
    const suffix = Number(match[2]);
    if (suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return null;
  return { start, end, partial: true };
}

/** The sound, whole or the asked-for part, never cached by anyone. */
function audioResponse(c: Context, audio: Audio): Response {
  const size = audio.data.length;
  const range = rangeOf(c.req.header('range'), size);
  const headers: Record<string, string> = {
    'Content-Type': audio.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
  };
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, 'Content-Range': `bytes */${size}` },
    });
  }
  const body = audio.data.subarray(range.start, range.end + 1);
  headers['Content-Length'] = String(body.length);
  if (range.partial)
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
  return new Response(body, { status: range.partial ? 206 : 200, headers });
}

async function readJson(c: Context): Promise<unknown | undefined> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

const invalid = (c: Context, issues: string[]) =>
  c.json({ error: 'invalid_body', issues }, 400);
const notFound = (c: Context) => c.json({ error: 'not_found' }, 404);

export function createRecordingRoutes(deps: RecordingRouteDeps): Hono<ActorEnv> {
  const app = new Hono<ActorEnv>();

  const scopeOf = async (c: Context, actor: Actor): Promise<HalaqaScope> => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success) return { halaqaRole: null };
    const membership = await deps.halaqat.membership(id.data, actor.id);
    return { halaqaRole: membership?.status === 'active' ? membership.role : null };
  };
  const own = authorize(deps.auth, 'recitation:own', deps.log);
  const study = authorize(deps.auth, 'halaqa:study', deps.log, scopeOf);
  const review = authorize(deps.auth, 'halaqa:review', deps.log, scopeOf);

  const noStore: MiddlewareHandler = async (c, next) => {
    await next();
    if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'no-store');
  };
  app.use('/recordings', noStore);
  app.use('/recordings/*', noStore);
  app.use('/halaqat/:id/recordings', noStore);
  app.use('/halaqat/:id/recordings/*', noStore);

  /** A page cursor from the query, `undefined` without one, `null` when malformed. */
  const cursor = (c: Context): string | undefined | null => {
    const before = c.req.query('before');
    if (before === undefined) return undefined;
    return Id.safeParse(before).success ? before : null;
  };

  // Stops reading a body past the limit, whatever Content-Length claims (or when absent).
  const sizeLimit = bodyLimit({
    maxSize: MAX_BYTES,
    onError: (c) => c.json({ error: 'too_large' }, 413),
  });

  app.post('/halaqat/:id/recordings', study, sizeLimit, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    if (!halaqaId.success) return notFound(c);
    const meta = Meta.safeParse(c.req.query());
    if (!meta.success)
      return invalid(
        c,
        meta.error.issues.map((i) => i.message)
      );
    const mime = mimeOf(c.req.header('content-type'));
    if (!mime) return c.json({ error: 'unsupported_media_type' }, 415);
    // Refuse a declared oversize body before reading it.
    const declared = Number(c.req.header('content-length') ?? '0');
    if (declared > MAX_BYTES) return c.json({ error: 'too_large' }, 413);
    const audio = Buffer.from(await c.req.arrayBuffer());
    if (audio.length > MAX_BYTES) return c.json({ error: 'too_large' }, 413);
    if (audio.length === 0) return invalid(c, ['audio']);
    const actor = c.get('actor');
    const outcome = await deps.repo.save(
      {
        clientId: meta.data.clientId,
        halaqaId: halaqaId.data,
        studentId: actor.id,
        assignmentId: meta.data.assignment ?? null,
        range: { sura: meta.data.sura, from: meta.data.from, to: meta.data.to },
        mime,
        durationMs: meta.data.durationMs,
        audio,
      },
      MAX_RECORDINGS_PER_STUDENT
    );
    switch (outcome.status) {
      case 'not_member':
        return notFound(c);
      case 'assignment':
        return invalid(c, ['assignment']);
      case 'limit':
        return c.json({ error: 'too_many_recordings' }, 409);
      case 'existing':
        return c.json({ id: outcome.id }, 200);
      case 'created':
        deps.log.info(
          {
            userId: actor.id,
            halaqaId: halaqaId.data,
            recordingId: outcome.id,
            bytes: audio.length,
          },
          'recording.sent'
        );
        return c.json({ id: outcome.id }, 201);
    }
  });

  app.get('/halaqat/:id/recordings', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    const before = cursor(c);
    if (!halaqaId.success) return notFound(c);
    if (before === null) return invalid(c, ['before']);
    return c.json(await deps.repo.queue(halaqaId.data, { before, limit: PAGE_SIZE }));
  });

  app.get('/halaqat/:id/recordings/:rid/audio', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    const recordingId = Id.safeParse(c.req.param('rid'));
    if (!halaqaId.success || !recordingId.success) return notFound(c);
    const audio = await deps.repo.halaqaAudio(halaqaId.data, recordingId.data);
    return audio ? audioResponse(c, audio) : notFound(c);
  });

  app.put('/halaqat/:id/recordings/:rid/review', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    const recordingId = Id.safeParse(c.req.param('rid'));
    if (!halaqaId.success || !recordingId.success) return notFound(c);
    const body = ReviewBody.safeParse(await readJson(c));
    if (!body.success)
      return invalid(
        c,
        body.error.issues.map((i) => String(i.path[0]))
      );
    const actor = c.get('actor');
    if (!(await deps.repo.review(halaqaId.data, recordingId.data, body.data, actor.id))) {
      return notFound(c);
    }
    deps.log.info(
      {
        userId: actor.id,
        halaqaId: halaqaId.data,
        recordingId: recordingId.data,
        verdict: body.data.verdict,
      },
      'recording.reviewed'
    );
    return c.body(null, 204);
  });

  app.get('/recordings', own, async (c) => {
    const before = cursor(c);
    if (before === null) return invalid(c, ['before']);
    return c.json(await deps.repo.own(c.get('actor').id, { before, limit: PAGE_SIZE }));
  });

  app.get('/recordings/:rid/audio', own, async (c) => {
    const recordingId = Id.safeParse(c.req.param('rid'));
    if (!recordingId.success) return notFound(c);
    const audio = await deps.repo.ownAudio(c.get('actor').id, recordingId.data);
    return audio ? audioResponse(c, audio) : notFound(c);
  });

  app.delete('/recordings/:rid', own, async (c) => {
    const recordingId = Id.safeParse(c.req.param('rid'));
    if (!recordingId.success) return notFound(c);
    if (!(await deps.repo.remove(c.get('actor').id, recordingId.data)))
      return notFound(c);
    deps.log.info(
      { userId: c.get('actor').id, recordingId: recordingId.data },
      'recording.deleted'
    );
    return c.body(null, 204);
  });

  return app;
}
