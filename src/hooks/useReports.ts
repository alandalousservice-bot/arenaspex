import { useMemo } from 'react';
import { InspectionVisit, InspectorNote } from '../types/spex';

export interface UseReportsResult {
  teacherVisits: (teacherId: string) => InspectionVisit[];
  teacherNotes: (teacherId: string) => InspectorNote[];
}

export function useReports(visits: InspectionVisit[] = [], notes: InspectorNote[] = []): UseReportsResult {
  return useMemo(() => {
    const teacherVisits = (teacherId: string) => visits.filter((v) => v.teacherId === teacherId);
    const teacherNotes = (teacherId: string) => notes.filter((n) => n.teacherId === teacherId);

    return { teacherVisits, teacherNotes };
  }, [visits, notes]);
}
