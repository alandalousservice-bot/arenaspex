import React from 'react';
import {
  BookOpen,
  UserCheck,
  Users,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Shuffle,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import { Student, LessonPlan } from '../../../types/spex';
import { CommandCenterCoachPanel } from './CommandCenterCoachPanel';
import { CommandCenterNotesPanel } from './CommandCenterNotesPanel';

interface CommandCenterFieldToolsProps {
  activeTabTool: 'guide' | 'attendance' | 'teams' | 'stopwatch' | 'coach' | 'notes';
  onSelectTabTool: (tab: 'guide' | 'attendance' | 'teams' | 'stopwatch' | 'coach' | 'notes') => void;
  selectedPlan: LessonPlan | null;
  students: Student[];
  selectedClassId: string;
  attendanceRecords: Record<string, 'present' | 'absent' | 'exempt'>;
  onToggleAttendance: (studentId: string) => void;
  teamCount: number;
  generatedTeams: Record<string, Student[]>;
  onGenerateTeams: (count: number) => void;
  stopwatchTime: number;
  isStopwatchRunning: boolean;
  stopwatchLaps: number[];
  onToggleStopwatch: () => void;
  onResetStopwatch: () => void;
  onLapStopwatch: () => void;
  currentPhase?: 'preparation' | 'situation1' | 'situation2' | 'final';
  contingencyMode?: string;
  sessionTitle?: string;
  educationalObjective?: string;
  studentRatings: Record<string, string[]>;
  onSetStudentRating: (studentId: string, rating: string) => void;
  lessonNotesInput: string;
  onSetLessonNotes: (notes: string) => void;
}

export const CommandCenterFieldTools: React.FC<CommandCenterFieldToolsProps> = ({
  activeTabTool,
  onSelectTabTool,
  selectedPlan,
  students,
  selectedClassId,
  attendanceRecords,
  onToggleAttendance,
  teamCount,
  generatedTeams,
  onGenerateTeams,
  stopwatchTime,
  isStopwatchRunning,
  stopwatchLaps,
  onToggleStopwatch,
  onResetStopwatch,
  onLapStopwatch,
  currentPhase,
  contingencyMode,
  sessionTitle,
  educationalObjective,
  studentRatings,
  onSetStudentRating,
  lessonNotesInput,
  onSetLessonNotes,
}) => {
  const classStudents = students.filter((s) => s.classId === selectedClassId) || students;

  const formatMs = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 space-y-4">
      {/* Tools Tabs Bar */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto">
        <button
          onClick={() => onSelectTabTool('guide')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTabTool === 'guide' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:bg-white/50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>الدليل البيداغوجي للحصة</span>
        </button>

        <button
          onClick={() => onSelectTabTool('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTabTool === 'attendance' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:bg-white/50'
          }`}
        >
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span>النداء والتنسيق الميداني</span>
        </button>

        <button
          onClick={() => onSelectTabTool('teams')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTabTool === 'teams' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-600 hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4 text-purple-600" />
          <span>تقسيم الفرق المتوازنة</span>
        </button>

        <button
          onClick={() => onSelectTabTool('stopwatch')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTabTool === 'stopwatch' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-600 hover:bg-white/50'
          }`}
        >
          <Timer className="w-4 h-4 text-amber-600" />
          <span>المؤقت الميداني الموازي</span>
        </button>

        <button
          onClick={() => onSelectTabTool('coach')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTabTool === 'coach' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-600 hover:bg-white/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>المستشار البيداغوجي الذكي</span>
        </button>

        <button
          onClick={() => onSelectTabTool('notes')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTabTool === 'notes' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600 hover:bg-white/50'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-sky-600" />
          <span>التقييم والملاحظات</span>
        </button>
      </div>

      {/* Tool 1: Pedagogical Guide */}
      {activeTabTool === 'guide' && (
        <div className="space-y-3 text-xs animate-in fade-in duration-150">
          {!selectedPlan ? (
            <p className="text-slate-400 italic p-4 text-center bg-slate-50 rounded-2xl">
              لم يتم اختيار مذكرة بيداغوجية حالياً.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-1.5">
                <span className="font-black text-amber-900 block text-xs">1. المرحلة التمهيدية / الإحماء:</span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedPlan.warmupPhase?.generalWarmup ||
                    selectedPlan.warmupPhase?.pedagogicalWarmupGame?.title ||
                    'الإحماء العام والخاص وتجهيز التلاميذ'}
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200/80 space-y-1.5">
                <span className="font-black text-blue-900 block text-xs">2. المرحلة الرئيسية / التعلم والتطبيق:</span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedPlan.mainPhase?.learningSituation1?.description ||
                    selectedPlan.mainPhase?.problemSituation ||
                    'الوضعيات التعلمية والتطبيق التنافسي'}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 space-y-1.5">
                <span className="font-black text-emerald-900 block text-xs">3. المرحلة الختامية / التهدئة والتقويم:</span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedPlan.coolDownPhase?.assessmentAndDialogue ||
                    selectedPlan.coolDownPhase?.activities ||
                    'العودة للهدوء والتقويم التفاعلي'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool 2: Attendance Records */}
      {activeTabTool === 'attendance' && (
        <div className="space-y-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-700">قائمة تلاميذ القسم ({classStudents.length} تلميذاً):</span>
            <span className="text-[10px] text-slate-500">انقر لتغيير الحالة (حاضر / غائب / معفى)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto">
            {classStudents.map((s) => {
              const status = attendanceRecords[s.id] || 'present';
              return (
                <div
                  key={s.id}
                  onClick={() => onToggleAttendance(s.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    status === 'present'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : status === 'absent'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <span className="font-bold">
                    {s.firstName} {s.lastName}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      status === 'present'
                        ? 'bg-emerald-200 text-emerald-900'
                        : status === 'absent'
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {status === 'present' ? 'حاضر' : status === 'absent' ? 'غائب' : 'معفى'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tool 3: Teams Division */}
      {activeTabTool === 'teams' && (
        <div className="space-y-4 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="font-extrabold text-slate-800">عدد الفرق المطلوبة:</span>
            <div className="flex gap-2">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => onGenerateTeams(count)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    teamCount === count
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {count} فرق
                </button>
              ))}
            </div>
            <button
              onClick={() => onGenerateTeams(teamCount)}
              className="mr-auto px-3 py-1.5 bg-purple-100 text-purple-900 hover:bg-purple-200 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>إعادة الخلط العشوائي</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(generatedTeams).map(([tName, members]) => {
              const teamMembers = (members || []) as Student[];
              return (
                <div key={tName} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-extrabold text-slate-900">{tName}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                      {teamMembers.length} تلاميذ
                    </span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-700 max-h-44 overflow-y-auto">
                    {teamMembers.map((m) => (
                      <li key={m.id} className="font-medium">
                        • {m.firstName} {m.lastName}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tool 4: Field Stopwatch */}
      {activeTabTool === 'stopwatch' && (
        <div className="space-y-4 text-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white p-6 rounded-3xl text-center space-y-3">
            <span className="text-[10px] font-bold text-slate-400 block">المؤقت الميداني لحساب الأوقات القياسية:</span>
            <div className="text-4xl sm:text-5xl font-black text-amber-400 font-mono tracking-wider dir-ltr">
              {formatMs(stopwatchTime)}
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={onToggleStopwatch}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 ${
                  isStopwatchRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isStopwatchRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isStopwatchRunning ? 'إيقاف' : 'تشغيل'}</span>
              </button>

              <button
                onClick={onLapStopwatch}
                disabled={!isStopwatchRunning}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1"
              >
                <Flag className="w-4 h-4" />
                <span>دورة (Lap)</span>
              </button>

              <button
                onClick={onResetStopwatch}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط</span>
              </button>
            </div>
          </div>

          {stopwatchLaps.length > 0 && (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              <span className="font-bold text-slate-700 block text-[10px]">الأزمنة المسجلة:</span>
              {stopwatchLaps.map((lap, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-xl flex justify-between font-mono font-bold text-slate-800">
                  <span>الدورة #{stopwatchLaps.length - idx}</span>
                  <span>{formatMs(lap)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tool 5: AI Coach */}
      {activeTabTool === 'coach' && (
        <CommandCenterCoachPanel
          currentPhase={currentPhase || 'preparation'}
          contingencyMode={contingencyMode || 'normal'}
          sessionTitle={sessionTitle}
          educationalObjective={educationalObjective}
          planContext={
            selectedPlan
              ? `الحصة: ${selectedPlan.sessionTitle} (${selectedPlan.levelName || ''}). الهدف: ${selectedPlan.generalObjective || ''}.`
              : undefined
          }
        />
      )}

      {/* Tool 6: Notes & Ratings */}
      {activeTabTool === 'notes' && (
        <CommandCenterNotesPanel
          students={students}
          selectedClassId={selectedClassId}
          currentPhase={currentPhase || 'preparation'}
          studentRatings={studentRatings}
          onSetStudentRating={onSetStudentRating}
          lessonNotesInput={lessonNotesInput}
          onSetLessonNotes={onSetLessonNotes}
        />
      )}
    </div>
  );
};
