/**
 * HTTP application (Hono). Dependencies are injected so routes are testable without a
 * database. Routes live under /api (proxied by arda-web's Caddy) plus /healthz.
 *
 * The sign-in surface is Suffa's (ADR-0004): only the Better Auth endpoints sign-in by link,
 * code and passkey needs are reachable; every other one answers 404.
 */
import { Hono } from 'hono';
import {
  AUTH_BASE_PATH,
  isPublicAuthEndpoint,
  rejectUnsafeRedirect,
  type Me,
} from './auth/betterAuth.js';
import { AUTHENTICATE_OPTIONS, requireVerificationInOptions } from './auth/passkeys.js';
import { createAccountRoutes, type AccountRouteDeps } from './account/routes.js';
import { createAdminRoutes, type AdminRouteDeps } from './admin/routes.js';
import {
  createAssignmentRoutes,
  type AssignmentRouteDeps,
} from './assignments/routes.js';
import { createHalaqaRoutes, type HalaqaRouteDeps } from './halaqat/routes.js';
import { authorize, type AuthorizeLog } from './authz/middleware.js';
import { appCors } from './http/appCors.js';
import { sameOriginOnly } from './http/sameOrigin.js';
import { withoutSessionToken } from './http/withoutSessionToken.js';
import {
  createTranslationRoutes,
  type TranslationRouteDeps,
} from './translation/routes.js';

/** Sign-in answers that carry a session token the browser must not see. */
const SIGN_IN_ANSWERS = new Set([
  '/sign-in/email-otp',
  '/passkey/verify-authentication',
  '/passkey/verify-registration',
]);

export interface AuthRouteDeps {
  /** Better Auth's request handler for everything under AUTH_BASE_PATH. */
  handler(request: Request): Promise<Response>;
  me(headers: Headers): Promise<Me | null>;
}

export interface HealthProbe {
  /** Resolves with the current schema revision; rejects when the database is unreachable. */
  schemaRevision(): Promise<string | null>;
}

export interface AppDeps {
  version: string;
  expectedRevision: string | null;
  health: HealthProbe;
  onProbeError?: (error: unknown) => void;
  /** Sign-in (Better Auth) and the signed-in user; omitted when sign-in is not configured. */
  auth?: AuthRouteDeps;
  /** Account self-service (devices, passkeys, 2FA, export, deletion). */
  account?: AccountRouteDeps;
  /** Admin area (users, roles, audit); every route needs an admin with 2FA. */
  admin?: AdminRouteDeps;
  /** Translation of teachers' written remarks (ADR-0020). */
  translations?: TranslationRouteDeps;
  /** Ḥalaqāt, members and invites (spec T1, ADR-0005). */
  halaqat?: HalaqaRouteDeps;
  /** Assignments in a ḥalaqa and what a student still has to do (spec T2, ADR-0014). */
  assignments?: AssignmentRouteDeps;
  /**
   * Origins of the web app (ARDA_PUBLIC_URL, ARDA_TRUSTED_ORIGINS). When set, state-changing
   * API requests that a browser marks as coming from another site are refused (403).
   */
  allowedOrigin?: string | readonly string[];
  /** Native app web view origins: CORS without credentials, bearer tokens (ADR-0019). */
  appOrigins?: readonly string[];
  /** Where denied requests are logged (authz.denied). */
  authzLog?: AuthorizeLog;
  /** Called for unhandled errors; the client only sees a generic 500. */
  onUnhandledError?: (error: unknown, path: string) => void;
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  const healthHandler = async () => {
    try {
      const revision = await deps.health.schemaRevision();
      const ok = revision === deps.expectedRevision;
      return Response.json(
        {
          status: ok ? 'ok' : 'degraded',
          version: deps.version,
          db: 'ok',
          schemaRevision: revision,
          expectedRevision: deps.expectedRevision,
          auth: deps.auth ? 'enabled' : 'disabled',
          translation: deps.translations?.service.enabled ? 'enabled' : 'disabled',
        },
        { status: ok ? 200 : 503 }
      );
    } catch (error) {
      deps.onProbeError?.(error);
      return Response.json(
        { status: 'error', version: deps.version, db: 'unreachable' },
        { status: 503 }
      );
    }
  };

  if (deps.appOrigins?.length) app.use('/api/*', appCors(deps.appOrigins));
  if (deps.allowedOrigin?.length) {
    const own =
      typeof deps.allowedOrigin === 'string' ? [deps.allowedOrigin] : deps.allowedOrigin;
    app.use('/api/*', sameOriginOnly([...own, ...(deps.appOrigins ?? [])]));
  }

  app.get('/healthz', healthHandler);
  app.get('/api/healthz', healthHandler);
  app.get('/api/version', (c) =>
    c.json({
      name: 'arda-api',
      version: deps.version,
      schemaRevision: deps.expectedRevision,
    })
  );

  if (deps.auth) {
    const auth = deps.auth;
    app.on(['GET', 'POST'], `${AUTH_BASE_PATH}/*`, async (c) => {
      // Only the endpoints sign-in needs; everything else Better Auth ships is off.
      if (!isPublicAuthEndpoint(c.req.method, c.req.path)) {
        return c.json({ error: 'not_found' }, 404);
      }
      const rejected = await rejectUnsafeRedirect(c.req.raw);
      if (rejected) return rejected;
      const response = await auth.handler(c.req.raw);
      const endpoint = c.req.path.slice(AUTH_BASE_PATH.length);
      // Sign-in answers carry the session token (and passkey records their key): the browser
      // gets the cookie and `{ ok: true }` only.
      if (SIGN_IN_ANSWERS.has(endpoint)) {
        return withoutSessionToken(
          response,
          c.req.header('origin'),
          deps.appOrigins ?? []
        );
      }
      return endpoint === AUTHENTICATE_OPTIONS
        ? requireVerificationInOptions(response)
        : response;
    });
    // The profile doubles as the actor: one session lookup per request.
    const profiles = { actor: (headers: Headers) => auth.me(headers) };
    app.get('/api/v1/me', authorize(profiles, 'profile:read', deps.authzLog), (c) => {
      c.header('Cache-Control', 'no-store');
      return c.json(c.get('actor'));
    });
  }
  if (deps.account) app.route('/api/v1/account', createAccountRoutes(deps.account));
  if (deps.admin) app.route('/api/v1/admin', createAdminRoutes(deps.admin));
  if (deps.translations) app.route('/api/v1', createTranslationRoutes(deps.translations));
  if (deps.halaqat) app.route('/api/v1/halaqat', createHalaqaRoutes(deps.halaqat));
  if (deps.assignments) app.route('/api/v1', createAssignmentRoutes(deps.assignments));

  app.notFound((c) => c.json({ error: 'not_found' }, 404));
  app.onError((error, c) => {
    deps.onUnhandledError?.(error, c.req.path);
    return c.json({ error: 'internal_error' }, 500);
  });
  return app;
}
