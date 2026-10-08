export const CARD_STATUS_LABELS = { DRAFT: 'مسودة', SUBMITTED: 'مرسلة للمراجعة', NEEDS_CORRECTION: 'تحتاج تصحيحًا', VERIFIED: 'محققة' } as const;
export type CardStatus = keyof typeof CARD_STATUS_LABELS;
export const CARD_SECTIONS = [
  { title: 'المعلومات الشخصية', fields: [['maidenSurname', 'اللقب الفتوة'], ['birthPlace', 'مكان الازدياد'], ['birthWilaya', 'ولاية الازدياد'], ['maritalStatus', 'الحالة العائلية'], ['address', 'العنوان الشخصي']] },
  { title: 'المعلومات المهنية', fields: [['cadre', 'الإطار'], ['supplementaryWorkplace', 'مكان العمل (تكملة نصاب)'], ['institutionEmail', 'البريد الإلكتروني للمؤسسة']] },
  { title: 'التعيين والوضعية الإدارية', fields: [['firstAppointmentDate', 'تاريخ أول تعيين في التعليم', 'date'], ['firstAppointmentNumber', 'رقم قرار أول تعيين في التعليم'], ['institutionAppointmentDate', 'تاريخ التعيين بالمؤسسة', 'date'], ['appointmentNumber', 'رقم التعيين'], ['firstInstallationDate', 'تاريخ أول تنصيب', 'date'], ['financialVisaNumber', 'رقم تأشيرة المراقب المالي'], ['probationDate', 'تاريخ التربص', 'date'], ['tenureDate', 'تاريخ الترسيم', 'date'], ['category', 'الصنف'], ['section', 'القسم'], ['grade', 'الدرجة'], ['effectiveDate', 'تاريخ السريان', 'date']] },
  { title: 'معلومات التفتيش', fields: [['lastInspectionDate', 'تاريخ آخر تفتيش', 'date'], ['inspectionMark', 'النقطة /20', 'number']] },
  { title: 'معلومات إضافية', fields: [['otherInformation', 'معلومات أخرى'], ['signaturePlace', 'مكان تحرير البطاقة'], ['signatureDate', 'تاريخ تحرير البطاقة', 'date']] },
] as const;
export const ADMINISTRATIVE_STATUSES = ['مرسم(ة)', 'متربص(ة)', 'متعاقد(ة)', 'مستخلف(ة)'] as const;
export interface CardExtra {
  [key: string]: string | Qualification[];
  qualifications: Qualification[];
}
export interface Qualification { certificate: string; issuer: string; date: string }
export interface CardIdentity {
  id: string; firstName: string; lastName: string; birthDate: string; phone: string; email: string;
  avatar: string; institution: string; directorate: string; district: string; academicYear: string;
}
export interface CardSnapshot { identity: CardIdentity; extra: CardExtra }
export interface CardSubmission {
  id: string; revision: number; snapshot: CardSnapshot; status: CardStatus; submittedAt: string;
  reviewedAt: string | null; reviewedById: string | null; correctionReason: string | null;
}
export interface CardReadModel {
  current: CardSnapshot; revision: number; status: CardStatus; missingRequired: string[];
  submission: CardSubmission | null; history: CardSubmission[];
}
