import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nProvider';
import { ReviewProvider } from '@/review/ReviewProvider';
import { MemoryReviewStore } from '@/review/store';
import { AuthClient, type Me } from '@/services/auth';
import { SessionProvider } from '@/state/session';

export interface Call {
  path: string;
  method: string;
  body: unknown;
}

/** An AuthClient over a fake fetch: answers by "METHOD path" or path, records every call. */
export function fakeApi(
  answers: Record<string, Response | (() => Response | Promise<Response>)>,
  me: Me | null = null
) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    calls.push({
      path,
      method: init?.method ?? 'GET',
      // A recording's body is its sound, not JSON.
      body:
        typeof init?.body === 'string'
          ? JSON.parse(init.body)
          : (init?.body ?? undefined),
    });
    if (path === '/api/v1/me') {
      return me
        ? Response.json(me)
        : Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const bare = path.split('?')[0]!;
    const answer =
      answers[`${init?.method ?? 'GET'} ${path}`] ??
      answers[path] ??
      answers[`${init?.method ?? 'GET'} ${bare}`];
    if (typeof answer === 'function') return answer();
    if (answer) return answer.clone();
    // Recitations (S4.1) have their own tests; elsewhere nobody has sent any yet.
    if ((init?.method ?? 'GET') === 'GET' && /\/recordings(\?.*)?$/.test(path)) {
      return Response.json({ recordings: [], more: false });
    }
    // Nor has anyone recited to a sheikh yet (T4).
    if ((init?.method ?? 'GET') === 'GET' && /\/arda-log\/summary$/.test(path)) {
      return Response.json({ summary: [] });
    }
    // Nor struggles with a rule (T5).
    if ((init?.method ?? 'GET') === 'GET' && /\/halaqat\/[^/]+\/rules$/.test(path)) {
      return Response.json({ since: '2026-07-12', struggles: [] });
    }
    return Response.json({ error: 'not_found' }, { status: 404 });
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
      <I18nProvider>
        {/* As in the app: every screen may log practice (ADR-0023); a test that looks at the
            deck passes its own provider inside. */}
        <ReviewProvider store={new MemoryReviewStore()}>{children}</ReviewProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
