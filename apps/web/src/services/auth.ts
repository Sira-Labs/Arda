/**
 * Sign-in against ʿArḍa's API (ADR-0004, the same flow as Suffa): a magic link by mail, the
 * six-digit code from the same mail, or a passkey (services/passkeys.ts). The session is an
 * httpOnly cookie on the same origin; nothing about it is stored by scripts.
 */
import type { Language } from '@/i18n/languages';
import { apiRequest, type ApiResult, type Fetch } from './api/request';

export type Role = 'student' | 'teacher' | 'admin';

/** The signed-in person as GET /api/v1/me returns them. */
export interface Me {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  timeZone: string | null;
  /** Null until chosen; the app then uses the browser's language (ADR-0020). */
  language: Language | null;
}

/** A device (session) as the account page lists it. */
export interface Device {
  id: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  userAgent: string | null;
  current: boolean;
}

/** Only paths inside the app are sent as the place to return to after the link. */
export function safeReturnPath(value: string | null | undefined): string {
  return value && /^\/(?![/\\])/.test(value) ? value : '/';
}

/** The api's answer for a written remark (apps/api/src/translation/service.ts). */
export type TranslateOutcome =
  | { status: 'original'; text: string }
  | { status: 'translated'; text: string; model: string; cached: boolean }
  | { status: 'unavailable'; reason: 'not_configured' | 'limit' | 'refused' | 'failed' };

export class AuthClient {
  constructor(private readonly fetchImpl: Fetch = (...args) => fetch(...args)) {}

  /** The signed-in person, null when nobody is signed in (401) or sign-in is off (404). */
  async me(): Promise<ApiResult<Me | null>> {
    const result = await apiRequest<Me>(this.fetchImpl, '/api/v1/me');
    if (!result.ok && (result.status === 401 || result.status === 404)) {
      return { ok: true, value: null };
    }
    return result;
  }

  /**
   * Mails a sign-in link (and code) to `email` in `language` (the mail follows the language
   * chosen on this page); the link returns to `returnTo`.
   */
  requestLink(
    email: string,
    language: Language,
    returnTo?: string
  ): Promise<ApiResult<unknown>> {
    return apiRequest(this.fetchImpl, '/api/v1/auth/sign-in/magic-link', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        callbackURL: safeReturnPath(returnTo),
        errorCallbackURL: '/anmelden?fehler=link',
        metadata: { language },
      }),
    });
  }

  /** Signs this browser in with the six-digit code from the mail. */
  enterCode(email: string, code: string): Promise<ApiResult<unknown>> {
    return apiRequest(this.fetchImpl, '/api/v1/auth/sign-in/email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), otp: code.replace(/\D/g, '') }),
    });
  }

  /** Stores the person's language on the account (interface, mails, translations). */
  saveLanguage(language: Language): Promise<ApiResult<unknown>> {
    return apiRequest(this.fetchImpl, '/api/v1/account/settings', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    });
  }

  /** What a student reading `to` will see for a written remark (teachers only, ADR-0020). */
  translate(input: {
    text: string;
    from: Language;
    to: Language;
  }): Promise<ApiResult<TranslateOutcome>> {
    return apiRequest(this.fetchImpl, '/api/v1/translations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  signOut(): Promise<ApiResult<unknown>> {
    return apiRequest(this.fetchImpl, '/api/v1/auth/sign-out', {
      method: 'POST',
      body: '{}',
    });
  }

  devices(): Promise<ApiResult<{ sessions: Device[] }>> {
    return apiRequest(this.fetchImpl, '/api/v1/account/sessions');
  }

  endOtherDevices(): Promise<ApiResult<{ revoked: number }>> {
    return apiRequest(this.fetchImpl, '/api/v1/account/sessions/revoke-others', {
      method: 'POST',
      body: '{}',
    });
  }
}
