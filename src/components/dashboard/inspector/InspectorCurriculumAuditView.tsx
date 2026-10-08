import React from 'react';
import type { User, LessonPlan } from '../../../types/spex';

interface InspectorCurriculumAuditViewProps {
  teachers: User[];
  lessonPlans: LessonPlan[];
  onSendNoteToTeacher: (teacherId: string, teacherName: string, title: string, content: string) => void;
}

// Compatibility for old links/components. No authoritative audit engine exists.
// Keep results and remediation actions unavailable until a deliberate future task.
export const InspectorCurriculumAuditView: React.FC<InspectorCurriculumAuditViewProps> = () => (
  <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
    تدقيق المنهاج غير متاح حاليًا. لا توجد نتائج تدقيق معتمدة لعرضها.
  </section>
);