import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  canonicalClassIdentityKey,
  normalizeExcelMatricule,
  normalizeRosterSchoolYear,
  type ParsedRosterStudent,
} from './studentRosterImport.service.js';
import { persistStudentRosterRows } from './studentRosterPersistence.service.js';

export interface StudentRosterDocumentGroupInput {
  groupName: string;
  grade: number;
  section?: string;
  schoolYear?: string;
  source?: 'pdf' | 'xlsx' | 'xls';
  rows: unknown[];
}

export interface PreparedStudentRosterDocumentGroup {
  groupName: string;
  grade: number;
  levelId: string;
  section?: string;
  schoolYear?: string;
  source?: 'pdf' | 'xlsx' | 'xls';
  rows: ParsedRosterStudent[];
}

export class StudentRosterDocumentConfirmError extends Error {
  constructor(
    readonly code:
      | 'INVALID_GROUPS'
      | 'INVALID_ROW'
      | 'DUPLICATE_IN_FILE'
      | 'AMBIGUOUS_CLASS'
  ) {
    super(code);
    this.name = 'StudentRosterDocumentConfirmError';
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const gradeName = (grade: number) =>
  ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'][grade];

export function normalizeRosterSection(value: unknown): string | undefined {
  const text = String(value ?? '').normalize('NFKC')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .trim();
  if (!/^\d{1,4}$/.test(text)) return undefined;
  const section = Number(text);
  if (!Number.isInteger(section) || section < 1 || section > 9999) return undefined;
  return String(section).padStart(2, '0');
}

export function prepareStudentRosterDocumentGroups(
  input: unknown
): PreparedStudentRosterDocumentGroup[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50)
    throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');
  const totalRows = input.reduce(
    (count, group) => count + (isPlainObject(group) && Array.isArray(group.rows) ? group.rows.length : 0),
    0
  );
  if (totalRows > 1000) throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');

  const prepared: PreparedStudentRosterDocumentGroup[] = [];
  const groupIdentitySet = new Set<string>();
  const matriculeGroup = new Map<string, string>();

  for (const rawGroup of input) {
    if (!isPlainObject(rawGroup)) throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');
    const requestedGroupName = typeof rawGroup.groupName === 'string' ? rawGroup.groupName.trim() : '';
    const grade = Number(rawGroup.grade);
    const source = rawGroup.source === 'pdf' || rawGroup.source === 'xls' || rawGroup.source === 'xlsx'
      ? rawGroup.source
      : undefined;
    if (!Number.isInteger(grade) || grade < 1 || grade > 5)
      throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');
    const section = rawGroup.section === undefined || rawGroup.section === ''
      ? undefined
      : normalizeRosterSection(rawGroup.section);
    if (rawGroup.section !== undefined && rawGroup.section !== '' && !section)
      throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');
    const schoolYear = rawGroup.schoolYear ? normalizeRosterSchoolYear(rawGroup.schoolYear) : undefined;
    if ((rawGroup.schoolYear && !schoolYear) || (source === 'pdf' && (!section || !schoolYear)))
      throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');
    const groupName = source === 'pdf'
      ? `السنة ${gradeName(grade)} ابتدائي ${section}`
      : requestedGroupName;
    if (!groupName || groupName.length > 120)
      throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');
    const levelId = `lvl_p${grade}`;
    const groupKey = `${canonicalClassIdentityKey(levelId, groupName)}|${schoolYear || ''}`;
    if (groupIdentitySet.has(groupKey)) throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');
    groupIdentitySet.add(groupKey);
    if (!Array.isArray(rawGroup.rows) || !rawGroup.rows.length)
      throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');

    const uniqueRows = new Map<string, ParsedRosterStudent>();
    for (const rawRow of rawGroup.rows) {
      if (!isPlainObject(rawRow)) throw new StudentRosterDocumentConfirmError('INVALID_ROW');
      const firstName = typeof rawRow.firstName === 'string' ? rawRow.firstName.trim() : '';
      const lastName = typeof rawRow.lastName === 'string' ? rawRow.lastName.trim() : '';
      const normalizedId = normalizeExcelMatricule(rawRow.matricule);
      const rowNumber = Number(rawRow.rowNumber);
      if (
        !firstName || firstName.length > 120 || !lastName || lastName.length > 120 ||
        !normalizedId.value || normalizedId.error || !Number.isInteger(rowNumber) || rowNumber < 1
      )
        throw new StudentRosterDocumentConfirmError('INVALID_ROW');
      const birthDate = typeof rawRow.birthDate === 'string' ? rawRow.birthDate : undefined;
      if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))
        throw new StudentRosterDocumentConfirmError('INVALID_ROW');
      const row: ParsedRosterStudent = {
        matricule: normalizedId.value,
        firstName,
        lastName,
        birthDate,
        grade,
        groupName,
        schoolYear,
        rowNumber,
      };
      const previous = uniqueRows.get(row.matricule);
      if (previous) {
        if (previous.firstName !== firstName || previous.lastName !== lastName)
          throw new StudentRosterDocumentConfirmError('DUPLICATE_IN_FILE');
        continue;
      }
      uniqueRows.set(row.matricule, row);
      const previousGroup = matriculeGroup.get(row.matricule);
      if (previousGroup && previousGroup !== groupKey)
        throw new StudentRosterDocumentConfirmError('DUPLICATE_IN_FILE');
      matriculeGroup.set(row.matricule, groupKey);
    }
    if (!uniqueRows.size) throw new StudentRosterDocumentConfirmError('INVALID_GROUPS');
    prepared.push({
      groupName,
      grade,
      levelId,
      section,
      schoolYear,
      source,
      rows: [...uniqueRows.values()],
    });
  }
  return prepared;
}

