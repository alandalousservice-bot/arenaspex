import type { PrismaClient, TeacherAcademicCalendarPreference } from '@prisma/client';

export type TeacherAcademicCalendarPreferenceStore = Pick<
  PrismaClient,
  'teacherAcademicCalendarPreference'
>;

export async function getSchedulePeDuringTermTests(
  teacherId: string,
  academicYearId: string,
  store: TeacherAcademicCalendarPreferenceStore
): Promise<boolean> {
  const preference = await store.teacherAcademicCalendarPreference.findUnique({
    where: { teacherId_academicYearId: { teacherId, academicYearId } },
    select: { schedulePeDuringTermTests: true },
  });
  return preference?.schedulePeDuringTermTests ?? true;
}

export async function setSchedulePeDuringTermTests(
  teacherId: string,
  academicYearId: string,
  schedulePeDuringTermTests: boolean,
  store: TeacherAcademicCalendarPreferenceStore
): Promise<TeacherAcademicCalendarPreference> {
  return store.teacherAcademicCalendarPreference.upsert({
    where: { teacherId_academicYearId: { teacherId, academicYearId } },
    create: { teacherId, academicYearId, schedulePeDuringTermTests },
    update: { schedulePeDuringTermTests },
  });
}
