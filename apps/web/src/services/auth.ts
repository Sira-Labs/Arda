/**
 * Sign-in against ʿArḍa's API (ADR-0004, the same flow as Suffa): a magic link by mail, the
 * six-digit code from the same mail, or a passkey (services/passkeys.ts). The session is an
 * httpOnly cookie on the same origin; nothing about it is stored by scripts.
 */
import type { RuleId } from '@arda/tajweed';
import type { Language } from '@/i18n/languages';
import type { RemarkId } from '@/i18n/messages';
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

/** The second factor (TOTP) of the signed-in person; admins need it (ADR-0005). */
export interface SecondFactorStatus {
  enabled: boolean;
  /** This session confirmed a code recently. */
  confirmed: boolean;
}

/** A person as the admin area lists them. */
export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string;
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

export type AssignmentKind = 'learn' | 'read' | 'recite' | 'practise';

/** Consecutive āyāt of one sūra (`AyaRange` in @arda/quran). */
export interface AssignmentRange {
  sura: number;
  from: number;
  to: number;
  /** Word `from` of āya `from` to word `to` of āya `to`, from 1 (S3.2); absent: whole āyāt. */
  words?: { from: number; to: number };
}

/** What every view of an assignment shows (spec T2, ADR-0014). */
export interface AssignmentBase {
  id: string;
  kind: AssignmentKind;
  /** The one student it is for, or `null` for the whole ḥalaqa. */
  studentId: string | null;
  range: AssignmentRange | null;
  focusRule: RuleId | null;
  repetitions: number | null;
  note: string | null;
  /** `YYYY-MM-DD`. */
  dueOn: string;
  createdAt: string;
}

/** An assignment as the student it is for sees it. */
export interface StudentAssignment extends AssignmentBase {
  halaqaId: string;
  halaqaName: string;
  fromName: string | null;
  doneAt: string | null;
}

/** An assignment as its teacher sees it: for whom, and who is done. */
export interface TeacherAssignment extends AssignmentBase {
  studentName: string | null;
  targets: number;
  done: { userId: string; name: string | null; email: string | null; doneAt: string }[];
}

export type AssignmentPage =
  | { role: 'teacher'; assignments: TeacherAssignment[]; more: boolean }
  | { role: 'student'; assignments: StudentAssignment[]; more: boolean };

export interface NewAssignment {
  kind: AssignmentKind;
  studentId: string | null;
  range: AssignmentRange | null;
  focusRule: RuleId | null;
  repetitions: number | null;
  note: string | null;
  dueOn: string;
}

const HALAQAT = '/api/v1/halaqat';

/** What a recitation recites: āyāt of one sūra. */
export interface RecitedRange {
  sura: number;
  from: number;
  to: number;
}

export type Verdict = 'good' | 'again';

/** The teacher's answer to a recitation (apps/api/src/recordings/repository.ts). */
export interface RecitationReview {
  verdict: Verdict;
  remark: RemarkId | null;
  note: string | null;
  reviewerName: string | null;
  reviewedAt: string;
}

interface RecitationBase {
  id: string;
  halaqaId: string;
  assignmentId: string | null;
  range: RecitedRange;
  mime: string;
  bytes: number;
  durationMs: number;
  createdAt: string;
  review: RecitationReview | null;
}

/** One of the student's own recitations. */
export interface OwnRecitation extends RecitationBase {
  halaqaName: string;
}

/** A recitation in a teacher's queue. */
export interface QueuedRecitation extends RecitationBase {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
}

export interface RecitationPage<T> {
  recordings: T[];
  more: boolean;
}

/** A take to send: its sound and what it recites. */
export interface RecitationUpload {
  clientId: string;
  halaqaId: string;
  assignmentId: string | null;
  range: RecitedRange;
  mime: string;
  durationMs: number;
  blob: Blob;
}

/** The review deck as the account stores it (ADR-0022): cards as a list. */
export interface ProgressPayload {
  cards: unknown[];
  bestTimes: Record<string, number>;
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

