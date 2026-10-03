/**
 * Runtime configuration from environment variables (ARDA_* prefix), ported from Suffa.
 *
 * Validation is strict in `prod`: the service refuses to start with missing, short or
 * placeholder secrets, so a half-configured CapRover app fails fast with a clear log line
 * instead of running insecurely (same policy as Suffa and Tabayyun).
 */
import { z } from 'zod';
import type { SmtpSettings } from './auth/mailer.js';

const PLACEHOLDER_VALUES = new Set([
  'change-me',
  'changeme',
  'secret',
  'password',
  'arda',
]);
export const MIN_SECRET_LENGTH = 32;

export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`invalid configuration: ${issues.join('; ')}`);
    this.name = 'ConfigError';
  }
}

/** A URL setting; blank counts as unset (CapRover keeps empty variables). */
function optionalUrl(name: string) {
  return z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .pipe(z.string().url(`${name} must be a URL`).optional())
    .optional();
}

const RawEnvSchema = z.object({
  ARDA_ENV: z.enum(['dev', 'test', 'prod']).default('dev'),
  ARDA_PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  ARDA_DATABASE_URL: z
    .string({ required_error: 'ARDA_DATABASE_URL is required' })
    .regex(/^postgres(ql)?:\/\/.+/, 'ARDA_DATABASE_URL must be a postgres:// URL'),
  ARDA_DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  ARDA_AUTH_SECRET: z.string().optional(),
  /** Public URL of the app (links in sign-in mails point here), e.g. https://arda-stg.siralabs.org */
  ARDA_PUBLIC_URL: optionalUrl('ARDA_PUBLIC_URL'),
  /**
   * More origins the app is served from besides ARDA_PUBLIC_URL (comma-separated), e.g. the
   * old domain while moving to a new one. Sign-in mails always link to ARDA_PUBLIC_URL.
   */
  ARDA_TRUSTED_ORIGINS: z.string().trim().optional(),
  /**
   * Origins of the native app's web view (ADR-0019), allowed cross-origin with bearer tokens
   * (never cookies). Default: Capacitor's iOS and Android origins.
   */
  ARDA_APP_ORIGINS: z.string().trim().default('capacitor://localhost,https://localhost'),
  /** SMTP for sign-in mails: the Google Workspace relay (smtp-relay.gmail.com). */
  ARDA_SMTP_HOST: z.string().trim().optional(),
  ARDA_SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  ARDA_SMTP_USER: z.string().trim().optional(),
  ARDA_SMTP_PASSWORD: z.string().optional(),
  ARDA_MAIL_FROM: z.string().trim().optional(),
  /** Browser tests: sign-in links are written to files in this directory (never in prod). */
  ARDA_MAIL_DIR: z.string().trim().optional(),
  /**
   * Translation of teachers' written remarks with Claude (ADR-0020); off without a key.
   * The key is passed to the SDK explicitly, so ANTHROPIC_* variables are never read.
   */
  ARDA_ANTHROPIC_API_KEY: z.string().trim().optional(),
  ARDA_TRANSLATE_MODEL: z.string().trim().default('claude-opus-5-5'),
  ARDA_TRANSLATE_DAILY_LIMIT: z.coerce.number().int().min(0).max(10_000).default(200),
  ARDA_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  ARDA_VERSION: z.string().default('dev'),
});

