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

/** A ḥalaqa in "my ḥalaqāt" (apps/api/src/halaqat/repository.ts). */
export interface HalaqaSummary {
  id: string;
  name: string;
  oneToOne: boolean;
  role: 'teacher' | 'student';
  status: 'pending' | 'active';
  teacherName: string | null;
  students: number;
  /** Only the teacher sees how many wait for approval. */
  pending: number | null;
}

export interface HalaqaMember {
  userId: string;
  name: string | null;
  email: string | null;
  role: 'teacher' | 'student';
  status: 'pending' | 'active';
  joinedAt: string;
}

export interface HalaqaDetail {
  id: string;
  name: string;
  oneToOne: boolean;
  teacherName: string | null;
  createdAt: string;
}

/** GET /halaqat/:id: students see the ḥalaqa; its teacher also the members and the link. */
export type HalaqaView =
  | { role: 'student'; halaqa: HalaqaDetail }
  | {
      role: 'teacher';
      halaqa: HalaqaDetail;
      members: HalaqaMember[];
      invite: { createdAt: string; expiresAt: string } | null;
    };

export interface InvitePreview {
  halaqaId: string;
  name: string;
  oneToOne: boolean;
  teacherName: string | null;
}

const HALAQAT = '/api/v1/halaqat';

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

  /** The ḥalaqāt the signed-in person belongs to, pending ones included (spec T1). */
  halaqat(): Promise<ApiResult<{ halaqat: HalaqaSummary[] }>> {
    return apiRequest(this.fetchImpl, HALAQAT);
  }

  createHalaqa(name: string, oneToOne: boolean): Promise<ApiResult<{ id: string }>> {
    return apiRequest(this.fetchImpl, HALAQAT, {
      method: 'POST',
      body: JSON.stringify({ name, oneToOne }),
    });
  }

  halaqa(id: string): Promise<ApiResult<HalaqaView>> {
    return apiRequest(this.fetchImpl, `${HALAQAT}/${encodeURIComponent(id)}`);
  }

  /** A new invite link's token (shown once); the previous link stops working. */
  newInvite(id: string): Promise<ApiResult<{ token: string; expiresAt: string }>> {
    return apiRequest(this.fetchImpl, `${HALAQAT}/${encodeURIComponent(id)}/invites`, {
      method: 'POST',
      body: '{}',
    });
  }

  revokeInvites(id: string): Promise<ApiResult<unknown>> {
    return apiRequest(this.fetchImpl, `${HALAQAT}/${encodeURIComponent(id)}/invites`, {
      method: 'DELETE',
    });
  }

  approveMember(id: string, userId: string): Promise<ApiResult<unknown>> {
    return apiRequest(
      this.fetchImpl,
      `${HALAQAT}/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}/approve`,
      { method: 'POST', body: '{}' }
    );
  }

  removeMember(id: string, userId: string): Promise<ApiResult<unknown>> {
    return apiRequest(
      this.fetchImpl,
      `${HALAQAT}/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );
  }

  leaveHalaqa(id: string): Promise<ApiResult<unknown>> {
    return apiRequest(this.fetchImpl, `${HALAQAT}/${encodeURIComponent(id)}/membership`, {
      method: 'DELETE',
    });
  }

  /** Where an invite link leads; the token travels in the body, never in a URL. */
  previewInvite(token: string): Promise<ApiResult<{ halaqa: InvitePreview }>> {
    return apiRequest(this.fetchImpl, `${HALAQAT}/invites/preview`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  joinHalaqa(
    token: string
  ): Promise<
    ApiResult<{ halaqa: { id: string; name: string }; status: 'pending' | 'active' }>
  > {
    return apiRequest(this.fetchImpl, `${HALAQAT}/join`, {
      method: 'POST',
      body: JSON.stringify({ token }),
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
