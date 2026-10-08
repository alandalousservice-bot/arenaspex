export const VISIT_TYPE_LABELS = { GUIDANCE: 'زيارة توجيهية', TENURE: 'زيارة التثبيت', MONITORING: 'زيارة المراقبة' } as const;
export const VISIT_STATUS_LABELS = { SCHEDULED: 'مبرمجة', COMPLETED: 'منجزة', POSTPONED: 'مؤجلة', CANCELLED: 'ملغاة' } as const;
export type VisitType = keyof typeof VISIT_TYPE_LABELS;
export type VisitStatus = keyof typeof VISIT_STATUS_LABELS;
export type VisitAction = 'COMPLETE' | 'POSTPONE' | 'RESCHEDULE' | 'CANCEL' | 'COMMUNICATE';
export interface PedagogicalVisit {
  id: string; inspectorId: string; teacherId: string; institutionId: string | null;
  visitType: VisitType; status: VisitStatus; scheduledAt: string; completedAt: string | null;
  academicYearId: string; classId: string | null; weeklySlotId: string | null;
  revision: number; createdAt: string; updatedAt: string | null;
  postponedAt: string | null; postponedById: string | null; postponementReason: string | null;
  cancelledAt: string | null; cancelledById: string | null; cancellationReason: string | null;
  teacherNotifiedAt: string | null; teacherNotifiedById: string | null;
  history: { action: string; actorId: string; at: string; from?: VisitStatus; to: VisitStatus; scheduledAt: string; reason?: string }[];
}
export type TeacherVisitAppointment = Pick<PedagogicalVisit, 'id' | 'visitType' | 'status' | 'scheduledAt' | 'academicYearId' | 'completedAt' | 'teacherNotifiedAt'>;
export function visitActions(visit: Pick<PedagogicalVisit, 'status' | 'visitType' | 'teacherNotifiedAt'>): VisitAction[] {
  if (visit.status === 'SCHEDULED') return ['COMPLETE', 'POSTPONE', 'RESCHEDULE', 'CANCEL', ...(visit.visitType === 'TENURE' && !visit.teacherNotifiedAt ? ['COMMUNICATE' as const] : [])];
  if (visit.status === 'POSTPONED') return ['RESCHEDULE', 'CANCEL'];
  return [];
}
