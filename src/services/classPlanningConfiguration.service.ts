import type { ClassPlanningConfiguration, PrismaClient } from '@prisma/client';
import type { Grade4WeeklyScheduleMode } from '../types/spex';
import { legacyGrade4WeeklyScheduleMode } from './lessonTiming.service';

export type ClassPlanningStore = Pick<PrismaClient, 'classPlanningConfiguration'>;

export interface ClassPlanningConfigurationInput {
  classId: string;
  academicYearId: string;
  grade4WeeklyScheduleMode?: Grade4WeeklyScheduleMode | null;
}

export async function getClassPlanningConfiguration(
  classId: string,
  academicYearId: string,
  store: ClassPlanningStore
): Promise<ClassPlanningConfiguration | null> {
  return store.classPlanningConfiguration.findUnique({
    where: { classId_academicYearId: { classId, academicYearId } },
  });
}

export async function setGrade4WeeklyScheduleMode(
  input: Required<Pick<ClassPlanningConfigurationInput, 'classId' | 'academicYearId'>> &
    Pick<ClassPlanningConfigurationInput, 'grade4WeeklyScheduleMode'>,
  store: ClassPlanningStore
): Promise<ClassPlanningConfiguration> {
  return store.classPlanningConfiguration.upsert({
    where: {
      classId_academicYearId: { classId: input.classId, academicYearId: input.academicYearId },
    },
    create: {
      classId: input.classId,
      academicYearId: input.academicYearId,
      grade4WeeklyScheduleMode: input.grade4WeeklyScheduleMode,
    },
    update: { grade4WeeklyScheduleMode: input.grade4WeeklyScheduleMode },
  });
}

export function resolveGrade4WeeklyScheduleMode(
  mode: Grade4WeeklyScheduleMode | null | undefined
): Grade4WeeklyScheduleMode {
  return mode === 'TWO_45' ? 'TWO_45' : legacyGrade4WeeklyScheduleMode;
}
