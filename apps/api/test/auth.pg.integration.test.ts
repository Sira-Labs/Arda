/**
 * Sign-in by magic link against a real Postgres (Better Auth with our table mapping).
 * Run with ARDA_TEST_DATABASE_URL=postgres://… ; skipped otherwise. The database is wiped.
 */
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ChainResolver, createAuth, SessionResolver } from '../src/auth/betterAuth.js';
import type { Mailer } from '../src/auth/mailer.js';
import { loadMigrations, migrate } from '../src/migrate.js';
import { PgAdminRepository } from '../src/admin/repository.js';
import { PgAccountRepository } from '../src/account/repository.js';
import { PgPrivacyRepository } from '../src/privacy/repository.js';
import {
  PgProgressRepository,
  type ProgressCard,
  type StudyNote,
} from '../src/progress/repository.js';
import {
  PgRecordingRepository,
  type NewRecording,
} from '../src/recordings/repository.js';
import {
  PgSecondFactorRepository,
  SecondFactorService,
} from '../src/account/secondFactor.js';
import { writeAudit } from '../src/audit/log.js';
import { SecretBox } from '../src/security/secretBox.js';
import { base32Decode, stepAt, totpAt } from '../src/security/totp.js';
import { SoftAuthenticator } from './softAuthenticator.js';
import type { Language } from '../src/i18n/languages.js';
import { PgTranslationRepository, sourceHash } from '../src/translation/repository.js';
import { PgHalaqaRepository } from '../src/halaqat/repository.js';
import { PgArdaLogRepository } from '../src/ardaLog/repository.js';
import {
  PgAssignmentRepository,
  type NewAssignment,
} from '../src/assignments/repository.js';
import { hashInviteToken, newInviteToken } from '../src/halaqat/invites.js';
import { TranslationService } from '../src/translation/service.js';

const url = process.env.ARDA_TEST_DATABASE_URL;
const PUBLIC_URL = 'http://localhost:5173';
const OLD_URL = 'https://old.example.org';
const quiet = { info: () => undefined, warn: () => undefined, error: () => undefined };

class CapturingMailer implements Mailer {
  links: { email: string; url: string; code: string; language?: Language }[] = [];
  async sendMagicLink(
    email: string,
    url: string,
    code: string,
    language?: Language
  ): Promise<void> {
    this.links.push({ email, url, code, language });
  }
}

