import { describe, expect, it } from 'vitest';
import {
  ConfigError,
  loadConfig,
  parseOrigins,
  redactDatabaseUrl,
} from '../src/config.js';

const DB = 'postgres://arda:0123456789abcdef0123@db:5432/arda';
const SECRET = 'a'.repeat(16) + 'b'.repeat(16) + 'c'.repeat(16);

function issues(env: NodeJS.ProcessEnv): string[] {
  try {
    loadConfig(env);
    return [];
  } catch (error) {
    if (error instanceof ConfigError) return error.issues;
    throw error;
  }
}

describe('loadConfig', () => {
  it('starts in dev with only a database URL; sign-in stays off', () => {
    const config = loadConfig({ ARDA_DATABASE_URL: DB });
    expect(config).toMatchObject({ env: 'dev', port: 8000, authSecret: undefined });
    expect(config.smtp).toBeUndefined();
    expect(config.appOrigins).toEqual(['capacitor://localhost', 'https://localhost']);
  });

  it('refuses to start in prod without secrets and the public URL', () => {
    const found = issues({
      ARDA_ENV: 'prod',
      ARDA_DATABASE_URL: 'postgres://arda:arda@db:5432/arda',
    });
    expect(found).toEqual(
      expect.arrayContaining([
        'ARDA_AUTH_SECRET is required in prod',
        'ARDA_DATABASE_URL must contain a generated password (>= 16 chars) in prod',
        'ARDA_PUBLIC_URL is required in prod',
      ])
    );
  });

  it('refuses short or placeholder auth secrets in prod', () => {
    for (const secret of ['short', 'change-me']) {
      expect(
        issues({
          ARDA_ENV: 'prod',
          ARDA_DATABASE_URL: DB,
          ARDA_PUBLIC_URL: 'https://arda.example.org',
          ARDA_AUTH_SECRET: secret,
        })
      ).toContain('ARDA_AUTH_SECRET must be at least 32 random characters');
    }
  });

  it('accepts a complete prod configuration and derives the trusted origins', () => {
    const config = loadConfig({
      ARDA_ENV: 'prod',
      ARDA_DATABASE_URL: DB,
      ARDA_AUTH_SECRET: SECRET,
      ARDA_PUBLIC_URL: 'https://arda-stg.siralabs.org/',
      ARDA_TRUSTED_ORIGINS: 'https://old.example.org',
      ARDA_SMTP_HOST: 'smtp-relay.gmail.com',
      ARDA_MAIL_FROM: 'ʿArḍa <noreply@siralabs.org>',
    });
    expect(config.publicUrl).toBe('https://arda-stg.siralabs.org');
    expect(config.trustedOrigins).toEqual([
      'https://arda-stg.siralabs.org',
      'https://old.example.org',
    ]);
    expect(config.smtp).toMatchObject({
      host: 'smtp-relay.gmail.com',
      port: 587,
      auth: undefined,
      clientName: 'arda-stg.siralabs.org',
    });
  });

  it('wants SMTP host and sender, user and password together', () => {
    expect(
      issues({ ARDA_DATABASE_URL: DB, ARDA_SMTP_HOST: 'smtp.example.org' })
    ).toContain('ARDA_SMTP_HOST and ARDA_MAIL_FROM go together');
    expect(issues({ ARDA_DATABASE_URL: DB, ARDA_SMTP_USER: 'u' })).toContain(
      'ARDA_SMTP_USER and ARDA_SMTP_PASSWORD go together'
    );
  });

  it('never writes sign-in links to files in prod', () => {
    expect(
      issues({
        ARDA_ENV: 'prod',
        ARDA_DATABASE_URL: DB,
        ARDA_AUTH_SECRET: SECRET,
        ARDA_PUBLIC_URL: 'https://arda.example.org',
        ARDA_MAIL_DIR: '/tmp/mail',
      })
    ).toContain('ARDA_MAIL_DIR must not be set in prod');
  });

  it('refuses app origins that are not app origins', () => {
    expect(
      issues({ ARDA_DATABASE_URL: DB, ARDA_APP_ORIGINS: 'https://evil.example/path' })
    ).toHaveLength(1);
  });
});

describe('parseOrigins', () => {
  it('accepts bare origins and reports anything else', () => {
    const parsed = parseOrigins(
      'https://a.example, https://b.example/, https://c.example/x'
    );
    expect(parsed.origins).toEqual(['https://a.example', 'https://b.example']);
    expect(parsed.issues).toHaveLength(1);
  });
});

describe('redactDatabaseUrl', () => {
  it('masks the password', () => {
    expect(redactDatabaseUrl(DB)).toBe('postgres://arda:***@db:5432/arda');
  });
});