export async function persistStudentRosterDocumentGroups(
  tx: Prisma.TransactionClient,
  input: {
    groups: PreparedStudentRosterDocumentGroup[];
    teacherId: string;
    institutionId: string | null;
  }
) {
  const ownedClasses = await tx.studentClass.findMany({
    where: {
      teacherId: input.teacherId,
      institutionId: input.institutionId,
      levelId: { in: [...new Set(input.groups.map((group) => group.levelId))] },
    },
    orderBy: { createdAt: 'asc' },
  });
  const summaries: Array<{ id: string; groupName: string; summary: unknown; created: boolean }> = [];

  for (const group of input.groups) {
    const classKey = canonicalClassIdentityKey(group.levelId, group.groupName);
    const candidates = ownedClasses.filter(
      (candidate) =>
        candidate.levelId === group.levelId &&
        canonicalClassIdentityKey(candidate.levelId, candidate.name) === classKey
    );
    if (candidates.length > 1) throw new StudentRosterDocumentConfirmError('AMBIGUOUS_CLASS');
    let studentClass = candidates[0];
    let created = false;
    if (!studentClass) {
      studentClass = await tx.studentClass.create({
        data: {
          id: `cls_${randomUUID()}`,
          teacherId: input.teacherId,
          institutionId: input.institutionId,
          levelId: group.levelId,
          name: group.groupName,
        },
      });
      ownedClasses.push(studentClass);
      created = true;
    }
    const summary = await persistStudentRosterRows(tx, {
      rows: group.rows,
      teacherId: input.teacherId,
      institutionId: input.institutionId,
      persistedClassId: studentClass.id,
    });
    summaries.push({ id: studentClass.id, groupName: group.groupName, summary, created });
  }

  const totals = summaries.reduce(
    (total, item) => {
      const summary = item.summary as {
        created: number;
        existing: number;
        reassociated: number;
        conflicts: number;
      };
      total.classesCreated += Number(item.created);
      total.classesReused += Number(!item.created);
      total.created += summary.created;
      total.existing += summary.existing;
      total.reassociated += summary.reassociated;
      total.conflicts += summary.conflicts;
      return total;
    },
    { classesCreated: 0, classesReused: 0, created: 0, existing: 0, reassociated: 0, conflicts: 0 }
  );

  return {
    classes: summaries.map(({ id, groupName, summary }) => ({ id, groupName, summary })),
    summary: { ...totals, review: totals.conflicts },
  };
}
