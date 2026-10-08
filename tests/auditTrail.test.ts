import { describe, expect, it } from 'vitest';
import { auditState, auditReason } from '../src/server/auditService';
import { AUDIT_EVENT_LABELS } from '../src/types/audit';
import { resolveTabForRole, pathToTab } from '../src/lib/routes';
describe('Audit allowlist and Admin navigation boundaries', () => {
  it('keeps selective primitive state without full profiles, sessions, documents, pupil data or credentials', () => {
    const state = auditState({
      status: 'FINAL',
      revision: 2,
      password: 'secretvalue',
      passwordHash: 'hash',
      JWT: 'jwt',
      cookies: 'session',
      authorization: 'Bearer key',
      apiKey: 'sk-value',
      DATABASE_URL: 'postgresql://host/db',
      students: [{ name: 'private' }],
      content: { report: 'private' },
      finalSnapshot: { teacher: 'private' },
      districtId: { nested: 'not primitive' },
      actorUserId: 'caller-forged',
    });
    expect(state).toEqual({ status: 'FINAL', revision: 2 });
  });
  it.each([
    'password=secret',
    'Authorization: Bearer abc',
    'postgresql://username:password@host/db',
    'api_key=sk-private',
    'eyJhbGciOi.x.y',
  ])('redacts sensitive context %s', (value) => {
    expect(auditReason(value)).toBeNull();
    expect(auditState({ status: value })).toEqual({});
  });
  it('preserves domain reason and machine types, but never adds read/slot audit types', () => {
    expect(auditReason('سبب مهني موجز')).toBe('سبب مهني موجز');
    expect(
      Object.keys(AUDIT_EVENT_LABELS).some((key) => /OPENED|PRINTED|LOGIN|SLOT|WEEKLY/.test(key))
    ).toBe(false);
  });
  it('permits Audit UI only for Admin, and recognizes its existing workspace route', () => {
    expect(pathToTab('/admin/audit')).toBe('admin_audit');
    expect(resolveTabForRole('admin_audit', 'admin')).toBe('admin_audit');
    for (const role of ['teacher', 'inspector', 'director'] as const)
      expect(resolveTabForRole('admin_audit', role)).not.toBe('admin_audit');
  });
});