describe.skipIf(!url)('Magic-link sign-in (Postgres)', () => {
  let pool: pg.Pool;
  let mailer: CapturingMailer;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, max: 4 });
    await pool.query('drop schema public cascade; create schema public');
    await migrate(
      pool,
      await loadMigrations(join(import.meta.dirname, '..', 'migrations')),
      quiet
    );
  });

  beforeEach(async () => {
    await pool.query(
      'truncate users, rate_limits, verifications, audit_log, translations cascade'
    );
    mailer = new CapturingMailer();
    const auth = createAuth({
      pool,
      secret: 'test-secret-0123456789-abcdefghijklmnop',
      publicUrl: PUBLIC_URL,
      trustedOrigins: [OLD_URL, 'capacitor://localhost'],
      mailer,
      production: false,
      rateLimit: true,
    });
    const sessions = new SessionResolver(auth);
    app = createApp({
      version: 'test',
      expectedRevision: null,
      health: {
        schemaRevision: async () => null,
      },
      auth: { handler: (request) => auth.handler(request), me: (h) => sessions.me(h) },
      admin: {
        repo: new PgAdminRepository(pool),
        auth: new ChainResolver([sessions]),
        log: quiet,
      },
      account: {
        repo: new PgAccountRepository(pool),
        privacy: new PgPrivacyRepository(pool),
        sessions: { actor: (h) => sessions.sessionActor(h) },
        secondFactor: new SecondFactorService(
          new PgSecondFactorRepository(pool),
          new SecretBox('test-secret-0123456789-abcdefghijklmnop', 'totp')
        ),
        audit: ({ actorId, action, ip }) =>
          writeAudit(pool, {
            actorId,
            action,
            targetType: 'user',
            targetId: actorId,
            ipAddress: ip,
          }),
        log: quiet,
      },
      allowedOrigin: [PUBLIC_URL, OLD_URL],
      appOrigins: ['capacitor://localhost'],
    });
  });

  afterAll(async () => {
    await pool?.end();
  });

  const requestLink = (email: string, ip = '203.0.113.7') =>
    app.request('/api/v1/auth/sign-in/magic-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: PUBLIC_URL,
        'x-real-ip': ip,
      },
      body: JSON.stringify({ email, callbackURL: '/settings' }),
    });

  /** Opens the link from the mail; returns the response and the session cookie. */
  const openLink = async (link: string) => {
    const target = new URL(link);
    expect(target.origin).toBe(PUBLIC_URL);
    const response = await app.request(`${target.pathname}${target.search}`, {
      headers: { 'x-real-ip': '203.0.113.7' },
    });
    const cookie = (response.headers.getSetCookie?.() ?? [])
      .map((c) => c.split(';')[0])
      .filter((c) => c?.startsWith('arda.session_token='))
      .join('; ');
    return { response, cookie };
  };

  it('signs in with the link from the mail and knows the user', async () => {
    expect((await requestLink('Amina@Example.org')).status).toBe(200);
    expect(mailer.links).toHaveLength(1);
    expect(mailer.links[0]!.email.toLowerCase()).toBe('amina@example.org');

    const { response, cookie } = await openLink(mailer.links[0]!.url);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${PUBLIC_URL}/settings`);
    expect(cookie).toMatch(/^arda\.session_token=/);
    // The session cookie is out of reach for scripts and not sent on cross-site requests.
    const attributes = (response.headers.getSetCookie?.() ?? []).find((c) =>
      c.startsWith('arda.session_token=')
    );
    expect(attributes).toMatch(/;\s*HttpOnly/i);
    expect(attributes).toMatch(/;\s*SameSite=Lax/i);

    const me = await app.request('/api/v1/me', { headers: { cookie } });
    expect(me.status).toBe(200);
    const body = (await me.json()) as { id: string; email: string; role: string };
    expect(body).toMatchObject({ email: 'amina@example.org', role: 'student' });
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);

    // The session opens the account area for exactly this user.
    const devices = await app.request('/api/v1/account/sessions', {
      headers: { cookie },
    });
    expect(devices.status).toBe(200);
    const stored = await pool.query('select email_verified from users where id = $1', [
      body.id,
    ]);
    expect(stored.rows[0]).toEqual({ email_verified: true });
  });

  it('signs the native app in with a bearer token from the same mail link (ADR-0019)', async () => {
    const APP = 'capacitor://localhost';
    const requested = await app.request('/api/v1/auth/sign-in/magic-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: APP,
        'x-real-ip': '203.0.113.9',
      },
      body: JSON.stringify({ email: 'app@example.org', callbackURL: '/' }),
    });
    expect(requested.status).toBe(200);
    expect(requested.headers.get('access-control-allow-origin')).toBe(APP);
    // The app opens the link itself (Universal Link) without the callback: JSON, no redirect.
    const link = new URL(mailer.links[0]!.url);
    link.searchParams.delete('callbackURL');
    const verified = await app.request(`${link.pathname}${link.search}`, {
      headers: { origin: APP, 'x-real-ip': '203.0.113.9' },
    });
    expect(verified.status).toBe(200);
    const token = verified.headers.get('set-auth-token');
    expect(token).toMatch(/\./);
    expect(verified.headers.get('access-control-expose-headers')).toContain(
      'set-auth-token'
    );

    const me = await app.request('/api/v1/me', {
      headers: { authorization: `Bearer ${token}`, origin: APP },
    });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { email: string }).email).toBe('app@example.org');
    // Only signed tokens count: the bare session id is refused.
    const bare = token!.split('.')[0];
    expect(
      (await app.request('/api/v1/me', { headers: { authorization: `Bearer ${bare}` } }))
        .status
    ).toBe(401);
    // Writes from the app's origin pass the cross-site guard with the bearer token.
    const write = await app.request('/api/v1/account/settings', {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        origin: APP,
        'sec-fetch-site': 'cross-site',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ timeZone: 'Europe/Zurich' }),
    });
    expect(write.status).toBe(204);
  });

  const enterCode = (email: string, otp: string, origin = PUBLIC_URL) =>
    app.request('/api/v1/auth/sign-in/email-otp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin,
        'x-real-ip': '203.0.113.20',
      },
      body: JSON.stringify({ email, otp }),
    });

  it('signs in with the code from the mail in another browser, once', async () => {
    await requestLink('Code@Example.org');
    const { code } = mailer.links[0]!;
    expect(code).toMatch(/^\d{6}$/);
    // Stored hashed, like the link.
    const stored = await pool.query<{ value: string }>(
      "select value from verifications where identifier = 'sign-in-otp-code@example.org'"
    );
    expect(stored.rows[0]!.value).not.toContain(code);

    const response = await enterCode('code@example.org', code);
    expect(response.status).toBe(200);
    // The browser gets the httpOnly cookie only: no token for scripts to read.
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('set-auth-token')).toBeNull();
    const cookie = (response.headers.getSetCookie?.() ?? [])
      .map((c) => c.split(';')[0])
      .filter((c) => c?.startsWith('arda.session_token='))
      .join('; ');
    const me = await app.request('/api/v1/me', { headers: { cookie } });
    expect(((await me.json()) as { email: string }).email).toBe('code@example.org');

    expect((await enterCode('code@example.org', code)).status).toBe(400);
  });

  it('replaces the code with each new mail and locks it after five wrong guesses', async () => {
    await requestLink('guess@example.org');
    await requestLink('guess@example.org');
    const [first, second] = mailer.links;
    const wrong = second!.code === '000000' ? '111111' : '000000';
    // The last mail's code counts; the first one's is a wrong guess (unless they happen to match).
    const guesses = [
      first!.code === second!.code ? wrong : first!.code,
      wrong,
      wrong,
      wrong,
      wrong,
    ];
    for (const guess of guesses) {
      expect((await enterCode('guess@example.org', guess)).status).toBe(400);
    }
    expect((await enterCode('guess@example.org', second!.code)).status).toBe(403);
  });

  it('hands the native app its bearer token for a code', async () => {
    const APP = 'capacitor://localhost';
    await requestLink('app-code@example.org');
    const response = await enterCode('app-code@example.org', mailer.links[0]!.code, APP);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-auth-token')).toMatch(/\./);
  });

  it("keeps the code plugin's own mail routes closed", async () => {
    const response = await app.request('/api/v1/auth/email-otp/send-verification-otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: PUBLIC_URL },
      body: JSON.stringify({ email: 'x@example.org', type: 'sign-in' }),
    });
    expect(response.status).toBe(404);
  });

  it('uses each link only once and stores it hashed', async () => {
    await requestLink('once@example.org');
    const link = mailer.links[0]!.url;
    const token = new URL(link).searchParams.get('token')!;
    const stored = await pool.query('select identifier, value from verifications');
    expect(JSON.stringify(stored.rows)).not.toContain(token);

    expect((await openLink(link)).cookie).not.toBe('');
    const second = await openLink(link);
    expect(second.cookie).toBe('');
  });

  it('refuses a callback to another site (no open redirect)', async () => {
    const response = await app.request('/api/v1/auth/sign-in/magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: PUBLIC_URL },
      body: JSON.stringify({
        email: 'x@example.org',
        callbackURL: 'https://evil.example',
      }),
    });
    expect(response.status).toBe(400);
    expect(mailer.links).toHaveLength(0);

    // A link tampered with afterwards is refused as well.
    await requestLink('y@example.org');
    const link = new URL(mailer.links[0]!.url);
    link.searchParams.set('callbackURL', '//evil.example/x');
    const opened = await app.request(`${link.pathname}${link.search}`);
    expect(opened.status).toBe(400);
    expect(opened.headers.get('location')).toBeNull();
  });

  it('rejects requests without a session', async () => {
    expect((await app.request('/api/v1/me')).status).toBe(401);
    expect((await app.request('/api/v1/account/sessions')).status).toBe(401);
    const forged = 'arda.session_token=forged.value';
    expect(
      (await app.request('/api/v1/me', { headers: { cookie: forged } })).status
    ).toBe(401);
  });

  it('limits sign-in mails per client', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++)
      statuses.push((await requestLink(`r${i}@example.org`)).status);
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
    expect(mailer.links).toHaveLength(5);
    // Another client is not affected.
    expect((await requestLink('other@example.org', '198.51.100.9')).status).toBe(200);
  });

  it('ignores a client-chosen X-Forwarded-For for rate limits', async () => {
    // Rotating the first hop must not open a fresh budget: only X-Real-IP (set by Caddy) counts.
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const response = await app.request('/api/v1/auth/sign-in/magic-link', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: PUBLIC_URL,
          'x-real-ip': '192.0.2.44',
          'x-forwarded-for': `10.0.0.${i}`,
        },
        body: JSON.stringify({
          email: `spoof${i}@example.org`,
          callbackURL: '/settings',
        }),
      });
      statuses.push(response.status);
    }
    expect(statuses.at(-1)).toBe(429);
  });

  it('signs out: the session stops working at once', async () => {
    await requestLink('bye@example.org');
    const { cookie } = await openLink(mailer.links[0]!.url);
    const out = await app.request('/api/v1/auth/sign-out', {
      method: 'POST',
      headers: { cookie, origin: PUBLIC_URL },
    });
    expect(out.status).toBe(200);
    expect((await app.request('/api/v1/me', { headers: { cookie } })).status).toBe(401);
  });

  it('applies a role change on the next request (no stale role in the cookie)', async () => {
    await requestLink('lehrer@example.org');
    const { cookie } = await openLink(mailer.links[0]!.url);
    const role = async () =>
      (
        (await (await app.request('/api/v1/me', { headers: { cookie } })).json()) as {
          role: string;
        }
      ).role;
    const users = () => app.request('/api/v1/admin/users', { headers: { cookie } });
    expect(await role()).toBe('student');
    expect(await (await users()).json()).toEqual({ error: 'forbidden' });

    await pool.query(
      "update users set role = 'admin' where email = 'lehrer@example.org'"
    );
    expect(await role()).toBe('admin');
    // Now an admin – the admin area still asks for the second factor, not for the role.
    expect(await (await users()).json()).toEqual({ error: 'second_factor_required' });

    await pool.query(
      "update users set role = 'student' where email = 'lehrer@example.org'"
    );
    expect(await role()).toBe('student');
    expect(await (await users()).json()).toEqual({ error: 'forbidden' });
  });

  /** Signs in once more as the same person, like a second device. */
  const signInDevice = async (email: string, ip: string) => {
    await requestLink(email, ip);
    return (await openLink(mailer.links.at(-1)!.url)).cookie;
  };

  it('lists devices and signs out the others at once (story A3)', async () => {
    const laptop = await signInDevice('zwei@example.org', '203.0.113.20');
    const phone = await signInDevice('zwei@example.org', '203.0.113.21');
    const get = (cookie: string, path: string) =>
      app.request(path, { headers: { cookie } });

    const list = await get(laptop, '/api/v1/account/sessions');
    const { sessions } = (await list.json()) as {
      sessions: { id: string; current: boolean }[];
    };
    expect(sessions).toHaveLength(2);
    expect(sessions.filter((s) => s.current)).toHaveLength(1);

    const revoke = await app.request('/api/v1/account/sessions/revoke-others', {
      method: 'POST',
      headers: { cookie: laptop, origin: PUBLIC_URL },
    });
    expect(await revoke.json()).toEqual({ revoked: 1 });
    // The phone's session fails on its very next request; the laptop keeps working.
    expect((await get(phone, '/api/v1/me')).status).toBe(401);
    expect((await get(laptop, '/api/v1/me')).status).toBe(200);
  });

  it("never ends another user's session", async () => {
    const mine = await signInDevice('eins@example.org', '203.0.113.30');
    const theirs = await signInDevice('andere@example.org', '203.0.113.31');
    const { rows } = await pool.query<{ id: string }>(
      "select s.id from sessions s join users u on u.id = s.user_id where u.email = 'andere@example.org'"
    );
    const response = await app.request(`/api/v1/account/sessions/${rows[0]!.id}`, {
      method: 'DELETE',
      headers: { cookie: mine, origin: PUBLIC_URL },
    });
    expect(response.status).toBe(404);
    expect(
      (await app.request('/api/v1/me', { headers: { cookie: theirs } })).status
    ).toBe(200);
  });

  it('stores the time zone and returns it with /me', async () => {
    const cookie = await signInDevice('zeit@example.org', '203.0.113.40');
    const patch = await app.request('/api/v1/account/settings', {
      method: 'PATCH',
      headers: { cookie, origin: PUBLIC_URL, 'content-type': 'application/json' },
      body: JSON.stringify({ timeZone: 'Asia/Riyadh' }),
    });
    expect(patch.status).toBe(204);
    const me = await app.request('/api/v1/me', { headers: { cookie } });
    expect(await me.json()).toMatchObject({
      email: 'zeit@example.org',
      timeZone: 'Asia/Riyadh',
    });
  });

  it('accepts sign-in and writes from the old domain while moving', async () => {
    const response = await app.request('/api/v1/auth/sign-in/magic-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: OLD_URL,
        'x-real-ip': '203.0.113.70',
      },
      body: JSON.stringify({ email: 'umzug@example.org', callbackURL: '/settings' }),
    });
    expect(response.status).toBe(200);
    // The mail still links to the public URL (the new domain).
    expect(new URL(mailer.links[0]!.url).origin).toBe(PUBLIC_URL);
    const cookie = await signInDevice('umzug2@example.org', '203.0.113.71');
    const write = await app.request('/api/v1/account/sessions/revoke-others', {
      method: 'POST',
      headers: { cookie, origin: OLD_URL },
    });
    expect(write.status).toBe(200);
  });

  it('refuses a cross-site write even with a valid session cookie', async () => {
    const cookie = await signInDevice('csrf@example.org', '203.0.113.50');
    const response = await app.request('/api/v1/account/sessions/revoke-others', {
      method: 'POST',
      headers: { cookie, origin: 'https://evil.example' },
    });
    expect(response.status).toBe(403);
  });

  it('keeps Better Auth endpoints outside the allow-list closed', async () => {
    const cookie = await signInDevice('liste@example.org', '203.0.113.60');
    for (const path of ['/get-session', '/list-sessions']) {
      const response = await app.request(`/api/v1/auth${path}`, { headers: { cookie } });
      expect(response.status, path).toBe(404);
    }
  });

  /** Signs in as admin and confirms the second factor; returns the cookie. */
  const signInAdmin = async (email: string, ip: string) => {
    const cookie = await signInDevice(email, ip);
    await pool.query("update users set role = 'admin' where email = $1", [email]);
    const post = (path: string, body?: unknown) =>
      app.request(`/api/v1/account/2fa${path}`, {
        method: 'POST',
        headers: { cookie, origin: PUBLIC_URL, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    const { secret } = (await (await post('/setup')).json()) as { secret: string };
    const code = totpAt(base32Decode(secret), stepAt(Date.now()));
    expect((await post('/confirm', { code })).status).toBe(204);
    return { cookie, post, code };
  };

  it('admin area needs the second factor; a used code does not work twice (story A4)', async () => {
    const cookie = await signInDevice('chef@example.org', '203.0.113.70');
    await pool.query("update users set role = 'admin' where email = 'chef@example.org'");
    const users = () => app.request('/api/v1/admin/users', { headers: { cookie } });
    const blocked = await users();
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toEqual({ error: 'second_factor_required' });

    const post = (path: string, body?: unknown) =>
      app.request(`/api/v1/account/2fa${path}`, {
        method: 'POST',
        headers: { cookie, origin: PUBLIC_URL, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    const setup = (await (await post('/setup')).json()) as {
      uri: string;
      secret: string;
    };
    expect(setup.uri).toMatch(/^otpauth:\/\/totp\/Arda%3Achef%40example\.org/);
    const stored = await pool.query('select secret_enc from user_totp');
    expect(JSON.stringify(stored.rows)).not.toContain(setup.secret);

    expect((await post('/confirm', { code: '000000' })).status).toBe(400);
    const code = totpAt(base32Decode(setup.secret), stepAt(Date.now()));
    expect((await post('/confirm', { code })).status).toBe(204);
    expect((await users()).status).toBe(200);
    expect((await post('/confirm', { code })).status).toBe(400);

    const audit = await pool.query('select action from audit_log');
    expect(audit.rows.map((r) => r.action)).toEqual(['account.2fa_enabled']);
  });

  it('disabling a user ends their sessions at once and is audit-logged', async () => {
    const { cookie: admin } = await signInAdmin('leitung@example.org', '203.0.113.80');
    const student = await signInDevice('schueler@example.org', '203.0.113.81');
    const { rows } = await pool.query<{ id: string }>(
      "select id from users where email = 'schueler@example.org'"
    );
    const patch = (body: unknown) =>
      app.request(`/api/v1/admin/users/${rows[0]!.id}`, {
        method: 'PATCH',
        headers: {
          cookie: admin,
          origin: PUBLIC_URL,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

    const disabled = await patch({ disabled: true, role: 'teacher' });
    expect(await disabled.json()).toMatchObject({ disabled: true, role: 'teacher' });
    expect(
      (await app.request('/api/v1/me', { headers: { cookie: student } })).status
    ).toBe(401);
    // Signing in again does not help while disabled.
    const again = await signInDevice('schueler@example.org', '203.0.113.82');
    expect((await app.request('/api/v1/me', { headers: { cookie: again } })).status).toBe(
      401
    );

    await patch({ disabled: false });
    const back = await signInDevice('schueler@example.org', '203.0.113.83');
    expect((await app.request('/api/v1/me', { headers: { cookie: back } })).status).toBe(
      200
    );

    const audit = await app.request('/api/v1/admin/audit', {
      headers: { cookie: admin },
    });
    const { entries } = (await audit.json()) as {
      entries: { action: string; actorEmail: string; details: Record<string, unknown> }[];
    };
    expect(entries.map((e) => e.action)).toEqual([
      'user.enabled',
      'user.disabled',
      'user.role_changed',
      'account.2fa_enabled',
    ]);
    expect(entries[1]).toMatchObject({
      actorEmail: 'leitung@example.org',
      details: { endedSessions: 1 },
    });
    expect(entries[2]!.details).toEqual({ from: 'student', to: 'teacher' });
  });

  it('deletes the account only with the own address typed in (story A5)', async () => {
    const cookie = await signInDevice('weg@example.org', '203.0.113.90');
    const remove = (confirm: string) =>
      app.request('/api/v1/account', {
        method: 'DELETE',
        headers: { cookie, origin: PUBLIC_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ confirm }),
      });
    const exported = await app.request('/api/v1/account/export', { headers: { cookie } });
    expect(exported.headers.get('content-disposition')).toMatch(
      /attachment; filename="arda-export-/
    );
    expect(await exported.json()).toMatchObject({
      profile: { email: 'weg@example.org' },
    });

    expect((await remove('someone@example.org')).status).toBe(400);
    expect((await remove(' Weg@Example.org ')).status).toBe(204);
    expect((await app.request('/api/v1/me', { headers: { cookie } })).status).toBe(401);
    const { rows } = await pool.query(
      "select 1 from users where email = 'weg@example.org'"
    );
    expect(rows).toHaveLength(0);
  });

  describe('languages and translations (ADR-0020)', () => {
    const linkWith = (
      email: string,
      body: object,
      headers: Record<string, string> = {}
    ) =>
      app.request('/api/v1/auth/sign-in/magic-link', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: PUBLIC_URL,
          'x-real-ip': '203.0.113.120',
          ...headers,
        },
        body: JSON.stringify({ email, callbackURL: '/', ...body }),
      });

    it('mails in the chosen, then the stored, then the browser language', async () => {
      expect(
        (await linkWith('sprache@example.org', { metadata: { language: 'fr' } })).status
      ).toBe(200);
      expect(mailer.links.at(-1)?.language).toBe('fr');
      // A new address without a choice: the browser's Accept-Language.
      await linkWith('neu@example.org', {}, { 'accept-language': 'ar-SA,ar;q=0.9' });
      expect(mailer.links.at(-1)?.language).toBe('ar');
      await linkWith('ohne@example.org', {}, { 'accept-language': 'tr' });
      expect(mailer.links.at(-1)?.language).toBe('de');

      // Signed in, the person chooses English; later mails follow it without a choice.
      const cookie = (await openLink(mailer.links[0]!.url)).cookie;
      const saved = await app.request('/api/v1/account/settings', {
        method: 'PATCH',
        headers: { cookie, origin: PUBLIC_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ language: 'en' }),
      });
      expect(saved.status).toBe(204);
      const me = await app.request('/api/v1/me', { headers: { cookie } });
      expect(await me.json()).toMatchObject({
        email: 'sprache@example.org',
        language: 'en',
      });
      await linkWith('sprache@example.org', {}, { 'accept-language': 'fr' });
      expect(mailer.links.at(-1)?.language).toBe('en');
    });

    it('caches translations per teacher, counts them and exports them', async () => {
      const cookie = await signInDevice('lehrer@example.org', '203.0.113.121');
      const { rows } = await pool.query<{ id: string }>(
        "select id from users where email = 'lehrer@example.org'"
      );
      const teacherId = rows[0]!.id;
      let calls = 0;
      const service = new TranslationService({
        translator: {
          model: 'fake',
          translate: async () => {
            calls += 1;
            return { ok: true, text: 'Deine Ghunna war zu kurz.' };
          },
        },
        repo: new PgTranslationRepository(pool),
        dailyLimit: 2,
      });
      const ask = (text: string) =>
        service.translate({ userId: teacherId, text, from: 'en', to: 'de' });
      expect(await ask('Your ghunna was too short.')).toMatchObject({ cached: false });
      expect(await ask('Your ghunna was too short.')).toMatchObject({ cached: true });
      expect(await ask('Second remark')).toMatchObject({ status: 'translated' });
      expect(await ask('Third remark')).toEqual({
        status: 'unavailable',
        reason: 'limit',
      });
      expect(calls).toBe(2);
      const stored = await pool.query(
        'select target_language, source_hash from translations where created_by = $1 order by id',
        [teacherId]
      );
      expect(stored.rows[0]).toEqual({
        target_language: 'de',
        source_hash: sourceHash('Your ghunna was too short.'),
      });

      const exported = await app.request('/api/v1/account/export', {
        headers: { cookie },
      });
      const data = (await exported.json()) as { translations: { text: string }[] };
      expect(data.translations.map((t) => t.text)).toContain('Deine Ghunna war zu kurz.');
    });
  });

  describe('passkeys (ADR-0004)', () => {
    const RP_ID = new URL(PUBLIC_URL).hostname;
    const cookiesOf = (response: Response) =>
      (response.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]!);
    const join = (...parts: string[]) => parts.filter(Boolean).join('; ');

    /** Adds a passkey to a signed-in device; returns the verify-registration response. */
    const addPasskey = async (
      cookie: string,
      key: SoftAuthenticator,
      origin = PUBLIC_URL
    ) => {
      const options = await app.request(
        '/api/v1/auth/passkey/generate-register-options',
        {
          headers: { cookie, 'x-real-ip': '203.0.113.90' },
        }
      );
      expect(options.status).toBe(200);
      const body = (await options.json()) as {
        challenge: string;
        rp: { id: string };
        user: { id: string };
        authenticatorSelection: Record<string, unknown>;
      };
      expect(body.rp.id).toBe(RP_ID);
      expect(body.authenticatorSelection).toMatchObject({
        residentKey: 'required',
        userVerification: 'required',
      });
      return app.request('/api/v1/auth/passkey/verify-registration', {
        method: 'POST',
        headers: {
          cookie: join(cookie, ...cookiesOf(options)),
          origin,
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.90',
        },
        body: JSON.stringify({ response: key.register(body) }),
      });
    };

    /** Signs in with a passkey, without a session; returns the verify response. */
    const signInWithPasskey = async (key: SoftAuthenticator, headers = {}) => {
      const options = await app.request(
        '/api/v1/auth/passkey/generate-authenticate-options',
        { headers: { 'x-real-ip': '203.0.113.91' } }
      );
      expect(options.status).toBe(200);
      const body = (await options.json()) as {
        challenge: string;
        userVerification: string;
      };
      expect(body.userVerification).toBe('required');
      return app.request('/api/v1/auth/passkey/verify-authentication', {
        method: 'POST',
        headers: {
          cookie: join(...cookiesOf(options)),
          origin: PUBLIC_URL,
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.91',
          ...headers,
        },
        body: JSON.stringify({ response: key.authenticate(body, RP_ID) }),
      });
    };

    const sessionCookie = (response: Response) =>
      cookiesOf(response)
        .filter((c) => c.startsWith('arda.session_token='))
        .join('; ');

    it('adds a passkey and signs in with it, without a token for scripts', async () => {
      const cookie = await signInDevice('pass@example.org', '203.0.113.80');
      const key = new SoftAuthenticator({
        origin: PUBLIC_URL,
        synced: true,
        aaguid: 'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4',
      });
      const added = await addPasskey(cookie, key);
      expect(added.status).toBe(200);
      expect(await added.json()).toEqual({ ok: true });

      const list = await app.request('/api/v1/account/passkeys', { headers: { cookie } });
      const { passkeys } = (await list.json()) as { passkeys: Record<string, unknown>[] };
      expect(passkeys).toEqual([
        expect.objectContaining({ provider: 'Google Password Manager', synced: true }),
      ]);
      expect(JSON.stringify(passkeys)).not.toContain(key.id);

      const signedIn = await signInWithPasskey(key);
      expect(signedIn.status).toBe(200);
      expect(await signedIn.json()).toEqual({ ok: true });
      expect(signedIn.headers.get('set-auth-token')).toBeNull();
      const me = await app.request('/api/v1/me', {
        headers: { cookie: sessionCookie(signedIn) },
      });
      expect(((await me.json()) as { email: string }).email).toBe('pass@example.org');

      // The export names the passkey but carries neither key nor credential id.
      const exported = await app.request('/api/v1/account/export', {
        headers: { cookie },
      });
      const text = await exported.text();
      expect(JSON.parse(text).passkeys).toHaveLength(1);
      expect(text).not.toContain(key.id);
    });

    it('hands the native app its bearer token for a passkey', async () => {
      const cookie = await signInDevice('app-pass@example.org', '203.0.113.81');
      const key = new SoftAuthenticator({ origin: PUBLIC_URL });
      expect((await addPasskey(cookie, key)).status).toBe(200);
      // Native passkey APIs sign for the web domain; the request itself comes from the app.
      const signedIn = await signInWithPasskey(key, { origin: 'capacitor://localhost' });
      expect(signedIn.status).toBe(200);
      expect(signedIn.headers.get('set-auth-token')).toMatch(/\./);
    });

    it('refuses a passkey that did not check the PIN or biometric', async () => {
      const cookie = await signInDevice('ohnepin@example.org', '203.0.113.82');
      const key = new SoftAuthenticator({ origin: PUBLIC_URL, userVerified: false });
      expect((await addPasskey(cookie, key)).status).toBe(400);
      const { rows } = await pool.query('select 1 from passkeys');
      expect(rows).toHaveLength(0);
    });

    it('needs a session to add one and refuses another origin', async () => {
      const options = await app.request('/api/v1/auth/passkey/generate-register-options');
      expect(options.status).toBe(401);
      const cookie = await signInDevice('fremd@example.org', '203.0.113.83');
      const key = new SoftAuthenticator({ origin: 'https://evil.example' });
      const added = await addPasskey(cookie, key, 'https://evil.example');
      expect(added.status).toBeGreaterThanOrEqual(400);
    });

    it('does not sign in with a removed passkey and removes only your own', async () => {
      const cookie = await signInDevice('weg-pk@example.org', '203.0.113.84');
      const other = await signInDevice('anders-pk@example.org', '203.0.113.85');
      const key = new SoftAuthenticator({ origin: PUBLIC_URL });
      await addPasskey(cookie, key);
      const { passkeys } = (await (
        await app.request('/api/v1/account/passkeys', { headers: { cookie } })
      ).json()) as { passkeys: { id: string }[] };
      const remove = (as: string) =>
        app.request(`/api/v1/account/passkeys/${passkeys[0]!.id}`, {
          method: 'DELETE',
          headers: { cookie: as, origin: PUBLIC_URL },
        });
      expect((await remove(other)).status).toBe(404);
      expect((await remove(cookie)).status).toBe(204);
      expect((await signInWithPasskey(key)).status).toBe(401);
    });

    it('keeps the plugin routes outside the allow-list closed', async () => {
      const cookie = await signInDevice('offen@example.org', '203.0.113.86');
      for (const path of ['/passkey/list-user-passkeys', '/passkey/delete-passkey']) {
        const response = await app.request(`/api/v1/auth${path}`, {
          method: path.includes('delete') ? 'POST' : 'GET',
          headers: { cookie, origin: PUBLIC_URL, 'content-type': 'application/json' },
          body: path.includes('delete') ? '{}' : undefined,
        });
        expect(response.status, path).toBe(404);
      }
    });

    it('deletes passkeys with the account', async () => {
      const cookie = await signInDevice('kaskade@example.org', '203.0.113.87');
      await addPasskey(cookie, new SoftAuthenticator({ origin: PUBLIC_URL }));
      await pool.query("delete from users where email = 'kaskade@example.org'");
      const { rows } = await pool.query('select 1 from passkeys');
      expect(rows).toHaveLength(0);
    });
  });

  describe('ḥalaqāt (T1, ADR-0005)', () => {
    const TEACHER = '30000000-0000-4000-8000-000000000001';
    const AMINA = '30000000-0000-4000-8000-000000000002';
    const YUSUF = '30000000-0000-4000-8000-000000000003';
    const NOW = new Date('2026-10-03T12:00:00Z');
    let repo: PgHalaqaRepository;
    /** A working invite to `halaqaId`; returns the hash a join is made with. */
    const invite = async (halaqaId: string, actorId = TEACHER) => {
      const tokenHash = hashInviteToken(newInviteToken());
      await repo.createInvite({
        halaqaId,
        tokenHash,
        actorId,
        expiresAt: new Date(NOW.getTime() + 60_000),
      });
      return tokenHash;
    };

    beforeEach(async () => {
      repo = new PgHalaqaRepository(pool);
      await pool.query(
        `insert into users (id, email, name, role) values
           ($1, 'sheikh@example.org', 'Sheikh Ahmad', 'teacher'),
           ($2, 'amina@example.org', 'Amina', 'student'),
           ($3, 'yusuf@example.org', '', 'student')`,
        [TEACHER, AMINA, YUSUF]
      );
    });

    it('opens a ḥalaqa with its teacher as the first active member', async () => {
      const id = await repo.create({
        name: 'Juzʾ ʿAmma',
        oneToOne: false,
        teacherId: TEACHER,
      });
      expect(await repo.membership(id, TEACHER)).toEqual({
        role: 'teacher',
        status: 'active',
      });
      expect(await repo.countCreatedBy(TEACHER)).toBe(1);
      expect(await repo.find(id)).toMatchObject({
        name: 'Juzʾ ʿAmma',
        teacherName: 'Sheikh Ahmad',
      });
      expect(await repo.listFor(TEACHER)).toEqual([
        expect.objectContaining({ id, role: 'teacher', students: 0, pending: 0 }),
      ]);
    });

    it('keeps one working invite, found by its hash until it expires', async () => {
      const id = await repo.create({ name: 'H', oneToOne: false, teacherId: TEACHER });
      const first = newInviteToken();
      const second = newInviteToken();
      const expiresAt = new Date(NOW.getTime() + 60_000);
      await repo.createInvite({
        halaqaId: id,
        tokenHash: hashInviteToken(first),
        actorId: TEACHER,
        expiresAt,
      });
      await repo.createInvite({
        halaqaId: id,
        tokenHash: hashInviteToken(second),
        actorId: TEACHER,
        expiresAt,
      });
      expect(await repo.findInvite(hashInviteToken(first), NOW)).toBeNull();
      expect(await repo.findInvite(hashInviteToken(second), NOW)).toEqual({
        halaqaId: id,
        name: 'H',
        oneToOne: false,
        teacherName: 'Sheikh Ahmad',
      });
      expect(
        await repo.findInvite(hashInviteToken(second), new Date(expiresAt.getTime() + 1))
      ).toBeNull();
      expect(await repo.activeInvite(id, NOW)).toMatchObject({
        expiresAt: expiresAt.toISOString(),
      });
      const { rows } = await pool.query('select token_hash from halaqa_invites');
      expect(JSON.stringify(rows)).not.toContain(second);
      expect(await repo.revokeInvites(id, TEACHER)).toBe(1);
      expect(await repo.activeInvite(id, NOW)).toBeNull();
    });

    it('lets students join pending; the teacher approves and removes, audited', async () => {
      const id = await repo.create({ name: 'H', oneToOne: false, teacherId: TEACHER });
      const link = await invite(id);
      const halaqa = { id, name: 'H' };
      expect(await repo.join(link, AMINA, NOW)).toEqual({
        kind: 'joined',
        halaqa,
        status: 'pending',
      });
      expect(await repo.join(link, AMINA, NOW)).toEqual({
        kind: 'member',
        halaqa,
        status: 'pending',
      });
      expect(await repo.listFor(AMINA)).toEqual([
        expect.objectContaining({
          id,
          status: 'pending',
          pending: null,
          teacherName: 'Sheikh Ahmad',
        }),
      ]);
      expect(await repo.approve(id, AMINA, TEACHER)).toBe(true);
      expect(await repo.approve(id, AMINA, TEACHER)).toBe(false);
      expect(await repo.membership(id, AMINA)).toEqual({
        role: 'student',
        status: 'active',
      });
      expect((await repo.members(id)).map((m) => [m.email, m.role, m.status])).toEqual([
        ['sheikh@example.org', 'teacher', 'active'],
        ['amina@example.org', 'student', 'active'],
      ]);
      expect(await repo.remove(id, TEACHER, TEACHER)).toBe(false);
      expect(await repo.remove(id, AMINA, TEACHER)).toBe(true);
      const { rows } = await pool.query(
        `select action from audit_log where target_type = 'halaqa' order by id`
      );
      expect(rows.map((r) => r.action)).toEqual([
        'halaqa.invite_created',
        'halaqa.member_approved',
        'halaqa.member_removed',
      ]);
    });

    it('lets only one of two students take a one-to-one place, even at the same time', async () => {
      const id = await repo.create({ name: 'Amina', oneToOne: true, teacherId: TEACHER });
      const link = await invite(id);
      const outcomes = await Promise.all([
        repo.join(link, AMINA, NOW),
        repo.join(link, YUSUF, NOW),
      ]);
      expect(outcomes.map((o) => o.kind).sort()).toEqual(['full', 'joined']);
    });

    it('admits nobody with a link that was withdrawn, replaced or has expired', async () => {
      const id = await repo.create({ name: 'H', oneToOne: false, teacherId: TEACHER });
      const old = await invite(id);
      const current = await invite(id);
      expect(await repo.join(old, AMINA, NOW)).toEqual({ kind: 'invalid' });
      expect(await repo.join(current, AMINA, new Date(NOW.getTime() + 60_001))).toEqual({
        kind: 'invalid',
      });
      await repo.revokeInvites(id, TEACHER);
      expect(await repo.join(current, AMINA, NOW)).toEqual({ kind: 'invalid' });
      expect(await repo.membership(id, AMINA)).toBeNull();
    });

    it('treats the empty name sign-in leaves as no name, so the email shows instead', async () => {
      const id = await repo.create({ name: 'H', oneToOne: false, teacherId: YUSUF });
      await repo.join(await invite(id, YUSUF), AMINA, NOW);
      const members = await repo.members(id);
      expect(members.find((m) => m.userId === YUSUF)).toMatchObject({
        name: null,
        email: 'yusuf@example.org',
      });
      expect(await repo.find(id)).toMatchObject({ teacherName: null });
    });

    it('lets a student leave, puts memberships in the export and cascades with the teacher', async () => {
      const id = await repo.create({ name: 'H', oneToOne: false, teacherId: TEACHER });
      const link = await invite(id);
      await repo.join(link, AMINA, NOW);
      await repo.approve(id, AMINA, TEACHER);
      const exported = await new PgPrivacyRepository(pool).export(AMINA);
      // Who approved her is part of her export, without being her own action.
      expect(exported.auditLog).toEqual([
        expect.objectContaining({ action: 'halaqa.member_approved', actor_id: TEACHER }),
      ]);
      expect(exported.halaqat).toEqual([
        expect.objectContaining({
          name: 'H',
          halaqa_role: 'student',
          status: 'active',
          opened_by_you: false,
        }),
      ]);
      expect(await repo.leave(id, TEACHER)).toBe(false);
      expect(await repo.leave(id, AMINA)).toBe(true);
      await repo.join(link, AMINA, NOW);
      await pool.query('delete from users where id = $1', [TEACHER]);
      expect(await repo.find(id)).toBeNull();
      expect(await repo.listFor(AMINA)).toEqual([]);
    });
  });
  describe('assignments (T2, ADR-0014)', () => {
    const TEACHER = '40000000-0000-4000-8000-000000000001';
    const AMINA = '40000000-0000-4000-8000-000000000002';
    const YUSUF = '40000000-0000-4000-8000-000000000003';
    const ZAID = '40000000-0000-4000-8000-000000000004';
    const NOW = new Date('2026-10-03T12:00:00Z');
    let halaqat: PgHalaqaRepository;
    let repo: PgAssignmentRepository;
    let halaqaId: string;

    /** Brings `userId` into the ḥalaqa: active, or pending when `approve` is false. */
    const enrol = async (userId: string, approve = true) => {
      const tokenHash = hashInviteToken(newInviteToken());
      await halaqat.createInvite({
        halaqaId,
        tokenHash,
        actorId: TEACHER,
        expiresAt: new Date(NOW.getTime() + 60_000),
      });
      await halaqat.join(tokenHash, userId, NOW);
      if (approve) await halaqat.approve(halaqaId, userId, TEACHER);
    };
    const give = async (input: Partial<NewAssignment> = {}) => {
      const id = await repo.create({
        halaqaId,
        studentId: null,
        kind: 'read',
        range: { sura: 1, from: 1, to: 7 },
        pages: null,
        focusRule: 'ikhfa',
        repetitions: 3,
        note: 'Achte auf die Ghunna.',
        dueOn: '2026-10-09',
        createdBy: TEACHER,
        ...input,
      });
      expect(id).not.toBeNull();
      return id as string;
    };
    const page = { limit: 50 };

    beforeEach(async () => {
      halaqat = new PgHalaqaRepository(pool);
      repo = new PgAssignmentRepository(pool);
      await pool.query(
        `insert into users (id, email, name, role) values
           ($1, 'sheikh@example.org', 'Sheikh Ahmad', 'teacher'),
           ($2, 'amina@example.org', 'Amina', 'student'),
           ($3, 'yusuf@example.org', 'Yusuf', 'student'),
           ($4, 'zaid@example.org', 'Zaid', 'student')`,
        [TEACHER, AMINA, YUSUF, ZAID]
      );
      halaqaId = await halaqat.create({
        name: 'Juzʾ ʿAmma',
        oneToOne: false,
        teacherId: TEACHER,
      });
      await enrol(AMINA);
      await enrol(YUSUF);
      await enrol(ZAID, false);
    });

    it('gives work to all or one, and returns who is done to the teacher', async () => {
      const forAll = await give();
      const forAmina = await give({
        studentId: AMINA,
        kind: 'recite',
        range: { sura: 112, from: 1, to: 4 },
        pages: null,
        focusRule: null,
        repetitions: null,
        note: null,
        dueOn: '2026-10-05',
      });

      const open = await repo.open(AMINA, 50);
      expect(open.map((a) => a.id)).toEqual([forAmina, forAll]);
      expect(open[1]).toEqual({
        id: forAll,
        kind: 'read',
        studentId: null,
        range: { sura: 1, from: 1, to: 7 },
        pages: null,
        focusRule: 'ikhfa',
        repetitions: 3,
        note: 'Achte auf die Ghunna.',
        dueOn: '2026-10-09',
        createdAt: expect.any(String),
        halaqaId,
        halaqaName: 'Juzʾ ʿAmma',
        fromName: 'Sheikh Ahmad',
        doneAt: null,
      });
      expect((await repo.open(YUSUF, 50)).map((a) => a.id)).toEqual([forAll]);
      // Pending students get nothing until the teacher approves them.
      expect(await repo.open(ZAID, 50)).toEqual([]);

      expect(await repo.complete(halaqaId, forAll, AMINA)).toBe(true);
      expect(await repo.complete(halaqaId, forAll, AMINA)).toBe(true);
      expect(await repo.complete(halaqaId, forAmina, YUSUF)).toBe(false);
      expect((await repo.open(AMINA, 50)).map((a) => a.id)).toEqual([forAmina]);

      const teacher = await repo.forTeacher(halaqaId, page);
      expect(teacher.more).toBe(false);
      expect(teacher.assignments.map((a) => a.id)).toEqual([forAll, forAmina]);
      expect(teacher.assignments[0]).toMatchObject({
        targets: 2,
        studentName: null,
        done: [
          {
            userId: AMINA,
            name: 'Amina',
            email: 'amina@example.org',
            doneAt: expect.any(String),
          },
        ],
      });
      expect(teacher.assignments[1]).toMatchObject({
        studentId: AMINA,
        studentName: 'Amina',
        targets: 1,
        done: [],
      });

      const amina = await repo.forStudent(halaqaId, AMINA, page);
      expect(amina.assignments.map((a) => [a.id, a.doneAt !== null])).toEqual([
        [forAll, true],
        [forAmina, false],
      ]);
      expect((await repo.forStudent(halaqaId, YUSUF, page)).assignments).toHaveLength(1);

      expect(await repo.undo(halaqaId, forAll, AMINA)).toBe(true);
      expect(await repo.undo(halaqaId, forAll, AMINA)).toBe(true);
      expect((await repo.open(AMINA, 50)).map((a) => a.id)).toEqual([forAmina, forAll]);

      expect(await repo.remove(halaqaId, forAll)).toBe(true);
      expect(await repo.remove(halaqaId, forAll)).toBe(false);
      expect(await repo.open(YUSUF, 50)).toEqual([]);
      expect(await repo.countIn(halaqaId)).toBe(1);
    });

    it('keeps the words an assignment starts and ends at (S3.2)', async () => {
      const id = await give({
        range: { sura: 113, from: 2, to: 3, words: { from: 2, to: 4 } },
      });
      const [open] = await repo.open(AMINA, 50);
      expect(open).toMatchObject({
        id,
        range: { sura: 113, from: 2, to: 3, words: { from: 2, to: 4 } },
      });
      const plain = await give({ range: { sura: 1, from: 1, to: 7 } });
      expect((await repo.open(AMINA, 50)).find((a) => a.id === plain)?.range).toEqual({
        sura: 1,
        from: 1,
        to: 7,
      });
      // One bound without the other, or backwards inside one āya, is refused by the database.
      await expect(
        pool.query(
          `insert into assignments (halaqa_id, kind, sura, aya_from, aya_to, word_from, due_on)
           values ($1, 'read', 113, 2, 2, 3, '2026-10-09')`,
          [halaqaId]
        )
      ).rejects.toThrow();
      await expect(
        pool.query(
          `insert into assignments (halaqa_id, kind, sura, aya_from, aya_to, word_from, word_to, due_on)
           values ($1, 'read', 113, 2, 2, 3, 2, '2026-10-09')`,
          [halaqaId]
        )
      ).rejects.toThrow();
    });

    it('keeps the pages of the printed muṣḥaf an assignment names (0009)', async () => {
      const pages = { layout: 'indopak-15', from: 8, to: 9 } as const;
      const id = await give({ kind: 'read', range: null, pages });
      expect((await repo.open(AMINA, 50)).find((a) => a.id === id)).toMatchObject({
        range: null,
        pages,
      });
      const plain = await give({ range: { sura: 1, from: 1, to: 7 } });
      expect((await repo.open(AMINA, 50)).find((a) => a.id === plain)?.pages).toBeNull();
      // Reading without āyāt or pages, part of the pages, backwards, an unknown layout, and
      // pages together with āyāt are refused by the database.
      for (const [columns, values] of [
        ['', ''],
        [', page_layout, page_from', ", 'madina', 1"],
        [', page_layout, page_from, page_to', ", 'madina', 9, 8"],
        [', page_layout, page_from, page_to', ", 'warsh', 1, 1"],
        [
          ', sura, aya_from, aya_to, page_layout, page_from, page_to',
          ", 1, 1, 7, 'madina', 1, 1",
        ],
      ]) {
        await expect(
          pool.query(
            `insert into assignments (halaqa_id, kind, due_on${columns})
             values ($1, 'read', '2026-10-09'${values})`,
            [halaqaId]
          ),
          columns
        ).rejects.toThrow();
      }
    });

    it('gives only to active students of that ḥalaqa', async () => {
      for (const studentId of [ZAID, TEACHER, '40000000-0000-4000-8000-000000000009']) {
        expect(
          await repo.create({
            halaqaId,
            studentId,
            kind: 'practise',
            range: null,
            pages: null,
            focusRule: 'iqlab',
            repetitions: null,
            note: null,
            dueOn: '2026-10-09',
            createdBy: TEACHER,
          }),
          studentId
        ).toBeNull();
      }
      expect(await repo.countIn(halaqaId)).toBe(0);
    });

    it('keeps the shape of an assignment in the database too', async () => {
      const insert = (columns: string, values: string) =>
        pool.query(
          `insert into assignments (halaqa_id, kind, due_on, ${columns})
           values ($1, ${values})`,
          [halaqaId]
        );
      // Reading needs āyāt; learning needs a rule; only reading counts repetitions.
      await expect(
        insert('focus_rule', `'read', '2026-10-09', 'ikhfa'`)
      ).rejects.toThrow();
      await expect(insert('sura', `'learn', '2026-10-09', 1`)).rejects.toThrow();
      await expect(
        insert(
          'sura, aya_from, aya_to, repetitions',
          `'recite', '2026-10-09', 1, 1, 7, 2`
        )
      ).rejects.toThrow();
      await expect(
        insert('sura, aya_from, aya_to', `'read', '2026-10-09', 1, 5, 4`)
      ).rejects.toThrow();
      await expect(
        insert('focus_rule', `'learn', '2026-10-09', 'Ikhfa!'`)
      ).rejects.toThrow();
      // An assignment for one student needs that student's membership.
      await expect(
        pool.query(
          `insert into assignments (halaqa_id, student_id, kind, focus_rule, due_on)
           values ($1, $2, 'learn', 'izhar', '2026-10-09')`,
          [halaqaId, '40000000-0000-4000-8000-000000000009']
        )
      ).rejects.toThrow();
    });

    it('pages through the list without losing or repeating one', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) ids.push(await give({ dueOn: '2026-10-09' }));
      ids.push(await give({ dueOn: '2026-10-20' }));
      const seen: string[] = [];
      let before: string | undefined;
      for (;;) {
        const next = await repo.forTeacher(halaqaId, { before, limit: 2 });
        seen.push(...next.assignments.map((a) => a.id));
        if (!next.more) break;
        before = next.assignments.at(-1)!.id;
      }
      expect(seen).toHaveLength(6);
      expect(new Set(seen).size).toBe(6);
      // The latest due day first; among one day, the newest first.
      expect(seen[0]).toBe(ids[5]);
      expect(seen.slice(1)).toEqual(ids.slice(0, 5).reverse());
      const studentSeen = await repo.forStudent(halaqaId, AMINA, {
        before: seen[2],
        limit: 50,
      });
      expect(studentSeen.assignments.map((a) => a.id)).toEqual(seen.slice(3));
    });

    it("lets a student's own work go when they leave; the export and the cascade", async () => {
      const forAll = await give();
      const forAmina = await give({ studentId: AMINA });
      await repo.complete(halaqaId, forAll, AMINA);
      await repo.complete(halaqaId, forAll, YUSUF);

      const aminaExport = await new PgPrivacyRepository(pool).export(AMINA);
      expect(aminaExport.assignments).toEqual([
        expect.objectContaining({
          id: forAll,
          given_by_you: false,
          due_on: '2026-10-09',
          done_at: expect.any(Date),
        }),
        expect.objectContaining({ id: forAmina, student_id: AMINA, done_at: null }),
      ]);
      const teacherExport = await new PgPrivacyRepository(pool).export(TEACHER);
      expect(teacherExport.assignments.map((a) => a.id)).toEqual([forAll, forAmina]);
      expect(teacherExport.assignments.every((a) => a.given_by_you)).toBe(true);

      expect(await halaqat.leave(halaqaId, AMINA)).toBe(true);
      expect(await repo.countIn(halaqaId)).toBe(1);
      const teacher = await repo.forTeacher(halaqaId, page);
      expect(teacher.assignments[0]!.done.map((d) => d.userId)).toEqual([YUSUF]);
      expect(teacher.assignments[0]!.targets).toBe(1);
      expect(await repo.open(AMINA, 50)).toEqual([]);

      await pool.query('delete from users where id = $1', [YUSUF]);
      expect((await repo.forTeacher(halaqaId, page)).assignments[0]!.done).toEqual([]);

      await pool.query('delete from users where id = $1', [TEACHER]);
      expect(
        Number((await pool.query('select count(*) from assignments')).rows[0].count)
      ).toBe(0);
      expect(
        Number(
          (await pool.query('select count(*) from assignment_completions')).rows[0].count
        )
      ).toBe(0);
    });
  });
  describe('recordings (F7, T3, ADR-0012)', () => {
    const TEACHER = '50000000-0000-4000-8000-000000000001';
    const AMINA = '50000000-0000-4000-8000-000000000002';
    const YUSUF = '50000000-0000-4000-8000-000000000003';
    const NOW = new Date('2026-10-06T12:00:00Z');
    const SOUND = Buffer.from('fake opus bytes');
    let halaqat: PgHalaqaRepository;
    let repo: PgRecordingRepository;
    let halaqaId: string;
    let takes = 0;
    const take = (
      studentId: string,
      input: Partial<NewRecording> = {}
    ): NewRecording => ({
      clientId: `60000000-0000-4000-8000-${String(++takes).padStart(12, '0')}`,
      halaqaId,
      studentId,
      assignmentId: null,
      range: { sura: 112, from: 1, to: 4 },
      mime: 'audio/webm',
      durationMs: 4200,
      audio: SOUND,
      ...input,
    });
    const page = { limit: 50 };

    beforeEach(async () => {
      halaqat = new PgHalaqaRepository(pool);
      repo = new PgRecordingRepository(pool);
      await pool.query(
        `insert into users (id, email, name, role) values
           ($1, 'sheikh@example.org', 'Sheikh Ahmad', 'teacher'),
           ($2, 'amina@example.org', 'Amina', 'student'),
           ($3, 'yusuf@example.org', 'Yusuf', 'student')`,
        [TEACHER, AMINA, YUSUF]
      );
      halaqaId = await halaqat.create({
        name: 'Juzʾ ʿAmma',
        oneToOne: false,
        teacherId: TEACHER,
      });
      for (const userId of [AMINA, YUSUF]) {
        const tokenHash = hashInviteToken(newInviteToken());
        await halaqat.createInvite({
          halaqaId,
          tokenHash,
          actorId: TEACHER,
          expiresAt: new Date(NOW.getTime() + 60_000),
        });
        await halaqat.join(tokenHash, userId, NOW);
        await halaqat.approve(halaqaId, userId, TEACHER);
      }
    });

    it('stores a take once, only from an active student, within the limit', async () => {
      const input = take(AMINA);
      const first = await repo.save(input, 10);
      expect(first.status).toBe('created');
      expect(await repo.save(input, 10)).toEqual({
        status: 'existing',
        id: (first as { id: string }).id,
      });
      expect((await repo.save(take(TEACHER), 10)).status).toBe('not_member');
      expect((await repo.save(take(AMINA), 1)).status).toBe('limit');
      const audio = await repo.ownAudio(AMINA, (first as { id: string }).id);
      expect(audio).toEqual({ mime: 'audio/webm', data: SOUND });
      expect(await repo.ownAudio(YUSUF, (first as { id: string }).id)).toBeNull();
    });

    it('keeps the limit when takes arrive at the same moment', async () => {
      const outcomes = await Promise.all(
        Array.from({ length: 5 }, () => repo.save(take(AMINA), 2))
      );
      expect(outcomes.filter((o) => o.status === 'created')).toHaveLength(2);
      expect(outcomes.filter((o) => o.status === 'limit')).toHaveLength(3);
    });

    it('answers an assignment only of this student in this ḥalaqa', async () => {
      const assignments = new PgAssignmentRepository(pool);
      const give = (studentId: string | null) =>
        assignments.create({
          halaqaId,
          studentId,
          kind: 'recite',
          range: { sura: 112, from: 1, to: 4 },
          pages: null,
          focusRule: null,
          repetitions: null,
          note: null,
          dueOn: '2026-10-09',
          createdBy: TEACHER,
        }) as Promise<string>;
      const forYusuf = await give(YUSUF);
      const forAll = await give(null);
      expect((await repo.save(take(AMINA, { assignmentId: forYusuf }), 10)).status).toBe(
        'assignment'
      );
      const saved = await repo.save(take(AMINA, { assignmentId: forAll }), 10);
      expect(saved.status).toBe('created');
      // The assignment taken back keeps the recording.
      await assignments.remove(halaqaId, forAll);
      expect((await repo.own(AMINA, page)).recordings[0]!.assignmentId).toBeNull();
    });

    it('queues what waits first, takes the answer, and pages both lists', async () => {
      const ids: string[] = [];
      for (const studentId of [AMINA, YUSUF, AMINA]) {
        const saved = await repo.save(take(studentId), 10);
        ids.push((saved as { id: string }).id);
      }
      expect(
        await repo.review(
          halaqaId,
          ids[0]!,
          {
            verdict: 'again',
            remark: 'sinVoiced',
            note: 'Das sīn stimmlos.',
            marks: [{ aya: 1, word: 3 }],
          },
          TEACHER
        )
      ).toBe('reviewed');
      // A new answer replaces the marks; a word outside the āyāt or past an āya's end is refused.
      expect(
        await repo.review(
          halaqaId,
          ids[0]!,
          {
            verdict: 'again',
            remark: 'sinVoiced',
            note: 'Das sīn stimmlos.',
            marks: [
              { aya: 1, word: 2 },
              { aya: 4, word: 5 },
            ],
          },
          TEACHER
        )
      ).toBe('reviewed');
      expect(
        await repo.review(
          halaqaId,
          ids[0]!,
          { verdict: 'good', remark: null, note: null, marks: [{ aya: 4, word: 6 }] },
          TEACHER
        )
      ).toBe('marks');
      expect(
        await repo.review(
          '70000000-0000-4000-8000-000000000001',
          ids[1]!,
          { verdict: 'good', remark: null, note: null, marks: [] },
          TEACHER
        )
      ).toBe('not_found');

      const queue = await repo.queue(halaqaId, page);
      expect(queue.recordings.map((r) => r.id)).toEqual([ids[1], ids[2], ids[0]]);
      expect(queue.recordings[2]).toMatchObject({
        studentId: AMINA,
        studentName: 'Amina',
        studentEmail: 'amina@example.org',
        range: { sura: 112, from: 1, to: 4 },
        bytes: SOUND.length,
        durationMs: 4200,
        review: {
          verdict: 'again',
          remark: 'sinVoiced',
          note: 'Das sīn stimmlos.',
          // The refused answer changed nothing.
          marks: [
            { aya: 1, word: 2 },
            { aya: 4, word: 5 },
          ],
          reviewerName: 'Sheikh Ahmad',
          reviewedAt: expect.any(String),
        },
      });
      const firstPage = await repo.queue(halaqaId, { limit: 2 });
      expect(firstPage.more).toBe(true);
      const rest = await repo.queue(halaqaId, {
        limit: 2,
        before: firstPage.recordings[1]!.id,
      });
      expect(rest.recordings.map((r) => r.id)).toEqual([ids[0]]);

      const own = await repo.own(AMINA, { limit: 1 });
      expect(own.recordings.map((r) => r.id)).toEqual([ids[2]]);
      expect(own.recordings[0]!.halaqaName).toBe('Juzʾ ʿAmma');
      const older = await repo.own(AMINA, { limit: 1, before: ids[2] });
      expect(older.recordings.map((r) => r.id)).toEqual([ids[0]]);
      expect(older.recordings[0]!.review?.verdict).toBe('again');
      expect(await repo.halaqaAudio(halaqaId, ids[1]!)).not.toBeNull();
    });

    it('keeps a voice note with its own answer, drops it with another, deletes it with the teacher', async () => {
      const ADMIN = '50000000-0000-4000-8000-000000000004';
      await pool.query(
        `insert into users (id, email, name, role) values ($1, 'admin@example.org', 'Admin', 'admin')`,
        [ADMIN]
      );
      const { id } = (await repo.save(take(AMINA), 10)) as { id: string };
      const VOICE = Buffer.from('sheikh says');
      const note = { mime: 'audio/ogg' as const, durationMs: 3000, audio: VOICE };
      const answer = (by: string) =>
        repo.review(
          halaqaId,
          id,
          { verdict: 'again', remark: null, note: null, marks: [] },
          by
        );
      expect(await repo.saveVoiceNote(halaqaId, id, note, TEACHER)).toBe('not_reviewed');
      await answer(TEACHER);
      expect(await repo.saveVoiceNote(halaqaId, id, note, ADMIN)).toBe('not_reviewed');
      expect(
        await repo.saveVoiceNote(
          '70000000-0000-4000-8000-000000000001',
          id,
          note,
          TEACHER
        )
      ).toBe('not_found');
      expect(await repo.saveVoiceNote(halaqaId, id, note, TEACHER)).toBe('saved');
      expect(
        await repo.saveVoiceNote(
          halaqaId,
          id,
          { mime: 'audio/mp4', durationMs: 1500, audio: Buffer.from('again') },
          TEACHER
        )
      ).toBe('saved');
      expect(await repo.ownVoiceNote(AMINA, id)).toEqual({
        mime: 'audio/mp4',
        data: Buffer.from('again'),
      });
      expect(await repo.ownVoiceNote(YUSUF, id)).toBeNull();
      expect((await repo.own(AMINA, page)).recordings[0]!.review?.voiceNote).toEqual({
        mime: 'audio/mp4',
        bytes: 5,
        durationMs: 1500,
      });
      // Answering again keeps one's own note; another teacher's answer drops it.
      await answer(TEACHER);
      expect(await repo.halaqaVoiceNote(halaqaId, id)).not.toBeNull();
      await answer(ADMIN);
      expect(await repo.halaqaVoiceNote(halaqaId, id)).toBeNull();
      expect(
        (await repo.queue(halaqaId, page)).recordings[0]!.review?.voiceNote
      ).toBeNull();

      await answer(TEACHER);
      expect(await repo.saveVoiceNote(halaqaId, id, note, TEACHER)).toBe('saved');
      const teacherExport = await new PgPrivacyRepository(pool).export(TEACHER);
      expect(teacherExport.recordings).toEqual([
        expect.objectContaining({
          id,
          voice_note: expect.objectContaining({
            mime: 'audio/ogg',
            duration_ms: 3000,
            recorded_by_you: true,
          }),
        }),
      ]);
      expect(JSON.stringify(teacherExport.recordings)).not.toContain('sheikh says');
      expect(await repo.removeVoiceNote(halaqaId, id)).toBe(true);
      expect(await repo.removeVoiceNote(halaqaId, id)).toBe(true);
      expect(await repo.ownVoiceNote(AMINA, id)).toBeNull();
      expect(await repo.removeVoiceNote('70000000-0000-4000-8000-000000000001', id)).toBe(
        false
      );

      // A voice goes with its speaker's account; the answer stays (the owner's account would
      // take the ḥalaqa with it).
      await answer(ADMIN);
      expect(await repo.saveVoiceNote(halaqaId, id, note, ADMIN)).toBe('saved');
      await pool.query('delete from users where id = $1', [ADMIN]);
      expect(await repo.ownVoiceNote(AMINA, id)).toBeNull();
      expect((await repo.own(AMINA, page)).recordings[0]!.review).toMatchObject({
        verdict: 'again',
        reviewerName: null,
        voiceNote: null,
      });
    });

    it('deletes on request, when the student leaves, and with the account; exports the rest', async () => {
      const kept = (await repo.save(take(AMINA), 10)) as { id: string };
      const removed = (await repo.save(take(AMINA), 10)) as { id: string };
      const yusufs = (await repo.save(take(YUSUF), 10)) as { id: string };
      await repo.review(
        halaqaId,
        kept.id,
        { verdict: 'good', remark: null, note: null, marks: [{ aya: 2, word: 1 }] },
        TEACHER
      );
      await repo.saveVoiceNote(
        halaqaId,
        kept.id,
        { mime: 'audio/webm', durationMs: 2000, audio: Buffer.from('teacher voice') },
        TEACHER
      );
      expect(await repo.remove(YUSUF, removed.id)).toBe(false);
      expect(await repo.remove(AMINA, removed.id)).toBe(true);
      const count = async (table: string) =>
        Number((await pool.query(`select count(*) from ${table}`)).rows[0].count);
      expect(await count('recording_audio')).toBe(2);

      const aminaExport = await new PgPrivacyRepository(pool).export(AMINA);
      expect(aminaExport.recordings).toEqual([
        expect.objectContaining({
          id: kept.id,
          sent_by_you: true,
          verdict: 'good',
          marks: [{ aya: 2, word: 1 }],
          voice_note: expect.objectContaining({ bytes: 13, recorded_by_you: false }),
        }),
      ]);
      expect(JSON.stringify(aminaExport.recordings)).not.toContain('fake opus');
      expect(JSON.stringify(aminaExport.recordings)).not.toContain('teacher voice');
      const teacherExport = await new PgPrivacyRepository(pool).export(TEACHER);
      expect(teacherExport.recordings).toEqual([
        expect.objectContaining({ id: kept.id, answered_by_you: true }),
      ]);

      expect(await halaqat.leave(halaqaId, AMINA)).toBe(true);
      expect(await repo.halaqaAudio(halaqaId, kept.id)).toBeNull();
      await pool.query('delete from users where id = $1', [YUSUF]);
      expect(await repo.halaqaAudio(halaqaId, yusufs.id)).toBeNull();
      expect(await count('recordings')).toBe(0);
      expect(await count('recording_audio')).toBe(0);
      expect(await count('recording_marks')).toBe(0);
      expect(await count('recording_voice_notes')).toBe(0);
    });

    it('keeps the ʿarḍ log: answers and hand entries, per student and sūra (T4, ADR-0025)', async () => {
      const ADMIN = '50000000-0000-4000-8000-000000000004';
      await pool.query(
        `insert into users (id, email, name, role) values ($1, 'admin@example.org', 'Admin', 'admin')`,
        [ADMIN]
      );
      await pool.query(`update users set time_zone = 'Asia/Tokyo' where id = $1`, [
        YUSUF,
      ]);
      const log = new PgArdaLogRepository(pool);
      const amina = (await repo.save(take(AMINA), 10)) as { id: string };
      const yusuf = (await repo.save(take(YUSUF), 10)) as { id: string };
      // Both recited at 23:30 Berlin time: the 9th for Amina (no zone set), the 10th in Tokyo.
      await pool.query(
        `update recordings set created_at = '2026-10-09T21:30:00Z' where id = any($1)`,
        [[amina.id, yusuf.id]]
      );
      const answer = (
        id: string,
        verdict: 'good' | 'again',
        marks = [] as { aya: number; word: number }[]
      ) =>
        repo.review(
          halaqaId,
          id,
          { verdict, remark: null, note: 'Gut.', marks },
          TEACHER
        );
      await answer(amina.id, 'again');
      await answer(amina.id, 'good', [{ aya: 3, word: 1 }]);
      await answer(yusuf.id, 'again');

      const hand = (studentId: string, recitedOn: string, sura = 112) =>
        log.add(
          {
            halaqaId,
            studentId,
            range: { sura, from: 1, to: sura === 112 ? 4 : 5 },
            recitedOn,
            verdict: 'again',
            remark: 'maddShort',
            note: null,
            writtenBy: ADMIN,
          },
          2
        );
      expect((await hand(AMINA, '2026-10-01')).status).toBe('added');
      expect((await hand(AMINA, '2026-10-02', 113)).status).toBe('added');
      expect((await hand(AMINA, '2026-10-03')).status).toBe('limit');
      expect((await hand(TEACHER, '2026-10-03')).status).toBe('not_member');

      const all = await log.entries(halaqaId, { limit: 50 });
      expect(all.entries.map((e) => [e.studentName, e.recitedOn, e.source])).toEqual([
        ['Yusuf', '2026-10-10', 'recording'],
        ['Amina', '2026-10-09', 'recording'],
        ['Amina', '2026-10-02', 'in_person'],
        ['Amina', '2026-10-01', 'in_person'],
      ]);
      expect(all.entries[1]).toMatchObject({
        verdict: 'good',
        note: 'Gut.',
        marks: [{ aya: 3, word: 1 }],
        recordingId: amina.id,
        writtenByName: 'Sheikh Ahmad',
      });
      const firstPage = await log.entries(halaqaId, { studentId: AMINA, limit: 2 });
      expect(firstPage.more).toBe(true);
      const rest = await log.entries(halaqaId, {
        studentId: AMINA,
        limit: 2,
        before: firstPage.entries[1]!.id,
      });
      expect(rest.entries.map((e) => e.recitedOn)).toEqual(['2026-10-01']);

      expect(await log.summary(halaqaId)).toEqual([
        {
          studentId: AMINA,
          studentName: 'Amina',
          sura: 112,
          times: 2,
          lastOn: '2026-10-09',
          lastVerdict: 'good',
        },
        expect.objectContaining({ studentId: AMINA, sura: 113, times: 1 }),
        expect.objectContaining({ studentId: YUSUF, sura: 112, lastVerdict: 'again' }),
      ]);
      expect(await log.ownSummary(YUSUF)).toEqual([
        {
          halaqaId,
          halaqaName: 'Juzʾ ʿAmma',
          sura: 112,
          times: 1,
          lastOn: '2026-10-10',
          lastVerdict: 'again',
        },
      ]);

      // The take goes, its entry stays; the writer's account goes, the entry stays unnamed.
      expect(await repo.remove(AMINA, amina.id)).toBe(true);
      await pool.query('delete from users where id = $1', [ADMIN]);
      const kept = await log.entries(halaqaId, { studentId: AMINA, limit: 50 });
      expect(kept.entries).toHaveLength(3);
      expect(kept.entries[0]).toMatchObject({ source: 'recording', recordingId: null });
      expect(kept.entries[1]).toMatchObject({ source: 'in_person', writtenByName: null });

      const aminaExport = await new PgPrivacyRepository(pool).export(AMINA);
      expect(aminaExport.ardaLog).toHaveLength(3);
      expect(aminaExport.ardaLog[0]).toMatchObject({
        about_you: true,
        recited_on: '2026-10-01',
      });
      const teacherExport = await new PgPrivacyRepository(pool).export(TEACHER);
      expect(teacherExport.ardaLog).toHaveLength(2);

      expect(
        await log.remove('70000000-0000-4000-8000-000000000001', kept.entries[1]!.id)
      ).toBe(false);
      expect(await log.remove(halaqaId, kept.entries[1]!.id)).toBe(true);
      expect(await halaqat.leave(halaqaId, AMINA)).toBe(true);
      expect(await log.ownSummary(AMINA)).toEqual([]);
      expect((await log.summary(halaqaId)).map((s) => s.studentId)).toEqual([YUSUF]);
    });
  });

  describe('progress (S5.2, ADR-0022)', () => {
    const AMINA = '70000000-0000-4000-8000-000000000001';
    const YUSUF = '70000000-0000-4000-8000-000000000002';
    const NOW = Date.UTC(2026, 9, 7, 12);
    const card = (prompt: string, updatedAt: number, box = 1): ProgressCard => ({
      id: `which-rule:${prompt}`,
      kind: 'which-rule',
      prompt,
      answer: 'ikhfa',
      box,
      due: updatedAt + 86_400_000,
      lapses: 1,
      updatedAt,
    });
    let repo: PgProgressRepository;

    beforeEach(async () => {
      repo = new PgProgressRepository(pool, () => NOW);
      await pool.query(
        `insert into users (id, email, name, role) values
           ($1, 'amina@example.org', 'Amina', 'student'),
           ($2, 'yusuf@example.org', 'Yusuf', 'student')`,
        [AMINA, YUSUF]
      );
    });

    it('merges per card by time and per game by the better time', async () => {
      await repo.sync(AMINA, {
        cards: [card('مِنْ بَعْدِ', NOW - 5000, 3), card('b', NOW - 5000)],
        bestTimes: { 'sort-28': 40_000 },
      });
      const outcome = await repo.sync(AMINA, {
        // A repeated id keeps its later version; a future date is stored as now.
        cards: [
          card('مِنْ بَعْدِ', NOW - 9000, 1),
          card('b', NOW - 2000, 2),
          card('b', NOW - 1000, 4),
          card('c', NOW + 60_000),
        ],
        bestTimes: { 'sort-28': 50_000, 'other-game': 9000 },
      });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.progress.cards.map((c) => [c.prompt, c.box, c.updatedAt])).toEqual([
        ['b', 4, NOW - 1000],
        ['c', 1, NOW],
        ['مِنْ بَعْدِ', 3, NOW - 5000],
      ]);
      expect(outcome.progress.cards[0]).toEqual(card('b', NOW - 1000, 4));
      expect(outcome.progress.bestTimes).toEqual({
        'other-game': 9000,
        'sort-28': 40_000,
      });
      // Syncing the answer again changes nothing.
      const again = await repo.sync(AMINA, outcome.progress);
      expect(again).toEqual(outcome);
      // Yusuf's deck is his own.
      expect(await repo.sync(YUSUF, { cards: [], bestTimes: {} })).toEqual({
        ok: true,
        progress: {
          cards: [],
          bestTimes: {},
          places: [],
          notes: [],
          events: [],
          more: false,
        },
      });
    });

    it('keeps the later reading place per script (ADR-0022 update)', async () => {
      const none = { cards: [], bestTimes: {} };
      await repo.sync(AMINA, {
        ...none,
        places: [
          { script: 'indopak', page: 9, at: NOW - 5000 },
          { script: 'uthmani', page: 604, at: NOW - 5000 },
        ],
      });
      const outcome = await repo.sync(AMINA, {
        ...none,
        // An older page loses; a repeated script keeps its later page; a future date is now.
        places: [
          { script: 'uthmani', page: 1, at: NOW - 9000 },
          { script: 'indopak', page: 10, at: NOW - 2000 },
          { script: 'indopak', page: 12, at: NOW + 60_000 },
        ],
      });
      expect(outcome.ok && outcome.progress.places).toEqual([
        { script: 'indopak', page: 12, at: NOW },
        { script: 'uthmani', page: 604, at: NOW - 5000 },
      ]);
      // A device that predates places changes nothing; Yusuf's places are his own.
      const old = await repo.sync(AMINA, none);
      expect(old.ok && old.progress.places).toHaveLength(2);
      const yusuf = await repo.sync(YUSUF, none);
      expect(yusuf.ok && yusuf.progress.places).toEqual([]);
      // The database keeps the shape.
      await expect(
        pool.query(
          `insert into reading_places (user_id, script, page, at) values ($1, 'warsh', 1, 1)`,
          [AMINA]
        )
      ).rejects.toThrow();
    });

    it('keeps the later version of each study note, a deleted one as a tombstone', async () => {
      const none = { cards: [], bestTimes: {} };
      const learn: StudyNote = {
        id: '90000000-0000-4000-8000-000000000001',
        kind: 'learn',
        text: 'Zwei Seiten al-Baqara',
        range: null,
        pages: { layout: 'indopak-15', from: 8, to: 9 },
        done: false,
        deleted: false,
        createdAt: NOW - 9000,
        updatedAt: NOW - 9000,
      };
      const hard: StudyNote = {
        ...learn,
        id: '90000000-0000-4000-8000-000000000002',
        kind: 'difficulty',
        text: 'Ghunna zu kurz',
        range: { sura: 2, from: 1, to: 5 },
        pages: null,
      };
      await repo.sync(AMINA, { ...none, notes: [learn, hard] });
      const outcome = await repo.sync(AMINA, {
        ...none,
        notes: [
          { ...learn, text: 'älter', updatedAt: NOW - 20_000 },
          { ...learn, done: true, updatedAt: NOW - 1000 },
          { ...hard, deleted: true, text: '', range: null, updatedAt: NOW - 1000 },
          {
            ...learn,
            id: '90000000-0000-4000-8000-000000000003',
            kind: 'review',
            text: 'al-Mulk',
            pages: null,
            createdAt: NOW + 60_000,
            updatedAt: NOW + 60_000,
          },
        ],
      });
      expect(outcome.ok && outcome.progress.notes).toEqual([
        { ...learn, done: true, updatedAt: NOW - 1000 },
        { ...hard, deleted: true, text: '', range: null, updatedAt: NOW - 1000 },
        expect.objectContaining({ kind: 'review', createdAt: NOW, updatedAt: NOW }),
      ]);
      // The tombstone wins over the device that still has the note.
      const stale = await repo.sync(AMINA, { ...none, notes: [hard] });
      expect(stale.ok && stale.progress.notes?.[1]).toMatchObject({ deleted: true });
      const yusuf = await repo.sync(YUSUF, none);
      expect(yusuf.ok && yusuf.progress.notes).toEqual([]);
      // The database keeps the shape: a deleted note keeps no text.
      await expect(
        pool.query(
          `insert into study_notes (user_id, id, kind, text, deleted, created_at, updated_at)
           values ($1, gen_random_uuid(), 'learn', 'secret', true, 1, 1)`,
          [AMINA]
        )
      ).rejects.toThrow();
    });

    it('refuses a deck past the limit and stores none of it', async () => {
      const many = Array.from({ length: 5001 }, (_, i) => card(String(i), NOW));
      expect(await repo.sync(AMINA, { cards: many, bestTimes: {} })).toEqual({
        ok: false,
        error: 'too_many',
      });
      const count = await pool.query('select count(*) from review_cards');
      expect(Number(count.rows[0].count)).toBe(0);
    });

    it('keeps the activity log: once per id, numbered, after a sequence number', async () => {
      const ev = (n: number, at = NOW - 1000) => ({
        id: `80000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
        kind: 'lab-quiz' as const,
        ref: 'sin',
        at,
        right: 4,
        total: 6,
      });
      const none = { cards: [], bestTimes: {} };
      const first = await repo.sync(AMINA, { ...none, events: [ev(1), ev(2)] });
      expect(first.ok && first.progress.events.map((e) => e.id)).toEqual([
        ev(1).id,
        ev(2).id,
      ]);
      const seqs = first.ok ? first.progress.events.map((e) => e.seq) : [];
      expect(seqs[1]!).toBeGreaterThan(seqs[0]!);
      expect(first.ok && first.progress.events[0]).toEqual({ ...ev(1), seq: seqs[0] });
      // From another device: its own new event, a repeat, and one from tomorrow.
      const second = await repo.sync(AMINA, {
        ...none,
        since: seqs[1]!,
        events: [ev(2), ev(3, NOW + 86_400_000), { ...ev(3), at: NOW }],
      });
      expect(second.ok && second.progress.events.map((e) => [e.id, e.at])).toEqual([
        [ev(2).id, ev(2).at],
        [ev(3).id, NOW],
      ]);
      expect(second.ok && second.progress.more).toBe(false);
      // Yusuf's log is his own.
      const yusuf = await repo.sync(YUSUF, none);
      expect(yusuf.ok && yusuf.progress.events).toEqual([]);
      const exported = await new PgPrivacyRepository(pool).export(AMINA);
      expect(exported.activity.map((e) => e.id)).toEqual([ev(1).id, ev(2).id, ev(3).id]);
      await new PgPrivacyRepository(pool).delete(AMINA, null);
      const left = await pool.query('select count(*)::int as n from activity_events');
      expect(left.rows[0].n).toBe(0);
    });

    it('is in the export and goes with the account', async () => {
      await repo.sync(AMINA, {
        cards: [card('a', NOW)],
        bestTimes: { 'sort-28': 1234 },
        places: [{ script: 'indopak', page: 9, at: NOW }],
      });
      const exported = await new PgPrivacyRepository(pool).export(AMINA);
      expect(exported.progress).toEqual({
        cards: [card('a', NOW)],
        bestTimes: { 'sort-28': 1234 },
        places: [{ script: 'indopak', page: 9, at: NOW }],
        notes: [],
      });
      await repo.sync(AMINA, {
        cards: [],
        bestTimes: {},
        notes: [
          {
            id: '90000000-0000-4000-8000-000000000009',
            kind: 'difficulty',
            text: 'Qalqala',
            range: null,
            pages: null,
            done: false,
            deleted: false,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      });
      expect((await new PgPrivacyRepository(pool).export(AMINA)).progress.notes).toEqual([
        expect.objectContaining({ text: 'Qalqala' }),
      ]);
      await new PgPrivacyRepository(pool).delete(AMINA, null);
      const left = await pool.query(
        `select (select count(*) from review_cards) + (select count(*) from best_times)
                + (select count(*) from reading_places) + (select count(*) from study_notes)
                  as n`
      );
      expect(Number(left.rows[0].n)).toBe(0);
    });
  });
});
