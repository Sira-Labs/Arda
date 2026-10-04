import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  can,
  needsSecondFactor,
  ROLES,
  type Action,
  type Role,
} from '../src/authz/policies.js';

/**
 * The expected matrix, written out by hand on purpose: a change to RBAC_MATRIX must be made
 * here as well, so widening a permission is always a visible, reviewed decision.
 */
const EXPECTED: Record<Action, readonly Role[]> = {
  'profile:read': ['student', 'teacher', 'admin'],
  'profile:write': ['student', 'teacher', 'admin'],
  'halaqa:create': ['teacher', 'admin'],
  'halaqa:manage': ['admin'], // without a ḥalaqa scope only admins
  'halaqa:join': ['student', 'teacher', 'admin'],
  'halaqa:read': ['admin'], // without a ḥalaqa scope only admins
  'halaqa:study': [], // without a ḥalaqa scope nobody, admins included
  'halaqa:review': ['admin'], // without a ḥalaqa scope only admins
  'feedback:translate': ['teacher', 'admin'],
  'admin:users:read': ['admin'],
  'admin:users:write': ['admin'],
  'admin:audit:read': ['admin'],
};

describe('authz policies', () => {
  it('covers every action in the expected matrix', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...ACTIONS].sort());
  });

  for (const action of ACTIONS) {
    for (const role of ROLES) {
      const allowed = EXPECTED[action].includes(role);
      it(`${role} ${allowed ? 'may' : 'may not'} ${action}`, () => {
        expect(can({ id: 'u', role }, action)).toBe(allowed);
      });
    }
  }

  it('denies everything to anonymous callers', () => {
    for (const action of ACTIONS) expect(can(null, action)).toBe(false);
  });

  it('lets a sheikh review recitations only in ḥalaqāt he teaches', () => {
    const teacher = { id: 't', role: 'teacher' } as const;
    expect(can(teacher, 'halaqa:review', { halaqaRole: 'teacher' })).toBe(true);
    expect(can(teacher, 'halaqa:review', { halaqaRole: 'student' })).toBe(false);
    expect(can(teacher, 'halaqa:review', { halaqaRole: null })).toBe(false);
  });

  it('never lets a student review, even with a stale teacher row', () => {
    // Platform role gates the capability first; a stale ḥalaqa row cannot widen it.
    const student = { id: 's', role: 'student' } as const;
    expect(can(student, 'halaqa:review', { halaqaRole: 'teacher' })).toBe(false);
    expect(can(student, 'halaqa:manage', { halaqaRole: 'teacher' })).toBe(false);
  });

  it('lets active members of a ḥalaqa, and only them, read it', () => {
    const student = { id: 's', role: 'student' } as const;
    expect(can(student, 'halaqa:read', { halaqaRole: 'student' })).toBe(true);
    expect(can(student, 'halaqa:read', { halaqaRole: 'teacher' })).toBe(true);
    expect(can(student, 'halaqa:read', { halaqaRole: null })).toBe(false);
    expect(can(student, 'halaqa:read')).toBe(false);
  });

  it('lets only the students of a ḥalaqa mark its assignments done', () => {
    for (const role of ROLES) {
      const actor = { id: 'u', role };
      expect(can(actor, 'halaqa:study', { halaqaRole: 'student' })).toBe(true);
      expect(can(actor, 'halaqa:study', { halaqaRole: 'teacher' })).toBe(false);
      expect(can(actor, 'halaqa:study', { halaqaRole: null })).toBe(false);
    }
  });

  it('asks admins for a confirmed second factor on every admin action', () => {
    const admin = { id: 'a', role: 'admin' } as const;
    for (const action of ACTIONS.filter((a) => a.startsWith('admin:'))) {
      expect(needsSecondFactor(admin, action)).toBe(true);
      expect(needsSecondFactor({ ...admin, secondFactor: true }, action)).toBe(false);
    }
    expect(needsSecondFactor(admin, 'profile:read')).toBe(false);
  });
});
