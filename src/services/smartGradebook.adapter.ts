import {
  createOrReuseTeacherAssessmentSession,
  fetchTeacherAssessmentSession,
  fetchTeacherAssessmentSessions,
  fetchTeacherStudentAttendanceSummary,
  upsertTeacherStudentAssessment,
} from './api';
import { getCurrentAcademicYear } from './academicYear';
import type {
  EvaluationWeights,
  GradeAuditLog,
  GradeRecord,
  SmartGradebookTerm,
} from '../types/smartGradebook';

export const DEFAULT_SMART_GRADEBOOK_WEIGHTS: EvaluationWeights = {
  competencyWeight: 5.0,
  participationWeight: 2.0,
  behaviorWeight: 2.0,
  attendanceWeight: 1.0,
  unexcusedDeduction: 0.25,
};

export const SMART_GRADEBOOK_RATING_MULTIPLIERS = {
  ممتاز: 1.0,
  جيد: 0.85,
  متوسط: 0.65,
  ضعيف: 0.4,
  'تمكن ممتاز': 1.0,
  'تمكن جيد': 0.85,
  'تمكن متوسط': 0.65,
  'تمكن جزئي': 0.45,
} as const;

export function smartGradeRecordKey(classId: string, term: SmartGradebookTerm, studentId: string) {
  return `${classId}:${term}:${studentId}`;
}

export function calculateSmartSuggestedMark(
  rec: Partial<GradeRecord>,
  currentWeights: EvaluationWeights
): number | null {
  if (!rec.behaviorRating || !rec.participationRating || !rec.competencyRating) return null;
  const bMult = SMART_GRADEBOOK_RATING_MULTIPLIERS[rec.behaviorRating];
  const pMult = SMART_GRADEBOOK_RATING_MULTIPLIERS[rec.participationRating];
  const cMult = SMART_GRADEBOOK_RATING_MULTIPLIERS[rec.competencyRating];
  if (bMult === undefined || pMult === undefined || cMult === undefined) return null;

  const behaviorScore = currentWeights.behaviorWeight * bMult;
  const participationScore = currentWeights.participationWeight * pMult;
  const competencyScore = currentWeights.competencyWeight * cMult;
  const unexcused = rec.unexcusedAbsencesCount || 0;
  const attendanceScore = Math.max(
    0,
    currentWeights.attendanceWeight - unexcused * currentWeights.unexcusedDeduction
  );
  return Number(
    Math.min(
      10,
      Math.max(0, behaviorScore + participationScore + competencyScore + attendanceScore)
    ).toFixed(1)
  );
}

type SmartGradebookEnvelope = {
  version: 1;
  record: GradeRecord;
  auditLogs: GradeAuditLog[];
};

const NOTE_PREFIX = 'SMART_GRADEBOOK_V1:';
const SMART_DOMAIN_ID = 'smart-gradebook';

function sessionIdFor(classId: string, term: SmartGradebookTerm) {
  const termId = term === 'الفصل الأول' ? '1' : term === 'الفصل الثاني' ? '2' : '3';
  return `smart_gradebook_${classId}_${termId}`;
}

function competencyToMastery(rating: GradeRecord['competencyRating']) {
  if (rating === 'تمكن ممتاز') return 'أ' as const;
  if (rating === 'تمكن جيد') return 'ب' as const;
  if (rating === 'تمكن متوسط') return 'ج' as const;
  if (rating === 'تمكن جزئي') return 'د' as const;
  return null;
}

function decodeEnvelope(note: string | null): SmartGradebookEnvelope | null {
  if (!note?.startsWith(NOTE_PREFIX)) return null;
  try {
    const value = JSON.parse(note.slice(NOTE_PREFIX.length)) as SmartGradebookEnvelope;
    return value?.version === 1 && value.record ? value : null;
  } catch {
    return null;
  }
}

