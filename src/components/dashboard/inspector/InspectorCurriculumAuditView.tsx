import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, School, Send, Users } from 'lucide-react';
import { User, LessonPlan } from '../../../types/spex';
import { PE_LEVELS } from '../../../data/algerianCurriculum';

interface InspectorCurriculumAuditViewProps {
  teachers: User[];
  lessonPlans: LessonPlan[];
  onSendNoteToTeacher: (teacherId: string, teacherName: string, title: string, content: string) => void;
}

export const InspectorCurriculumAuditView: React.FC<InspectorCurriculumAuditViewProps> = ({
  teachers,
  lessonPlans,
  onSendNoteToTeacher,
}) => {
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  // Mock district schools
  const districtSchools = [
    { id: 'sch_1', name: 'مدرسة الشهيد بالخيري عبد القادر الابتدائي', teachersCount: 3, completion: 88, status: 'ممتاز' },
    { id: 'sch_2', name: 'مدرسة بلعياطي زبير الابتدائي', teachersCount: 2, completion: 82, status: 'جيد جـداً' },
    { id: 'sch_3', name: 'مدرسة لخضر بوعود الابتدائي', teachersCount: 2, completion: 74, status: 'متوسط' },
    { id: 'sch_4', name: 'مدرسة أحمد زبانة عين أزال', teachersCount: 2, completion: 91, status: 'ممتاز' },
  ];

  // Level completion stats
  const levelStats = [
    { id: 'lvl_p1', name: 'السنة الأولى ابتدائي', completedUnits: 28, totalUnits: 32, rate: 87.5 },
    { id: 'lvl_p2', name: 'السنة الثانية ابتدائي', completedUnits: 27, totalUnits: 32, rate: 84.3 },
    { id: 'lvl_p3', name: 'السنة الثالثة ابتدائي', completedUnits: 29, totalUnits: 32, rate: 90.6 },
    { id: 'lvl_p4', name: 'السنة الرابعة ابتدائي', completedUnits: 26, totalUnits: 32, rate: 81.2 },
    { id: 'lvl_p5', name: 'السنة الخامسة ابتدائي', completedUnits: 30, totalUnits: 32, rate: 93.7 },
  ];

  // Domains breakdown
  const domainStats = [
    { id: 'dom_1', name: 'الميدان البدني (الجري، القفز، الرمي)', rate: 89, color: 'bg-emerald-500' },
    { id: 'dom_2', name: 'الميدان المورفولوجي والتحكم الحركي', rate: 85, color: 'bg-blue-500' },
    { id: 'dom_3', name: 'الميدان الجماعي والألعاب التنافسية', rate: 82, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6 dir-rtl animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white rounded-3xl p-6 shadow-md border border-slate-700/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>التدقيق والرقابة البيداغوجية للمقاطعة 07 (سطيف)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              لوحة متابعة تقدم وتغطية المنهاج الوزاري الموحد
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تحليل نسبة تنفيذ الحصص والمذكرات البيداغوجية لمادة التربية البدنية والرياضية عبر كافة المدارس الابتدائية التابعة للمقاطعة.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-center min-w-[160px]">
            <span className="text-[10px] text-emerald-200 block font-bold">المعدل الإجمالي للمقاطعة</span>
            <span className="text-2xl font-black text-emerald-300">87.4%</span>
            <span className="text-[9px] text-slate-300 block">التزام متقدم بالجدول الزمني</span>
          </div>
        </div>
      </div>

      {/* Schools Progress Overview */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">نسبة تنفيذ البرنامج بمدارس المقاطعة</h3>
              <p className="text-[10px] text-slate-500 font-bold">المتابعة المباشرة لمؤسسات عين أزال</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {districtSchools.map((sch) => (
            <div
              key={sch.id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3 hover:border-emerald-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {sch.status}
                </span>
                <span className="text-xs font-black text-slate-900">{sch.completion}%</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">{sch.name}</h4>
                <span className="text-[10px] text-slate-500">{sch.teachersCount} أساتذة مؤطرين</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${sch.completion}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Level Breakdown & Domain Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Level Stats */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>تفصيل الإنجاز حسب المستويات التعليمية (من 1 إلى 5 ابتدائي)</span>
            </h3>
          </div>

          <div className="space-y-3">
            {levelStats.map((lvl) => (
              <div key={lvl.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900">{lvl.name}</span>
                  <span className="text-emerald-700 font-extrabold">
                    {lvl.completedUnits} من أصل {lvl.totalUnits} حصة ({lvl.rate}%)
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${lvl.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Domain Stats & Alert Cards */}
        <div className="space-y-6">
          {/* Domains */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900">الميادين البيداغوجية الثلاثة</h3>

            <div className="space-y-3">
              {domainStats.map((dom) => (
                <div key={dom.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>{dom.name}</span>
                    <span>{dom.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${dom.color} h-full rounded-full`} style={{ width: `${dom.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Notice to Teachers */}
          <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-3xl space-y-3">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-black">توجيه زمني للمفتشية</h4>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              يُلاحظ وجود تأخر بادي بحصة واحدة في الميدان الجماعي للسنة الرابعة ابتدائي. يُرجى توجيه تذكير للأساتذة لاستكمال الوضعيات التقييمية قبل نهاية الفصل.
            </p>
            <button
              onClick={() =>
                onSendNoteToTeacher(
                  teachers[0]?.id || 'usr_teacher_1',
                  teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : 'أستاذ المادة',
                  'توجيه بخصوص التقديم في الميدان الجماعي',
                  'يرجى الحرص على استكمال كافة الوضعيات التعلمية للميدان الجماعي وفق التوزيع السنوي الرسمي.'
                )
              }
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال تعليمة استدراك للأساتذة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
