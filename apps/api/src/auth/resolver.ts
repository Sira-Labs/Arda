/**
 * Resolves the authenticated user of a request (dependency-injected into the routes).
 *
 * Implementations:
 * - `SessionResolver` (betterAuth.ts): the session cookie (web) or signed bearer token (app).
 * - `DenyAllResolver` (default when sign-in is off): every request is unauthenticated, so
 *   protected routes answer 401.
 */
import type { Actor } from '../authz/policies.js';

export interface AuthResolver {
  /** The signed-in person with their platform role, or null when unauthenticated. */
  actor(headers: Headers): Promise<Actor | null>;
}

export class DenyAllResolver implements AuthResolver {
  async actor(): Promise<null> {
    return null;
  }
}
