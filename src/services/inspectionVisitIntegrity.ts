import type { InspectionVisit } from '../types/spex';

export function isExplicitInspectionMark(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 20;
}
export function inspectionMarkLabel(value: unknown): string {
  return isExplicitInspectionMark(value) ? `${value} / 20` : 'غير مدخلة';
}
// Existing input ranges remain unchanged. Missing components are unknown, not
// zero. A total exists only when all three components were explicitly entered.
export function sumExplicitVisitParts(parts: readonly [string, string, string]): number | null {
  const limits = [5, 10, 5];
  if (parts.some((part) => !part.trim())) return null;
  const values = parts.map(Number);
  if (values.some((value, index) => !Number.isFinite(value) || value < 0 || value > limits[index])) return null;
  return values.reduce((sum, value) => sum + value, 0);
}
export function buildRecordedInspectionVisit(
  inspectorId: string,
  input: Partial<InspectionVisit>,
  now = new Date()
): InspectionVisit {
  return {
    id: `visit_${now.getTime()}`,
    inspectorId,
    teacherId: input.teacherId || '',
    institutionId: input.institutionId || '',
    visitDate: input.visitDate || now.toISOString().slice(0, 10),
    visitType: input.visitType || 'متابعة دورية',
    lessonObservedTitle: input.lessonObservedTitle || 'حصة بدنية',
    pedagogicalGrade: isExplicitInspectionMark(input.pedagogicalGrade) ? input.pedagogicalGrade : null,
    positivePoints: input.positivePoints || [],
    areasForImprovement: input.areasForImprovement || [],
    recommendations: input.recommendations || [],
    // Recording is not finalization. No finalization action/model exists yet.
    officialReportGenerated: false,
  };
}
