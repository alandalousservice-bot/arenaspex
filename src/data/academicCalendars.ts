export type AcademicCalendarEventType =
  'SCHOOL_VACATION' | 'NATIONAL_HOLIDAY' | 'RELIGIOUS_HOLIDAY' | 'OTHER_OFFICIAL_CLOSURE';

export interface AcademicCalendarEvent {
  name: string;
  startDate: string;
  endDate: string;
  type: AcademicCalendarEventType;
}

export interface AcademicCalendar {
  academicYearId: string;
  schoolStart: string;
  schoolEnd: string | null;
  events: AcademicCalendarEvent[];
  source: string;
  complete: boolean;
}

export const ALGERIAN_ACADEMIC_CALENDARS: Record<string, AcademicCalendar> = {
  '2025-2026': {
    academicYearId: '2025-2026',
    schoolStart: '2025-09-21',
    schoolEnd: '2026-06-30',
    source: 'وزارة التربية الوطنية — رزنامة السنة الدراسية 2025-2026',
    complete: true,
    events: [
      {
        name: 'عيد الثورة المجيدة',
        startDate: '2025-11-01',
        endDate: '2025-11-02',
        type: 'NATIONAL_HOLIDAY',
      },
      {
        name: 'عطلة الشتاء',
        startDate: '2025-12-18',
        endDate: '2026-01-04',
        type: 'SCHOOL_VACATION',
      },
      {
        name: 'رأس السنة الأمازيغية (يناير)',
        startDate: '2026-01-12',
        endDate: '2026-01-12',
        type: 'OTHER_OFFICIAL_CLOSURE',
      },
      {
        name: 'عطلة الربيع',
        startDate: '2026-03-19',
        endDate: '2026-04-05',
        type: 'SCHOOL_VACATION',
      },
      {
        name: 'عيد الفطر المبارك (تقريبي)',
        startDate: '2026-03-30',
        endDate: '2026-04-01',
        type: 'RELIGIOUS_HOLIDAY',
      },
      {
        name: 'عيد العمال',
        startDate: '2026-05-01',
        endDate: '2026-05-01',
        type: 'NATIONAL_HOLIDAY',
      },
      {
        name: 'عيد الطالب',
        startDate: '2026-05-19',
        endDate: '2026-05-19',
        type: 'OTHER_OFFICIAL_CLOSURE',
      },
      {
        name: 'عيد الأضحى المبارك (تقريبي)',
        startDate: '2026-06-05',
        endDate: '2026-06-08',
        type: 'RELIGIOUS_HOLIDAY',
      },
    ],
  },
  '2026-2027': {
    academicYearId: '2026-2027',
    schoolStart: '2026-09-21',
    schoolEnd: null,
    source: 'وزارة التربية الوطنية — البلاغ المحين لرزنامة الدخول المدرسي 2026-2027',
    complete: false,
    events: [],
  },
};

export function getAcademicCalendar(academicYearId: string): AcademicCalendar {
  return (
    ALGERIAN_ACADEMIC_CALENDARS[academicYearId] || {
      academicYearId,
      schoolStart: `${academicYearId.slice(0, 4)}-09-01`,
      schoolEnd: null,
      source: 'لا توجد رزنامة رسمية مكتملة مهيأة لهذه السنة الدراسية',
      complete: false,
      events: [],
    }
  );
}

export function academicYearForDate(value: string): string {
  const [year, month] = value.slice(0, 10).split('-').map(Number);
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function calendarEventForDate(
  value: string,
  academicYearId = academicYearForDate(value)
): AcademicCalendarEvent | null {
  const day = value.slice(0, 10);
  return (
    getAcademicCalendar(academicYearId).events.find(
      (event) => day >= event.startDate && day <= event.endDate
    ) || null
  );
}

export function getCalendarEventsForDisplay(academicYearId: string): AcademicCalendarEvent[] {
  const calendar = getAcademicCalendar(academicYearId);
  const vacations = calendar.events.filter((event) => event.type === 'SCHOOL_VACATION');
  return calendar.events.filter(
    (event) =>
      event.type === 'SCHOOL_VACATION' ||
      !vacations.some(
        (vacation) => event.startDate >= vacation.startDate && event.endDate <= vacation.endDate
      )
  );
}

export function isValidAcademicSchoolDate(
  value: string,
  academicYearId = academicYearForDate(value)
) {
  const calendar = getAcademicCalendar(academicYearId);
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  if (value < calendar.schoolStart || (calendar.schoolEnd && value > calendar.schoolEnd))
    return false;
  if (date.getDay() > 4) return false;
  return !calendarEventForDate(value, academicYearId);
}
