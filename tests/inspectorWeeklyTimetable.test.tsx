import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WeeklyTimetableView } from '../src/components/schedule/WeeklyTimetableView';
import type { WeeklyScheduleSlot } from '../src/types/spex';
const slot = {
  id: 'private-slot-id',
  teacherId: 'T',
  academicYearId: '2026-2027',
  day: 'الأحد',
  startTime: '08:00',
  endTime: '09:00',
  timeSlot: '08:00 - 09:00',
  classId: 'private-class-id',
  className: 'فوج محفوظ',
  fieldId: '',
  fieldName: '',
} as WeeklyScheduleSlot;
describe('Inspector weekly timetable reused read-only renderer', () => {
  it('renders only selected-year saved schedule, RTL, times and class without editing or approval controls', () => {
    const html = renderToStaticMarkup(
      <WeeklyTimetableView
        scheduleSlots={[
          slot,
          { ...slot, id: 'old', academicYearId: '2024-2025', className: 'فوج سابق' },
        ]}
        teacherClasses={[]}
        academicYearId="2026-2027"
        readOnly
      />
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('فوج محفوظ');
    expect(html).toContain('08:00');
    expect(html).not.toContain('فوج سابق');
    for (const forbidden of [
      'إضافة حصة',
      'تعديل الحصة',
      'حذف الحصة',
      'إرسال للمفتش',
      'اعتماد',
      'طلب تصحيح',
      'private-slot-id',
      'private-class-id',
    ])
      expect(html).not.toContain(forbidden);
    expect(html).toContain('طباعة التوقيت');
  });
  it('has a truthful empty state and does not create a fabricated schedule', () => {
    const html = renderToStaticMarkup(
      <WeeklyTimetableView
        scheduleSlots={[]}
        teacherClasses={[]}
        academicYearId="2026-2027"
        readOnly
      />
    );
    expect(html).toContain('لم يسجل الأستاذ توزيعه الأسبوعي لهذه السنة الدراسية بعد.');
    expect(html).not.toContain('weekly-slot-card');
  });
});