async function ensureSession(
  classId: string,
  gradeLevelId: string,
  academicYearId: string,
  term: SmartGradebookTerm
) {
  return createOrReuseTeacherAssessmentSession({
    id: sessionIdFor(classId, term),
    classId,
    academicYearId,
    assessmentType: 'تقويمية',
    gradeLevelId,
    domainId: SMART_DOMAIN_ID,
    finalCompetencyId: null,
    title: `دفتر التنقيط الذكي - ${term}`,
    assessedAt: new Date().toISOString(),
  });
}

export async function loadSmartGradebookData(input: {
  classId: string;
  gradeLevelId: string;
  studentIds: string[];
  term: SmartGradebookTerm;
  academicYearId?: string;
}) {
  const academicYearId = input.academicYearId || getCurrentAcademicYear();
  const response = await fetchTeacherAssessmentSessions(input.classId, academicYearId);
  const session = response.sessions.find(
    (item) => item.id === sessionIdFor(input.classId, input.term)
  );
  const records: Record<string, GradeRecord> = {};
  const auditLogs: GradeAuditLog[] = [];

  if (session) {
    const full = await fetchTeacherAssessmentSession(session.id);
    for (const result of full.results) {
      const envelope = decodeEnvelope(result.note);
      if (envelope?.record.classId === input.classId && envelope.record.term === input.term) {
        records[smartGradeRecordKey(input.classId, input.term, result.studentId)] = envelope.record;
        auditLogs.push(...envelope.auditLogs);
      }
    }
  }

  const attendance = await Promise.all(
    input.studentIds.map(async (studentId) => {
      try {
        return {
          studentId,
          summary: await fetchTeacherStudentAttendanceSummary(
            studentId,
            input.classId,
            academicYearId
          ),
        };
      } catch {
        return { studentId, summary: null };
      }
    })
  );
  for (const item of attendance) {
    const summary = item.summary;
    if (!summary || summary.totalRecorded <= 0) continue;
    const key = smartGradeRecordKey(input.classId, input.term, item.studentId);
    const existing =
      records[key] ||
      ({
        id: `gr_${item.studentId}`,
        studentId: item.studentId,
        classId: input.classId,
        term: input.term,
        behaviorRating: null,
        behaviorScore: null,
        participationRating: null,
        participationScore: null,
        attendanceScore: null,
        unexcusedAbsencesCount: 0,
        excusedAbsencesCount: 0,
        competencyRating: null,
        competencyScore: null,
        suggestedMark: null,
        finalMark: null,
        isApprovedByTeacher: false,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      } satisfies GradeRecord);
    const unexcused = summary.counts['غائب'] || 0;
    const excused = (summary.counts['غائب بمبرر'] || 0) + (summary.counts['معفى'] || 0);
    records[key] = {
      ...existing,
      unexcusedAbsencesCount: unexcused,
      excusedAbsencesCount: excused,
      attendanceScore: Math.max(
        0,
        DEFAULT_SMART_GRADEBOOK_WEIGHTS.attendanceWeight -
          unexcused * DEFAULT_SMART_GRADEBOOK_WEIGHTS.unexcusedDeduction
      ),
    };
  }

  return { records, auditLogs, academicYearId };
}

export async function saveSmartGradebookRecord(input: {
  record: GradeRecord;
  auditLogs: GradeAuditLog[];
  gradeLevelId: string;
  academicYearId?: string;
}) {
  const academicYearId = input.academicYearId || getCurrentAcademicYear();
  const sessionResponse = await ensureSession(
    input.record.classId,
    input.gradeLevelId,
    academicYearId,
    input.record.term
  );
  const envelope: SmartGradebookEnvelope = {
    version: 1,
    record: input.record,
    auditLogs: input.auditLogs,
  };
  return upsertTeacherStudentAssessment(sessionResponse.session.id, input.record.studentId, {
    numericMark: input.record.finalMark,
    masteryLevel: competencyToMastery(input.record.competencyRating),
    note: `${NOTE_PREFIX}${JSON.stringify(envelope)}`,
    assessedAt: new Date().toISOString(),
  });
}
