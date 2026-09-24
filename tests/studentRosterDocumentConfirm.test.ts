import { describe, expect, it, vi } from 'vitest';
import {
  persistStudentRosterDocumentGroups,
  prepareStudentRosterDocumentGroups,
  normalizeRosterSection,
  StudentRosterDocumentConfirmError,
} from '../src/services/studentRosterDocumentConfirm.service';

const group = (teacherRows = 2) => ({
  groupName: 'السنة الرابعة ابتدائي 01',
  grade: 4,
  section: '01',
  schoolYear: '2026-2027',
  rows: Array.from({ length: teacherRows }, (_, index) => ({
    matricule: `110172000000${String(index + 1).padStart(4, '0')}`,
    firstName: `اسم وهمي ${index + 1}`,
    lastName: 'لقب تجريبي',
    birthDate: '2016-01-02',
    rowNumber: index + 1,
  })),
});

function createMemoryTransaction(initial: { classes?: any[]; students?: any[] } = {}) {
  const state = {
    classes: [...(initial.classes || [])],
    students: [...(initial.students || [])],
  };
  const tx = {
    studentClass: {
      findMany: vi.fn(async ({ where }: any) =>
        state.classes.filter(
          (item) =>
            item.teacherId === where.teacherId &&
            item.institutionId === where.institutionId &&
            where.levelId.in.includes(item.levelId)
        )
      ),
      create: vi.fn(async ({ data }: any) => {
        const created = { ...data, createdAt: new Date() };
        state.classes.push(created);
        return created;
      }),
    },
    student: {
      findMany: vi.fn(async ({ where }: any) =>
        state.students.filter(
          (item) => item.teacherId === where.teacherId && where.matricule.in.includes(item.matricule)
        )
      ),
      createMany: vi.fn(async ({ data }: any) => {
        state.students.push(...data);
        return { count: data.length };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const current = state.students.find((item) => item.id === where.id);
        if (current) Object.assign(current, data);
        return current;
      }),
      count: vi.fn(async ({ where }: any) =>
        state.students.filter(
          (item) => item.teacherId === where.teacherId && item.classId === where.classId
        ).length
      ),
    },
  };
  return { state, tx };
}

