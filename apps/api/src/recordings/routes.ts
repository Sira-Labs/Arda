/**
 * Recitations (spec F7, T3; ADR-0012), mounted at /api/v1:
 *
 *   POST   /halaqat/:id/recordings                send a take to the ḥalaqa  halaqa:study
 *   GET    /halaqat/:id/recordings                the teacher's queue         halaqa:review
 *   GET    /halaqat/:id/recordings/:rid/audio     hear it                     halaqa:review
 *   PUT    /halaqat/:id/recordings/:rid/review    answer it                   halaqa:review
 *   PUT    /halaqat/:id/recordings/:rid/voice-note   answer it aloud          halaqa:review
 *   GET    /halaqat/:id/recordings/:rid/voice-note   hear the answer          halaqa:review
 *   DELETE /halaqat/:id/recordings/:rid/voice-note   take it back             halaqa:review
 *   GET    /recordings                            my recordings and answers   recitation:own
 *   GET    /recordings/:rid/audio                 hear my own                 recitation:own
 *   GET    /recordings/:rid/voice-note            hear the teacher's answer   recitation:own
 *   DELETE /recordings/:rid                       delete my own               recitation:own
 *
 * The take is the request body itself (its Content-Type the format), what it recites in the
 * query; so is the teacher's voice note, its length in the query. Sound is served with byte ranges: Safari plays media only from servers that answer
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
import { TOPICS } from '../rules/repository.js';
import {
  MAX_MARKS,
  RECORDING_MIMES,
  REMARK_IDS,
  VERDICTS,
  byPlace,
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
/** The longest voice note: a spoken answer, not a lesson. */
export const MAX_VOICE_NOTE_MS = 120_000;
/** Two minutes at the bitrates browsers record with, Safari's AAC included. */
export const MAX_VOICE_NOTE_BYTES = 2_500_000;
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

const VoiceNoteMeta = z
  .object({ durationMs: z.coerce.number().int().min(1).max(MAX_VOICE_NOTE_MS) })
  .strict();

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
    // Words of the recited āyāt that need work, each with the rule it was about if he said;
    // each once, kept in reading order.
    marks: z
      .array(
        z
          .object({
            aya: z.number().int().min(1),
            word: z.number().int().min(1),
            topic: z.enum(TOPICS).nullable().default(null),
          })
          .strict()
      )
      .max(MAX_MARKS)
      .default([])
      .refine(
        (marks) => new Set(marks.map((m) => `${m.aya}:${m.word}`)).size === marks.length,
        { message: 'duplicate' }
      )
      .transform((marks) => [...marks].sort(byPlace)),
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
const tooLarge = (c: Context) => c.json({ error: 'too_large' }, 413);

/**
 * The sound in the request body, or the answer refusing it: a format the api does not keep,
 * more than `maxBytes` (declared or read), or nothing.
 */
async function bodyAudio(
  c: Context,
  maxBytes: number
): Promise<{ mime: RecordingMime; audio: Buffer } | Response> {
  const mime = mimeOf(c.req.header('content-type'));
  if (!mime) return c.json({ error: 'unsupported_media_type' }, 415);
  // Refuse a declared oversize body before reading it.
  const declared = Number(c.req.header('content-length') ?? '0');
  if (declared > maxBytes) return tooLarge(c);
  const audio = Buffer.from(await c.req.arrayBuffer());
  if (audio.length > maxBytes) return tooLarge(c);
  if (audio.length === 0) return invalid(c, ['audio']);
  return { mime, audio };
}

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
  const sizeLimit = bodyLimit({ maxSize: MAX_BYTES, onError: tooLarge });
  const voiceNoteLimit = bodyLimit({ maxSize: MAX_VOICE_NOTE_BYTES, onError: tooLarge });

  app.post('/halaqat/:id/recordings', study, sizeLimit, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    if (!halaqaId.success) return notFound(c);
    const meta = Meta.safeParse(c.req.query());
    if (!meta.success)
      return invalid(
        c,
        meta.error.issues.map((i) => i.message)
      );
    const sound = await bodyAudio(c, MAX_BYTES);
    if (sound instanceof Response) return sound;
    const { mime, audio } = sound;
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
    const outcome = await deps.repo.review(
      halaqaId.data,
      recordingId.data,
      body.data,
      actor.id
    );
    if (outcome === 'not_found') return notFound(c);
    if (outcome === 'marks') return invalid(c, ['marks']);
    deps.log.info(
      {
        userId: actor.id,
        halaqaId: halaqaId.data,
        recordingId: recordingId.data,
        verdict: body.data.verdict,
        marks: body.data.marks.length,
      },
      'recording.reviewed'
    );
    return c.body(null, 204);
  });

  app.put(
    '/halaqat/:id/recordings/:rid/voice-note',
    review,
    voiceNoteLimit,
    async (c) => {
      const halaqaId = Id.safeParse(c.req.param('id'));
      const recordingId = Id.safeParse(c.req.param('rid'));
      if (!halaqaId.success || !recordingId.success) return notFound(c);
      const meta = VoiceNoteMeta.safeParse(c.req.query());
      if (!meta.success)
        return invalid(
          c,
          meta.error.issues.map((i) => String(i.path[0] ?? 'query'))
        );
      const sound = await bodyAudio(c, MAX_VOICE_NOTE_BYTES);
      if (sound instanceof Response) return sound;
      const actor = c.get('actor');
      const outcome = await deps.repo.saveVoiceNote(
        halaqaId.data,
        recordingId.data,
        { mime: sound.mime, durationMs: meta.data.durationMs, audio: sound.audio },
        actor.id
      );
      if (outcome === 'not_found') return notFound(c);
      if (outcome === 'not_reviewed') return c.json({ error: 'not_reviewed' }, 409);
      deps.log.info(
        {
          userId: actor.id,
          halaqaId: halaqaId.data,
          recordingId: recordingId.data,
          bytes: sound.audio.length,
        },
        'recording.voice_note_saved'
      );
      return c.body(null, 204);
    }
  );

  app.get('/halaqat/:id/recordings/:rid/voice-note', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    const recordingId = Id.safeParse(c.req.param('rid'));
    if (!halaqaId.success || !recordingId.success) return notFound(c);
    const audio = await deps.repo.halaqaVoiceNote(halaqaId.data, recordingId.data);
    return audio ? audioResponse(c, audio) : notFound(c);
  });

  app.delete('/halaqat/:id/recordings/:rid/voice-note', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    const recordingId = Id.safeParse(c.req.param('rid'));
    if (!halaqaId.success || !recordingId.success) return notFound(c);
    if (!(await deps.repo.removeVoiceNote(halaqaId.data, recordingId.data)))
      return notFound(c);
    deps.log.info(
      {
        userId: c.get('actor').id,
        halaqaId: halaqaId.data,
        recordingId: recordingId.data,
      },
      'recording.voice_note_removed'
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

  app.get('/recordings/:rid/voice-note', own, async (c) => {
    const recordingId = Id.safeParse(c.req.param('rid'));
    if (!recordingId.success) return notFound(c);
    const audio = await deps.repo.ownVoiceNote(c.get('actor').id, recordingId.data);
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
