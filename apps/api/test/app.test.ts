import { describe, expect, it } from 'vitest';
import { createApp, type AppDeps } from '../src/app.js';
import { DenyAllResolver } from '../src/auth/resolver.js';
import type { AdminRepository } from '../src/admin/repository.js';

const ORIGIN = 'https://arda.example.org';

function app(overrides: Partial<AppDeps> = {}) {
  return createApp({
    version: 'sha-test',
    expectedRevision: '0001_users_and_auth',
    health: { schemaRevision: async () => '0001_users_and_auth' },
    allowedOrigin: [ORIGIN],
    ...overrides,
  });
}

describe('health', () => {
  it('reports ok with version and schema when the database is current', async () => {
    const response = await app().request('/healthz');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      version: 'sha-test',
      schemaRevision: '0001_users_and_auth',
      auth: 'disabled',
    });
  });

  it('is degraded (503) while the schema lags behind the image', async () => {
    const response = await app({
      health: { schemaRevision: async () => null },
    }).request('/api/healthz');
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'degraded' });
  });

  it('answers 503 without details when the database is unreachable', async () => {
    const errors: unknown[] = [];
    const response = await app({
      health: {
        schemaRevision: async () => {
          throw new Error('connect ECONNREFUSED');
        },
      },
      onProbeError: (error) => errors.push(error),
    }).request('/healthz');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: 'error',
      version: 'sha-test',
      db: 'unreachable',
    });
    expect(errors).toHaveLength(1);
  });
});

describe('without sign-in configured', () => {
  it('has no auth routes and no /me', async () => {
    const a = app();
    expect((await a.request('/api/v1/me')).status).toBe(404);
    expect(
      (await a.request('/api/v1/auth/sign-in/magic-link', { method: 'POST' })).status
    ).toBe(404);
  });

  it('keeps the admin area closed to everyone', async () => {
    const repo = {} as AdminRepository;
    const a = app({
      admin: { repo, auth: new DenyAllResolver(), log: { warn: () => {} } },
    });
    expect((await a.request('/api/v1/admin/users')).status).toBe(401);
  });
});

describe('auth surface', () => {
  const handled: string[] = [];
  const withAuth = app({
    auth: {
      handler: async (request) => {
        handled.push(`${request.method} ${new URL(request.url).pathname}`);
        return Response.json({ status: true });
      },
      me: async () => null,
    },
  });

  it('passes only allow-listed Better Auth endpoints through', async () => {
    const allowed = await withAuth.request('/api/v1/auth/sign-in/magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ email: 'a@example.org', callbackURL: '/' }),
    });
    expect(allowed.status).toBe(200);
    for (const path of ['/forget-password', '/list-sessions', '/delete-user']) {
      const closed = await withAuth.request(`/api/v1/auth${path}`, {
        method: 'POST',
        headers: { origin: ORIGIN },
      });
      expect(closed.status).toBe(404);
    }
    expect(handled).toEqual(['POST /api/v1/auth/sign-in/magic-link']);
  });

  it('refuses a redirect to another site', async () => {
    const response = await withAuth.request('/api/v1/auth/sign-in/magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ email: 'a@example.org', callbackURL: '//evil.example' }),
    });
    expect(response.status).toBe(400);
  });

  it('refuses cross-site writes', async () => {
    const response = await withAuth.request('/api/v1/auth/sign-out', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });
    expect(response.status).toBe(403);
  });
});
