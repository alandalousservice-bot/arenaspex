export type SmartGradebookTerm = 'الفصل الأول' | 'الفصل الثاني' | 'الفصل الثالث';

export type SmartBehaviorRating = 'ممتاز' | 'جيد' | 'متوسط' | 'ضعيف';
export type SmartCompetencyRating = 'تمكن ممتاز' | 'تمكن جيد' | 'تمكن متوسط' | 'تمكن جزئي';

export interface EvaluationWeights {
  competencyWeight: number;
  participationWeight: number;
  behaviorWeight: number;
  attendanceWeight: number;
  unexcusedDeduction: number;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  classId: string;
  term: SmartGradebookTerm;
  behaviorRating: SmartBehaviorRating | null;
  behaviorScore: number | null;
  behaviorNotes?: string;
  participationRating: SmartBehaviorRating | null;
  participationScore: number | null;
  attendanceScore: number | null;
  unexcusedAbsencesCount?: number;
  excusedAbsencesCount?: number;
  competencyRating: SmartCompetencyRating | null;
  competencyScore: number | null;
  suggestedMark: number | null;
  finalMark: number | null;
  isApprovedByTeacher: boolean;
  adjustmentReason?: string;
  updatedAt: string;
}

export interface GradeAuditLog {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  term: SmartGradebookTerm;
  suggestedMark: number | null;
  previousFinalMark?: number | null;
  newFinalMark: number;
  changedByTeacherName: string;
  changeDate: string;
  reason?: string;
}