export interface Config {
  env: 'dev' | 'test' | 'prod';
  port: number;
  databaseUrl: string;
  dbPoolMax: number;
  authSecret: string | undefined;
  logLevel: string;
  version: string;
  /** Public URL of the app; sign-in is off without it (and without an auth secret). */
  publicUrl: string | undefined;
  /** Origins browsers may send (ARDA_PUBLIC_URL first, then ARDA_TRUSTED_ORIGINS). */
  trustedOrigins: string[];
  /** Native app web view origins (bearer tokens, CORS without credentials). */
  appOrigins: string[];
  /** SMTP for sign-in mails; outside prod the link may go to the log instead. */
  smtp: SmtpSettings | undefined;
  /** Browser tests: where sign-in links are written instead of mailed (never in prod). */
  mailDir: string | undefined;
  /** Translation of written remarks; undefined turns it off (ADR-0020). */
  translation: { apiKey: string; model: string; dailyLimit: number } | undefined;
  /**
   * Optional features switched off because their settings are incomplete; logged at start
   * (`config.feature_off`). Only unsafe settings stop the service.
   */
  warnings: string[];
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

function databasePassword(url: string): string | null {
  try {
    const password = new URL(url).password;
    return password ? decodeURIComponent(password) : null;
  } catch (error) {
    // A syntactically broken URL is reported by the schema/driver; nothing to inspect here.
    if (error instanceof TypeError) return null;
    throw error;
  }
}

/** Parses and validates configuration; throws `ConfigError` listing every problem. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = RawEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`)
    );
  }
  const raw = parsed.data;
  const issues: string[] = [];
  // A half-configured optional feature stays off instead of stopping the service: the
  // one-click template fills in the relay host and leaves the sender for later.
  const warnings: string[] = [];

  if (raw.ARDA_ENV === 'prod') {
    const secret = raw.ARDA_AUTH_SECRET;
    if (!secret) issues.push('ARDA_AUTH_SECRET is required in prod');
    else if (secret.length < MIN_SECRET_LENGTH || isPlaceholder(secret)) {
      issues.push(
        `ARDA_AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} random characters`
      );
    }
    const password = databasePassword(raw.ARDA_DATABASE_URL);
    if (!password || password.length < 16 || isPlaceholder(password)) {
      issues.push(
        'ARDA_DATABASE_URL must contain a generated password (>= 16 chars) in prod'
      );
    }
    if (!raw.ARDA_PUBLIC_URL) issues.push('ARDA_PUBLIC_URL is required in prod');
    // Missing SMTP does not stop the service; sign-in stays off and the api logs it loudly.
  }
  // Host and sender go together; user and password are optional (the Workspace relay can
  // allow the server by IP) but also only together. Incomplete mail settings switch sign-in
  // off (logged loudly); they never stop the service.
  if (Boolean(raw.ARDA_SMTP_HOST) !== Boolean(raw.ARDA_MAIL_FROM)) {
    warnings.push('ARDA_SMTP_HOST and ARDA_MAIL_FROM go together; sign-in mails are off');
  }
  const smtpAuthHalf = Boolean(raw.ARDA_SMTP_USER) !== Boolean(raw.ARDA_SMTP_PASSWORD);
  if (smtpAuthHalf) {
    warnings.push(
      'ARDA_SMTP_USER and ARDA_SMTP_PASSWORD go together; sign-in mails are off'
    );
  }
  if (raw.ARDA_MAIL_DIR && raw.ARDA_ENV === 'prod') {
    issues.push('ARDA_MAIL_DIR must not be set in prod');
  }
  const extraOrigins = parseOrigins(raw.ARDA_TRUSTED_ORIGINS);
  issues.push(...extraOrigins.issues);
  const appOrigins = raw.ARDA_APP_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  for (const origin of appOrigins) {
    if (!/^(capacitor|https|ionic):\/\/[a-z0-9.-]+(:\d+)?$/.test(origin)) {
      issues.push(
        `ARDA_APP_ORIGINS: "${origin}" is not an app origin like capacitor://localhost`
      );
    }
  }
  if (issues.length > 0) throw new ConfigError(issues);

  const trustedOrigins = [
    ...new Set([
      ...(raw.ARDA_PUBLIC_URL ? [new URL(raw.ARDA_PUBLIC_URL).origin] : []),
      ...extraOrigins.origins,
    ]),
  ];
  const smtpComplete = Boolean(raw.ARDA_SMTP_HOST && raw.ARDA_MAIL_FROM) && !smtpAuthHalf;

  return {
    env: raw.ARDA_ENV,
    port: raw.ARDA_PORT,
    databaseUrl: raw.ARDA_DATABASE_URL,
    dbPoolMax: raw.ARDA_DB_POOL_MAX,
    authSecret: raw.ARDA_AUTH_SECRET || undefined,
    logLevel: raw.ARDA_LOG_LEVEL,
    version: raw.ARDA_VERSION,
    publicUrl: raw.ARDA_PUBLIC_URL?.replace(/\/$/, ''),
    trustedOrigins,
    appOrigins,
    mailDir: raw.ARDA_MAIL_DIR || undefined,
    warnings,
    translation: raw.ARDA_ANTHROPIC_API_KEY
      ? {
          apiKey: raw.ARDA_ANTHROPIC_API_KEY,
          model: raw.ARDA_TRANSLATE_MODEL,
          dailyLimit: raw.ARDA_TRANSLATE_DAILY_LIMIT,
        }
      : undefined,
    smtp: smtpComplete
      ? {
          host: raw.ARDA_SMTP_HOST!,
          port: raw.ARDA_SMTP_PORT,
          auth:
            raw.ARDA_SMTP_USER && raw.ARDA_SMTP_PASSWORD
              ? { user: raw.ARDA_SMTP_USER, password: raw.ARDA_SMTP_PASSWORD }
              : undefined,
          from: raw.ARDA_MAIL_FROM!,
          clientName: raw.ARDA_PUBLIC_URL
            ? new URL(raw.ARDA_PUBLIC_URL).hostname
            : undefined,
        }
      : undefined,
  };
}

/** Database URL with the password masked, for logs. */
export function redactDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch (error) {
    if (error instanceof TypeError) return '<unparseable database url>';
    throw error;
  }
}

/**
 * "https://a.example,https://b.example" → origins. Only bare http(s) origins are accepted,
 * so a typo (a path, a stray character) is reported instead of silently never matching.
 */
export function parseOrigins(value: string | undefined): {
  origins: string[];
  issues: string[];
} {
  const origins: string[] = [];
  const issues: string[] = [];
  for (const entry of (value ?? '').split(',').map((part) => part.trim())) {
    if (!entry) continue;
    let url: URL | null = null;
    try {
      url = new URL(entry);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    const bare = url !== null && entry.replace(/\/$/, '') === url.origin;
    // URL() accepts characters like ")" in host names; real host names never have them.
    const plainHost = url !== null && /^[a-z0-9.-]+$/.test(url.hostname);
    if (!url || !bare || !plainHost || !/^https?:$/.test(url.protocol)) {
      issues.push(
        `ARDA_TRUSTED_ORIGINS: "${entry}" is not an origin like https://arda.example.org`
      );
    } else {
      origins.push(url.origin);
    }
  }
  return { origins, issues };
}
