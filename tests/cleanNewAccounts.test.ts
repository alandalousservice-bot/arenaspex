import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
const auth = readFileSync('src/hooks/useAuth.ts', 'utf8');
const register = readFileSync('src/server/authRouter.ts', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const gradebook = readFileSync('src/components/gradebook/GradebookView.tsx', 'utf8');
const inspector = readFileSync('src/components/dashboard/InspectorDashboard.tsx', 'utf8');
const curriculum = readFileSync('src/data/algerianCurriculum.ts', 'utf8');
const knowledge = readFileSync('src/data/knowledgeBankData.ts', 'utf8');

describe('new account data cleanliness', () => {
  it('does not hydrate authenticated state or store with demo user data', () => {
    expect(auth).not.toContain('DEMO_USERS[0]');
    expect(store).toContain('return [];');
    expect(store).not.toContain('localStorage.getItem(\'spex_teacher_classes\')');
    expect(store).not.toContain('localStorage.getItem(\'spex_all_students\')');
    expect(app).not.toContain('DEMO_USERS.find');
  });

  it('keeps registration optional profile fields empty when omitted', () => {
    expect(register).toContain('phone: phone || null');
    expect(register).toContain('schoolName: role === \'inspector\' ? null : schoolName || null');
    expect(register).toContain('institutionId: role === \'inspector\' ? null : eduSchoolId || null');
  });

  it('keeps empty roster and operational metrics empty', () => {
    expect(gradebook).toContain('const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0] || { id: \'\', name: \'\', studentCount: 0 }');
    expect(gradebook).toContain('attendanceRate: 0');
    expect(inspector).toContain('لا يوجد أساتذة مرتبطون بهذه المقاطعة حالياً.');
    expect(inspector).toContain('const safeTeachers = (Array.isArray(teachers) ? teachers : []).filter(Boolean);');
  });

  it('preserves platform pedagogical reference content', () => {
    expect(curriculum).toContain('COMPLETE_ANNUAL_CURRICULUM');
    expect(knowledge).toContain('INITIAL_KNOWLEDGE_BANK');
  });
});
