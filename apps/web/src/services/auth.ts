/**
 * Sign-in against ʿArḍa's API (ADR-0004, the same flow as Suffa): a magic link by mail, the
 * six-digit code from the same mail, or a passkey (services/passkeys.ts). The session is an
 * httpOnly cookie on the same origin; nothing about it is stored by scripts.
 */
import { apiRequest, type ApiResult, type Fetch } from './api/request';

export type Role = 'student' | 'teacher' | 'admin';

/** The signed-in person as GET /api/v1/me returns them. */
export interface Me {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  timeZone: string | null;
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

const MESSAGES: Record<string, string> = {
  invalid_redirect: 'Ungültige Rücksprungadresse.',
  cross_origin: 'Diese Anfrage kam von einer anderen Seite.',
  INVALID_OTP: 'Der Code stimmt nicht.',
  OTP_EXPIRED: 'Der Code ist abgelaufen – fordere einen neuen Link an.',
  TOO_MANY_ATTEMPTS: 'Zu viele falsche Versuche – fordere einen neuen Link an.',
};

/** Only paths inside the app are sent as the place to return to after the link. */
export function safeReturnPath(value: string | null | undefined): string {
  return value && /^\/(?![/\\])/.test(value) ? value : '/';
}

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

  /** Mails a sign-in link (and code) to `email`; the link returns to `returnTo`. */
  requestLink(email: string, returnTo?: string): Promise<ApiResult<unknown>> {
    return apiRequest(
      this.fetchImpl,
      '/api/v1/auth/sign-in/magic-link',
      {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          callbackURL: safeReturnPath(returnTo),
          errorCallbackURL: '/anmelden?fehler=link',
        }),
      },
      MESSAGES
    );
  }

  /** Signs this browser in with the six-digit code from the mail. */
  enterCode(email: string, code: string): Promise<ApiResult<unknown>> {
    return apiRequest(
      this.fetchImpl,
      '/api/v1/auth/sign-in/email-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp: code.replace(/\D/g, '') }),
      },
      MESSAGES
    );
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
