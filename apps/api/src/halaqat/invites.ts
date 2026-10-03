/**
 * Invite tokens (ADR-0005, Suffa's design): 192 random bits, base64url, shown to the teacher
 * once; the database keeps only the SHA-256. The web app puts the token in the link's
 * fragment (`/beitreten#…`), which browsers never send to a server or a log.
 */
import { createHash, randomBytes } from 'node:crypto';

export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
/** 24 bytes in base64url: exactly 32 characters. */
const TOKEN = /^[A-Za-z0-9_-]{32}$/;

export function newInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Whether `value` has the shape of an invite token (before any lookup). */
export function isInviteToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN.test(value);
}
