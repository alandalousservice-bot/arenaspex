export const AUDIT_EVENT_LABELS = {
  INSPECTOR_ACCOUNT_ACTIVATED: 'تفعيل حساب المفتش',
  ACCOUNT_STATUS_CHANGED: 'تغيير حالة الحساب',
  ACCOUNT_DISABLED: 'تعطيل الحساب',
  ACCOUNT_REACTIVATED: 'إعادة تفعيل الحساب',
  ACCOUNT_ARCHIVED: 'حذف الحساب وأرشفته',
  ACCOUNT_DELETED: 'حذف حساب',
  INSPECTOR_DISTRICT_ASSIGNED: 'إسناد مقاطعة المفتش',
  TEACHER_TRANSFER_REQUESTED: 'طلب نقل الأستاذ',
  TEACHER_TRANSFER_ACCEPTED: 'قبول نقل الأستاذ',
  TEACHER_TRANSFER_REJECTED: 'رفض نقل الأستاذ',
  TEACHER_ASSIGNMENT_REQUESTED: 'إنشاء أو تغيير طلب الإسناد',
  TEACHER_ASSIGNMENT_ACCEPTED: 'قبول إسناد الأستاذ',
  TEACHER_ASSIGNMENT_REJECTED: 'رفض إسناد الأستاذ',
  TEACHER_ASSIGNMENT_REMOVED: 'إزالة إسناد الأستاذ',
  INFORMATION_CARD_SUBMITTED: 'إرسال بطاقة المعلومات',
  INFORMATION_CARD_RESUBMITTED: 'إعادة إرسال بطاقة المعلومات',
  INFORMATION_CARD_CORRECTION_REQUESTED: 'طلب تصحيح بطاقة المعلومات',
  INFORMATION_CARD_VERIFIED: 'تحقيق بطاقة المعلومات',
  PEDAGOGICAL_VISIT_SCHEDULED: 'برمجة زيارة بيداغوجية',
  PEDAGOGICAL_VISIT_COMPLETED: 'إتمام الزيارة',
  PEDAGOGICAL_VISIT_POSTPONED: 'تأجيل الزيارة',
  PEDAGOGICAL_VISIT_CANCELLED: 'إلغاء الزيارة',
  PEDAGOGICAL_VISIT_RESCHEDULED: 'إعادة برمجة الزيارة',
  TENURE_VISIT_COMMUNICATED: 'إبلاغ الأستاذ بزيارة التثبيت',
  VISIT_REPORT_FINALIZED: 'اعتماد تقرير الزيارة',
  VISIT_REPORT_SHARED: 'إرسال التقرير إلى الأستاذ',
  VISIT_REPORT_ACKNOWLEDGED: 'تأكيد اطلاع الأستاذ على التقرير',
} as const;
export type AuditEventType = keyof typeof AUDIT_EVENT_LABELS;
export const AUDIT_STATE_LABELS: Record<string, string> = {
  role: 'الدور',
  status: 'الحالة',
  inspectorId: 'المفتش',
  districtId: 'المقاطعة',
  directorateId: 'المديرية',
  academicYearId: 'السنة الدراسية',
  revision: 'المراجعة',
  visitType: 'نوع الزيارة',
  scheduledAt: 'الموعد',
  reportType: 'نوع التقرير',
  submittedInspectorId: 'المفتش المرسل إليه',
  sharedWithTeacherAt: 'وقت الإرسال',
  teacherAcknowledgedAt: 'وقت الاطلاع',
  isApprovedByAdmin: 'التفعيل الإداري',
  accessAcademicYearId: 'سنة التفعيل',
  inspectorName: 'اسم المفتش',
  districtName: 'اسم المقاطعة',
  directorateName: 'اسم المديرية',
};
export interface AuditEventView {
  id: string;
  eventType: AuditEventType;
  actorUserId: string;
  actorRole: string;
  actorName: string;
  entityType: string;
  entityId: string;
  affectedUserId: string | null;
  affectedName: string | null;
  createdAt: string;
  before: Record<string, string | number | boolean | null> | null;
  after: Record<string, string | number | boolean | null> | null;
  reason: string | null;
}
