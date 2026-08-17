import { useState, useEffect } from 'react';
import { Student, LessonSession } from '../types/spex';
import { divideStudentsIntoBalancedTeams } from '../services/lessonCommandCenter.service';

export function useLessonCommandCenter(
  currentSession: LessonSession | null,
  students: Student[],
  selectedClassId: string
) {
  // Field Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);
  const [stopwatchLaps, setStopwatchLaps] = useState<number[]>([]);

  // Generated Teams state
  const [teamCount, setTeamCount] = useState<number>(2);
  const [generatedTeams, setGeneratedTeams] = useState<Record<string, Student[]>>({});

  // Attendance Records & Ratings
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, 'present' | 'absent' | 'exempt'>
  >({});
  const [studentRatings, setStudentRatings] = useState<Record<string, string[]>>({});
  const [lessonNotesInput, setLessonNotesInput] = useState<string>('');

  // Adaptation / Contingency
  const [contingencyMode, setContingencyMode] = useState<
    'normal' | 'hot_weather' | 'equipment_shortage' | 'high_fatigue'
  >('normal');

  // Stopwatch Interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime((prev) => prev + 10);
      }, 10);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStopwatchRunning]);

  const handleToggleStopwatch = () => setIsStopwatchRunning((prev) => !prev);
  const handleResetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
    setStopwatchLaps([]);
  };
  const handleLapStopwatch = () => {
    setStopwatchLaps((prev) => [stopwatchTime, ...prev]);
  };

  const handleGenerateTeams = (count: number) => {
    setTeamCount(count);
    const classStudents = students.filter((s) => s.classId === selectedClassId);
    const teams = divideStudentsIntoBalancedTeams(
      classStudents.length > 0 ? classStudents : students,
      count
    );
    setGeneratedTeams(teams);
  };

  const handleToggleAttendance = (studentId: string) => {
    setAttendanceRecords((prev) => {
      const current = prev[studentId] || 'present';
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'exempt' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  return {
    stopwatchTime,
    isStopwatchRunning,
    stopwatchLaps,
    handleToggleStopwatch,
    handleResetStopwatch,
    handleLapStopwatch,
    teamCount,
    generatedTeams,
    handleGenerateTeams,
    attendanceRecords,
    handleToggleAttendance,
    studentRatings,
    setStudentRatings,
    lessonNotesInput,
    setLessonNotesInput,
    contingencyMode,
    setContingencyMode,
  };
}
