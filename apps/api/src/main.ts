/**
 * Entry point of the arda-api image: validates the configuration, migrates the database,
 * wires sign-in (ADR-0004) and serves HTTP on ARDA_PORT.
 * Exit code 1 = invalid configuration or a fatal error at start.
 *
 * Background work (speech check, recording alignment) gets its own worker role on the same
 * image once it exists (ADR-0003); nothing runs in the background yet.
 */
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import { pino } from 'pino';
import { createApp, type AuthRouteDeps } from './app.js';
import type { AccountRouteDeps } from './account/routes.js';
import { PgAccountRepository } from './account/repository.js';
import { PgSecondFactorRepository, SecondFactorService } from './account/secondFactor.js';
import type { AdminRouteDeps } from './admin/routes.js';
import { PgAdminRepository } from './admin/repository.js';
import { writeAudit } from './audit/log.js';
import { ChainResolver, createAuth, SessionResolver } from './auth/betterAuth.js';
import { FileMailer, LogMailer, SmtpMailer } from './auth/mailer.js';
import { DenyAllResolver, type AuthResolver } from './auth/resolver.js';
import { ConfigError, loadConfig, redactDatabaseUrl } from './config.js';
import { currentRevision, expectedRevision, loadMigrations, migrate } from './migrate.js';
import { PgPrivacyRepository } from './privacy/repository.js';
import { SecretBox } from './security/secretBox.js';
import { ClaudeTranslator } from './translation/claudeTranslator.js';
import { PgTranslationRepository } from './translation/repository.js';
import { TranslationService } from './translation/service.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      // Logger is not configured yet; one structured line on stderr is enough.
      console.error(
        JSON.stringify({ level: 'fatal', msg: 'config.invalid', issues: error.issues })
      );
      process.exit(1);
    }
    throw error;
  }

  const log = pino({ level: config.logLevel, base: { service: 'arda', role: 'api' } });
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: config.dbPoolMax,
  });
  pool.on('error', (error) => log.error({ err: error }, 'db.pool_error'));
  log.info(
    { version: config.version, db: redactDatabaseUrl(config.databaseUrl) },
    'service.starting'
  );

  const migrations = await loadMigrations(MIGRATIONS_DIR);
  await migrate(pool, migrations, log);

  // Sign-in needs a secret and the public URL; prod config enforces both. In prod the link is
  // never written to the log: without SMTP there is no sign-in.
  const resolvers: AuthResolver[] = [];
  let authRoutes: AuthRouteDeps | undefined;
  let accountRoutes: AccountRouteDeps | undefined;
  const canMail = Boolean(config.smtp) || config.env !== 'prod';
  if (config.authSecret && config.publicUrl && canMail) {
    const betterAuth = createAuth({
      pool,
      secret: config.authSecret,
      publicUrl: config.publicUrl,
      trustedOrigins: [...config.trustedOrigins, ...config.appOrigins],
      mailer: config.smtp
        ? new SmtpMailer(config.smtp, log)
        : config.mailDir
          ? new FileMailer(config.mailDir)
          : new LogMailer(log),
      production: config.env === 'prod',
    });
    const sessions = new SessionResolver(betterAuth);
    resolvers.push(sessions);
    accountRoutes = {
      repo: new PgAccountRepository(pool),
      privacy: new PgPrivacyRepository(pool),
      sessions: { actor: (h) => sessions.sessionActor(h) },
      secondFactor: new SecondFactorService(
        new PgSecondFactorRepository(pool),
        new SecretBox(config.authSecret, 'totp')
      ),
      audit: ({ actorId, action, ip }) =>
        writeAudit(pool, {
          actorId,
          action,
          targetType: 'user',
          targetId: actorId,
          ipAddress: ip,
        }),
      log,
    };
    authRoutes = {
      handler: (request) => betterAuth.handler(request),
      me: (h) => sessions.me(h),
    };
    log.info(
      {
        mail: config.smtp ? 'smtp' : config.mailDir ? 'file' : 'log',
        origins: config.trustedOrigins,
      },
      'auth.enabled'
    );
  } else if (!canMail) {
    log.error(
      'auth.disabled: SMTP is not configured (ARDA_SMTP_HOST and ARDA_MAIL_FROM)'
    );
  } else {
    log.warn('auth.disabled (set ARDA_AUTH_SECRET and ARDA_PUBLIC_URL)');
  }
  const auth: AuthResolver =
    resolvers.length > 0 ? new ChainResolver(resolvers) : new DenyAllResolver();
  const admin: AdminRouteDeps = { repo: new PgAdminRepository(pool), auth, log };
  // Translation of teachers' written remarks (ADR-0020): off without an API key.
  const translation = config.translation;
  const translations = new TranslationService({
    translator: translation
      ? new ClaudeTranslator(
          new Anthropic({ apiKey: translation.apiKey }),
          translation.model,
          log
        )
      : null,
    repo: new PgTranslationRepository(pool),
    dailyLimit: translation?.dailyLimit ?? 0,
  });
  log.info(
    translation
      ? { model: translation.model, dailyLimit: translation.dailyLimit }
      : { reason: 'ARDA_ANTHROPIC_API_KEY is not set' },
    translation ? 'translate.enabled' : 'translate.disabled'
  );

  const app = createApp({
    version: config.version,
    expectedRevision: expectedRevision(migrations),
    health: { schemaRevision: () => currentRevision(pool) },
    onProbeError: (error) => log.warn({ err: error }, 'health.probe_failed'),
    auth: authRoutes,
    account: accountRoutes,
    admin,
    translations: { service: translations, auth, log },
    allowedOrigin: config.trustedOrigins,
    appOrigins: config.appOrigins,
    authzLog: log,
    onUnhandledError: (error, path) => log.error({ err: error, path }, 'http.unhandled'),
  });

  const server = serve({ fetch: app.fetch, port: config.port }, (info) =>
    log.info({ port: info.port }, 'service.listening')
  );
  const stop = (signal: NodeJS.Signals) => {
    log.info({ signal }, 'service.stopping');
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: 'fatal',
      msg: 'service.crashed',
      err: error instanceof Error ? { name: error.name, message: error.message } : error,
    })
  );
  process.exit(1);
});
