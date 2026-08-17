import React from 'react';
import { ClipboardList, Star, UserRound, MessageSquareText } from 'lucide-react';
import { Student } from '../../../types/spex';
import { EVALUATION_QUESTIONS } from '../../../constants/lessonCommandCenter.constants';

interface CommandCenterNotesPanelProps {
  students: Student[];
  selectedClassId: string;
  currentPhase: 'preparation' | 'situation1' | 'situation2' | 'final';
  studentRatings: Record<string, string[]>;
  onSetStudentRating: (studentId: string, rating: string) => void;
  lessonNotesInput: string;
  onSetLessonNotes: (notes: string) => void;
}

const RATING_LABELS: Record<string, { label: string; cls: string; badge: string }> = {
  excellent: { label: 'ممتاز', cls: 'bg-emerald-50 border-emerald-300 text-emerald-900', badge: 'bg-emerald-500 text-white' },
  good: { label: 'جيد جداً', cls: 'bg-sky-50 border-sky-300 text-sky-900', badge: 'bg-sky-500 text-white' },
  acceptable: { label: 'مقبول', cls: 'bg-amber-50 border-amber-300 text-amber-900', badge: 'bg-amber-500 text-white' },
  needs_work: { label: 'يحتاج دعماً', cls: 'bg-rose-50 border-rose-300 text-rose-900', badge: 'bg-rose-500 text-white' },
};

export const CommandCenterNotesPanel: React.FC<CommandCenterNotesPanelProps> = ({
  students,
  selectedClassId,
  currentPhase,
  studentRatings,
  onSetStudentRating,
  lessonNotesInput,
  onSetLessonNotes,
}) => {
  const classStudents = students.filter((s) => s.classId === selectedClassId) || students;

  return (
    <div className="space-y-4 text-xs animate-in fade-in duration-150">
      {/* Evaluation questions (final phase) */}
      {currentPhase === 'final' && (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 space-y-1.5">
          <span className="font-black text-emerald-900 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" />
            أسئلة التقويم الختامي الذكية — وجّهها للتلاميذ:
          </span>
          {EVALUATION_QUESTIONS.map((q, i) => (
            <p key={i} className="text-slate-700 font-medium">
              {i + 1}. {q}
            </p>
          ))}
        </div>
      )}

      {/* Lesson notes */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1.5">
        <span className="font-black text-slate-800 flex items-center gap-1.5">
          <MessageSquareText className="w-4 h-4 text-blue-600" />
          ملاحظات المعلم أثناء الحصة (تُدرج تلقائياً في تقرير التنفيذ):
        </span>
        <textarea
          value={lessonNotesInput}
          onChange={(e) => onSetLessonNotes(e.target.value)}
          rows={3}
          placeholder="أكتب هنا ملاحظاتك الميدانية: صعوبات، سلوكات بارزة، تعديلات مطبقة..."
          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 resize-y"
        />
      </div>

      {/* Student ratings */}
      <div className="space-y-2">
        <span className="font-black text-slate-800 flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-500" />
          تقييم أداء التلاميذ المميزين ({classStudents.length} تلميذاً):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {classStudents.map((s) => {
            const current = studentRatings[s.id]?.[0] || 'good';
            const meta = RATING_LABELS[current] || RATING_LABELS.good;
            return (
              <div key={s.id} className={`p-2.5 rounded-2xl border ${meta.cls}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black flex items-center gap-1">
                    <UserRound className="w-3.5 h-3.5 opacity-70" />
                    {s.firstName} {s.lastName}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(RATING_LABELS).map(([key, r]) => (
                    <button
                      key={key}
                      onClick={() => onSetStudentRating(s.id, key)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        current === key ? 'bg-white shadow-sm ring-1 ring-slate-300' : 'bg-white/50 hover:bg-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
