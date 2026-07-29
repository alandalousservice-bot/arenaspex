/**
 * SPEX - Teacher Dashboard Component
 * لوحة قيادة الأستاذ: مؤشرات الأداء، جدول اليوم، والإجراءات السريعة
 */

import React from 'react';
import {
  Sparkles,
  BookMarked,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Target,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  Plus,
  MessageSquare,
  Timer
} from 'lucide-react';
import { User, DailyNotebookEntry, LessonPlan, InspectorNote } from '../../types/spex';
import { NavTab } from '../layout/Sidebar';

interface TeacherDashboardProps {
  user: User;
  dailyNotebook: DailyNotebookEntry[];
  lessonPlans: LessonPlan[];
  inspectorNotes: InspectorNote[];
  onNavigateTab: (tab: NavTab) => void;
  onOpenAIGenerator: () => void;
  onUpdateNotebookStatus?: (entryId: string, status: 'منجزة' | 'مؤجلة' | 'غير منجزة') => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  dailyNotebook,
  lessonPlans,
  inspectorNotes,
  onNavigateTab,
  onOpenAIGenerator,
  onUpdateNotebookStatus
}) => {
  const completedCount = dailyNotebook.filter((n) => n.status === 'منجزة').length;
  const delayedCount = dailyNotebook.filter((n) => n.status === 'مؤجلة').length;
  const totalSessions = dailyNotebook.length || 1;
  const executionPercentage = Math.round((completedCount / totalSessions) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-blue-600/15">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100 border border-white/20">
              <Calendar className="w-3.5 h-3.5" />
              <span>السنة الدراسية 2025/2026 - الفصل الأول</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              أهلاً بك، أستاذ {user.firstName} {user.lastName} 👋
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
              مرحباً بك في بيئة عمل SPEX الذكية للتربية البدنية والرياضية. تم ربط حسابك بـ{' '}
              <span className="font-bold underline decoration-blue-300">{user.schoolName || 'المدرسة الابتدائية'}</span>{' '}
              ({user.municipality || 'عين أزال'}) • وتحت إشراف {user.districtId === 'dist_setif_7' ? 'المقاطعة 07 - عين أزال' : user.districtId || 'المقاطعة التفتيشية'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('lesson_command_center')}
              className="flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Timer className="w-4 h-4 text-slate-950 animate-pulse" />
              <span>مركز قيادة الحصة ⏱️</span>
            </button>
            <button
              onClick={onOpenAIGenerator}
              className="flex items-center gap-2 px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-2xl text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>توليد المذكرة البيداغوجية</span>
            </button>
            <button
              onClick={() => onNavigateTab('daily_notebook')}
              className="flex items-center gap-2 px-4 py-3 bg-blue-800/60 hover:bg-blue-800 text-white font-bold rounded-2xl text-xs border border-white/20 transition-all cursor-pointer"
            >
              <BookMarked className="w-4 h-4" />
              <span>الكراس اليومي</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Annual Plan Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">نسبة تنفيذ المخطط السنوي</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{executionPercentage}%</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> منظم جداً
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${executionPercentage}%` }} />
          </div>
        </div>

        {/* Metric 2: Completed Sessions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الحصص المنجزة الكراس اليومي</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{completedCount}</span>
            <span className="text-xs text-slate-500 font-medium">من أصل {totalSessions} حصة</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            الحصص المؤجلة: <span className="font-bold text-amber-600">{delayedCount} حصة</span>
          </p>
        </div>

        {/* Metric 3: Lesson Plans Created */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المذكرات الجاهزة والمنشأة</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{lessonPlans.length}</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">
              من البنك التربوي
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">جاهزة للطباعة والتصدير PDF</p>
        </div>

        {/* Metric 4: Inspector Notes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ملاحظات وتوجيهات المفتش</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{inspectorNotes.length}</span>
            <span className="text-xs font-semibold text-emerald-600">توجيه بيداغوجي</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">آخر زيارة تفتيشية: 15 يوليو 2026</p>
        </div>
      </div>

      {/* Main Grid: Today's Schedule + Inspector Note Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Daily Notebook Entries / Timetable */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>جدول حصص اليوم في الكراس اليومي</span>
              </h3>
              <p className="text-xs text-slate-500">حالة التنفيذ والمذكرات المرتبطة بحصصك الدراسية</p>
            </div>
            <button
              onClick={() => onNavigateTab('daily_notebook')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>عرض الكراس الكامل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {dailyNotebook.map((entry) => (
              <div key={entry.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-3 rounded-2xl transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      {entry.timeSlot}
                    </span>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {entry.className}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {entry.sessionId === 'sess_run_1'
                      ? 'الحصة 01: اكتشاف السرعة الفردية والاستجابة للإشارة الصوتية'
                      : entry.sessionId === 'sess_run_2'
                      ? 'الحصة 02: ضبط الانطلاقة المنخفضة والاندفاع الأولي'
                      : entry.sessionId === 'sess_run_3'
                      ? 'الحصة 03: إدماج الجري السريع في سباق التناوب التنافسي'
                      : 'الحصة 01: التمرير الصدري والاستقبال أثناء التنقل'}
                  </h4>
                  {entry.note && (
                    <p className="text-[11px] text-slate-500 italic">ملاحظة: {entry.note}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => onUpdateNotebookStatus && onUpdateNotebookStatus(entry.id, 'منجزة')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        entry.status === 'منجزة'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                      title="تأشير كـ منجزة"
                    >
                      ✓ منجزة
                    </button>
                    <button
                      onClick={() => onUpdateNotebookStatus && onUpdateNotebookStatus(entry.id, 'غير منجزة')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        entry.status === 'غير منجزة'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-rose-700'
                      }`}
                      title="تأشير كـ غير منجزة"
                    >
                      ✕ غير منجزة
                    </button>
                    <button
                      onClick={() => onUpdateNotebookStatus && onUpdateNotebookStatus(entry.id, 'مؤجلة')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        entry.status === 'مؤجلة'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-amber-700'
                      }`}
                      title="تأشير كـ مؤجلة"
                    >
                      ⏰ مؤجلة
                    </button>
                  </div>

                  <button
                    onClick={() => onNavigateTab('lesson_plans')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>المذكرة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Quick Shortcuts & Inspector Feedback */}
        <div className="space-y-6">
          {/* Inspector Feedback & Invitations Card */}
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 shadow-md border border-emerald-800/40 relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
              <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>إشعارات المفتش البيداغوجي: مصطفى رواق</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                {inspectorNotes.length} رسائل
              </span>
            </div>

            {inspectorNotes.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {inspectorNotes.map((note) => {
                  const isSeminar = note.moduleRef === 'seminar_invitation';
                  const isVisitAlert = note.moduleRef === 'visit_alert';
                  return (
                    <div
                      key={note.id}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                            isSeminar
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isVisitAlert
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isSeminar
                            ? '🎓 دعوة لندوة تربوية / يوم تكويني'
                            : isVisitAlert
                            ? '🔔 تنبيه بزيارة تفقدية'
                            : '📝 توجيه وملاحظة بيداغوجية'}
                        </span>
                        <span className="text-[10px] text-emerald-200/70">{note.priority}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-snug">{note.title}</h4>
                      <p className="text-xs text-emerald-100/90 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                        "{note.content}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-emerald-300/80 pt-0.5">
                        <span>المفتش: مصطفى رواق</span>
                        <span className="dir-ltr">{note.createdAt?.split('T')[0]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-300 italic">لا توجد رسائل أو دعوات تفتيشية مسجلة حالياً.</p>
            )}
          </div>

          {/* Quick Access Tiles */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              الوصول السريع للوحدات
            </h3>

            <button
              onClick={() => onNavigateTab('district_chat')}
              className="w-full text-right p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 transition-all flex items-center justify-between group cursor-pointer border border-blue-200/80 shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                    <span>شبكة ودردشة المقاطعة</span>
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">جديد</span>
                  </div>
                  <div className="text-[10px] text-blue-700/90 font-medium">الدردشة الجماعية ومتابعة أساتذة عين أزال</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateTab('knowledge_engine')}
              className="w-full text-right p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 hover:text-blue-700 transition-all flex items-center justify-between group cursor-pointer border border-slate-100"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">بنك الألعاب والوضعيات</div>
                  <div className="text-[10px] text-slate-500">مكتبة شاملة للأهداف والألعاب الرياضية</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </button>

            <button
              onClick={() => onNavigateTab('competency_assessment')}
              className="w-full text-right p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 hover:text-blue-700 transition-all flex items-center justify-between group cursor-pointer border border-slate-100"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">تقويم الكفاءة الختامية</div>
                  <div className="text-[10px] text-slate-500">شبكة معايير أ، ب، ج، د واستخراج النتائج</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
