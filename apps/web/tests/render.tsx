import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nProvider';
import { AuthClient, type Me } from '@/services/auth';
import { SessionProvider } from '@/state/session';

export interface Call {
  path: string;
  method: string;
  body: unknown;
}

/** An AuthClient over a fake fetch: answers by path, records every call. */
export function fakeApi(
  answers: Record<string, Response | (() => Response)>,
  me: Me | null = null
) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    calls.push({
      path,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (path === '/api/v1/me') {
      return me
        ? Response.json(me)
        : Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const answer = answers[path];
    if (typeof answer === 'function') return answer();
    return answer?.clone() ?? Response.json({ error: 'not_found' }, { status: 404 });
  }) as unknown as typeof fetch;
  return { client: new AuthClient(fetchImpl), calls };
}

export function Providers({
  client,
  children,
}: {
  client: AuthClient;
  children: ReactNode;
}) {
  return (
    <SessionProvider client={client}>
      <I18nProvider>{children}</I18nProvider>
    </SessionProvider>
  );
}