  /** Sends this device's deck; the answer is the account's deck merged with it (ADR-0022). */
  syncProgress(deck: ProgressPayload): Promise<ApiResult<ProgressPayload>> {
    return apiRequest(this.fetchImpl, '/api/v1/progress/sync', {
      method: 'POST',
      body: JSON.stringify(deck),
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

  /** What the signed-in student still has to do, across their ḥalaqāt, soonest due first. */
  openAssignments(): Promise<ApiResult<{ assignments: StudentAssignment[] }>> {
    return apiRequest(this.fetchImpl, '/api/v1/assignments');
  }

  /** A page of the ḥalaqa's assignments; pass the last id shown to get older ones. */
  assignments(halaqaId: string, before?: string): Promise<ApiResult<AssignmentPage>> {
    const query = before ? `?before=${encodeURIComponent(before)}` : '';
    return apiRequest(
      this.fetchImpl,
      `${HALAQAT}/${encodeURIComponent(halaqaId)}/assignments${query}`
    );
  }

  giveAssignment(
    halaqaId: string,
    assignment: NewAssignment
  ): Promise<ApiResult<{ id: string }>> {
    return apiRequest(
      this.fetchImpl,
      `${HALAQAT}/${encodeURIComponent(halaqaId)}/assignments`,
      {
        method: 'POST',
        body: JSON.stringify(assignment),
      }
    );
  }

  removeAssignment(halaqaId: string, id: string): Promise<ApiResult<unknown>> {
    return apiRequest(
      this.fetchImpl,
      `${HALAQAT}/${encodeURIComponent(halaqaId)}/assignments/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  }

  /** Marks the student's assignment done (`true`), or takes the mark back. */
  markAssignment(
    halaqaId: string,
    id: string,
    done: boolean
  ): Promise<ApiResult<unknown>> {
    return apiRequest(
      this.fetchImpl,
      `${HALAQAT}/${encodeURIComponent(halaqaId)}/assignments/${encodeURIComponent(id)}/done`,
      done ? { method: 'PUT', body: '{}' } : { method: 'DELETE' }
    );
  }

  /**
   * Sends a take to the ḥalaqa: the sound as the body, what it recites in the query. The same
   * client id again returns the stored one, so the outbox may retry safely.
   */
  async sendRecitation(take: RecitationUpload): Promise<ApiResult<{ id: string }>> {
    const query = new URLSearchParams({
      clientId: take.clientId,
      sura: String(take.range.sura),
      from: String(take.range.from),
      to: String(take.range.to),
      durationMs: String(Math.max(1, Math.round(take.durationMs))),
      ...(take.assignmentId ? { assignment: take.assignmentId } : {}),
    });
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${HALAQAT}/${encodeURIComponent(take.halaqaId)}/recordings?${query.toString()}`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': take.mime },
          body: take.blob,
        }
      );
    } catch {
      return { ok: false, status: 0, code: 'offline' };
    }
    const body = (await response.json().catch(() => null)) as {
      id?: string;
      error?: string;
    } | null;
    if (!response.ok)
      return { ok: false, status: response.status, code: body?.error ?? '' };
    return { ok: true, value: { id: body?.id ?? '' } };
  }

  /** The signed-in student's recitations, newest first. */
  myRecitations(before?: string): Promise<ApiResult<RecitationPage<OwnRecitation>>> {
    const query = before ? `?before=${encodeURIComponent(before)}` : '';
    return apiRequest(this.fetchImpl, `/api/v1/recordings${query}`);
  }

  deleteRecitation(id: string): Promise<ApiResult<unknown>> {
    return apiRequest(this.fetchImpl, `/api/v1/recordings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  /** Where the student hears their own recitation (same origin, the session cookie). */
  ownRecitationAudio(id: string): string {
    return `/api/v1/recordings/${encodeURIComponent(id)}/audio`;
  }

  /** The ḥalaqa's recitations: those waiting first. */
  recitationQueue(
    halaqaId: string,
    before?: string
  ): Promise<ApiResult<RecitationPage<QueuedRecitation>>> {
    const query = before ? `?before=${encodeURIComponent(before)}` : '';
    return apiRequest(
      this.fetchImpl,
      `${HALAQAT}/${encodeURIComponent(halaqaId)}/recordings${query}`
    );
  }

  /** Where a teacher hears a recitation sent to the ḥalaqa. */
  queuedRecitationAudio(halaqaId: string, id: string): string {
    return `${HALAQAT}/${encodeURIComponent(halaqaId)}/recordings/${encodeURIComponent(id)}/audio`;
  }

  reviewRecitation(
    halaqaId: string,
    id: string,
    review: { verdict: Verdict; remark: RemarkId | null; note: string | null }
  ): Promise<ApiResult<unknown>> {
    return apiRequest(
      this.fetchImpl,
      `${HALAQAT}/${encodeURIComponent(halaqaId)}/recordings/${encodeURIComponent(id)}/review`,
      { method: 'PUT', body: JSON.stringify(review) }
    );
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

  secondFactor(): Promise<ApiResult<SecondFactorStatus>> {
    return apiRequest(this.fetchImpl, '/api/v1/account/2fa');
  }

  /** Starts setting up the second factor: the authenticator app's link and its secret. */
  setUpSecondFactor(): Promise<ApiResult<{ uri: string; secret: string }>> {
    return apiRequest(this.fetchImpl, '/api/v1/account/2fa/setup', {
      method: 'POST',
      body: '{}',
    });
  }

  /** A code from the authenticator app: enables a new setup and confirms this session. */
  confirmSecondFactor(code: string): Promise<ApiResult<unknown>> {
    return apiRequest(this.fetchImpl, '/api/v1/account/2fa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  /** People, newest first, optionally searched by address or name (admins). */
  adminUsers(
    search: string,
    cursor?: string
  ): Promise<ApiResult<{ users: AdminUser[]; next: string | null }>> {
    const query = new URLSearchParams();
    if (search.trim()) query.set('q', search.trim());
    if (cursor) query.set('cursor', cursor);
    const suffix = query.size ? `?${query.toString()}` : '';
    return apiRequest(this.fetchImpl, `/api/v1/admin/users${suffix}`);
  }

  /** Changes a person's role or blocks them (admins; audit-logged by the api). */
  updateUser(
    id: string,
    change: { role?: Role; disabled?: boolean }
  ): Promise<ApiResult<AdminUser>> {
    return apiRequest(this.fetchImpl, `/api/v1/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(change),
    });
  }
}
