/**
 * Same-origin JSON requests to ʿArḍa's API with the session cookie (ported from Suffa). A
 * failure carries the API's error code; the page shows it in the learner's language from the
 * i18n catalogs (`errors`, ADR-0020).
 */
export type ApiResult<T> =
  { ok: true; value: T } | { ok: false; status: number; code: string };

export type Fetch = typeof fetch;

export async function apiRequest<T>(
  fetchImpl: Fetch,
  path: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(path, {
      ...init,
      credentials: 'same-origin',
      headers: init.body ? { 'content-type': 'application/json' } : undefined,
    });
  } catch {
    return { ok: false, status: 0, code: 'offline' };
  }
  if (response.status === 204) return { ok: true, value: undefined as T };
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    code?: string;
  } | null;
  if (!response.ok) {
    // Our routes answer { error }, Better Auth's { code }.
    return { ok: false, status: response.status, code: body?.error ?? body?.code ?? '' };
  }
  return { ok: true, value: body as T };
}