describe('teacher roster document confirm contract', () => {
  it('validates imported identities as strings and prefers the provided national identity in the parser contract', () => {
    const groups = prepareStudentRosterDocumentGroups([group(1)]);
    expect(groups[0].rows[0].matricule).toBe('1101720000000001');
    expect(typeof groups[0].rows[0].matricule).toBe('string');
    expect(groups[0].rows[0].schoolYear).toBe('2026-2027');
  });

  it('supports an empty-class teacher and creates class plus students atomically through the transaction client', async () => {
    const { state, tx } = createMemoryTransaction();
    const result = await persistStudentRosterDocumentGroups(tx as any, {
      groups: prepareStudentRosterDocumentGroups([group()]),
      teacherId: 'teacher-a',
      institutionId: 'institution-a',
    });
    expect(result.summary).toMatchObject({ classesCreated: 1, classesReused: 0, created: 2, existing: 0 });
    expect(state.classes).toHaveLength(1);
    expect(state.classes[0].teacherId).toBe('teacher-a');
    expect(state.students).toHaveLength(2);
    expect(state.students.every((student) => student.classId === state.classes[0].id)).toBe(true);
  });

  it('is idempotent when the same document is confirmed again', async () => {
    const { state, tx } = createMemoryTransaction();
    const groups = prepareStudentRosterDocumentGroups([group()]);
    await persistStudentRosterDocumentGroups(tx as any, {
      groups,
      teacherId: 'teacher-a',
      institutionId: 'institution-a',
    });
    const second = await persistStudentRosterDocumentGroups(tx as any, {
      groups,
      teacherId: 'teacher-a',
      institutionId: 'institution-a',
    });
    expect(second.summary).toMatchObject({ classesCreated: 0, classesReused: 1, created: 0, existing: 2 });
    expect(state.classes).toHaveLength(1);
    expect(state.students).toHaveLength(2);
  });

  it('does not query or mutate another teacher roster', async () => {
    const foreignClass = {
      id: 'class-b',
      teacherId: 'teacher-b',
      institutionId: 'institution-b',
      levelId: 'lvl_p4',
      name: 'السنة الرابعة ابتدائي 01',
    };
    const foreignStudent = {
      id: 'student-b',
      teacherId: 'teacher-b',
      institutionId: 'institution-b',
      classId: 'class-b',
      matricule: '1101720000000001',
      firstName: 'اسم محفوظ',
      lastName: 'لقب محفوظ',
    };
    const { state, tx } = createMemoryTransaction({ classes: [foreignClass], students: [foreignStudent] });
    const result = await persistStudentRosterDocumentGroups(tx as any, {
      groups: prepareStudentRosterDocumentGroups([group(1)]),
      teacherId: 'teacher-a',
      institutionId: 'institution-a',
    });
    expect(tx.studentClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teacherId: 'teacher-a' }) })
    );
    expect(result.summary.created).toBe(1);
    expect(state.classes.filter((item) => item.teacherId === 'teacher-b')).toEqual([foreignClass]);
    expect(state.students.find((item) => item.id === 'student-b')).toEqual(foreignStudent);
  });

  it('blocks repeated national identity across selected classes before any transaction starts', () => {
    const first = group(1);
    const second = { ...group(1), groupName: 'السنة الرابعة ابتدائي 02', section: '02' };
    second.rows = [{ ...first.rows[0] }];
    expect(() => prepareStudentRosterDocumentGroups([first, second])).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_IN_FILE' })
    );
  });

  it('deduplicates an identical repeated row inside one group but rejects contradictory identity', () => {
    const repeated = group(1);
    repeated.rows.push({ ...repeated.rows[0] });
    expect(prepareStudentRosterDocumentGroups([repeated])[0].rows).toHaveLength(1);

    repeated.rows[1] = { ...repeated.rows[1], firstName: 'اسم مختلف' };
    expect(() => prepareStudentRosterDocumentGroups([repeated])).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_IN_FILE' })
    );
  });

  it('rejects malformed groups and rows without persisting anything', () => {
    expect(() => prepareStudentRosterDocumentGroups([{ ...group(), grade: 7 }])).toThrowError(
      StudentRosterDocumentConfirmError
    );
    expect(() => prepareStudentRosterDocumentGroups([{ ...group(), rows: [{ matricule: '1' }] }])).toThrowError(
      expect.objectContaining({ code: 'INVALID_ROW' })
    );
  });

  it('normalizes sections including values above 02 and Arabic numerals', () => {
    expect(normalizeRosterSection('1')).toBe('01');
    expect(normalizeRosterSection('٠١')).toBe('01');
    expect(normalizeRosterSection('03')).toBe('03');
    expect(normalizeRosterSection('120')).toBe('120');
    expect(normalizeRosterSection('0')).toBeUndefined();
    expect(normalizeRosterSection('1A')).toBeUndefined();
  });

  it('derives PDF class identity from reviewed grade and section and requires a valid year', () => {
    const reviewed = { ...group(1), source: 'pdf' as const, groupName: 'client value ignored', grade: 4, section: '1' };
    expect(prepareStudentRosterDocumentGroups([reviewed])[0]).toMatchObject({
      groupName: 'السنة الرابعة ابتدائي 01',
      grade: 4,
      levelId: 'lvl_p4',
      section: '01',
      schoolYear: '2026-2027',
    });
    expect(() => prepareStudentRosterDocumentGroups([{ ...reviewed, grade: 6 }])).toThrowError(
      expect.objectContaining({ code: 'INVALID_GROUPS' })
    );
    expect(() => prepareStudentRosterDocumentGroups([{ ...reviewed, section: '0' }])).toThrowError(
      expect.objectContaining({ code: 'INVALID_GROUPS' })
    );
    expect(() => prepareStudentRosterDocumentGroups([{ ...reviewed, schoolYear: '2026-2028' }])).toThrowError(
      expect.objectContaining({ code: 'INVALID_GROUPS' })
    );
  });

  it('blocks two PDF groups assigned to the same canonical level, section, and year', () => {
    const first = { ...group(1), source: 'pdf' as const, groupName: 'ignored', section: '1' };
    const second = { ...group(1), source: 'pdf' as const, groupName: 'also ignored', section: '01', rows: [{ ...group(1).rows[0], matricule: '2201720000000002' }] };
    expect(() => prepareStudentRosterDocumentGroups([first, second])).toThrowError(
      expect.objectContaining({ code: 'INVALID_GROUPS' })
    );
  });
});
