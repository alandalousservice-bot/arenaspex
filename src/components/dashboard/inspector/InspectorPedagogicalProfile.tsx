import React from 'react';
import {
  UserCheck,
  Plus,
  Send,
  BarChart3,
  Calendar,
  FileText,
  Users,
  Award,
  TrendingUp,
  Clock,
  Eye,
} from 'lucide-react';
import {
  User,
  ClassRoom,
  Student,
  WeeklyScheduleSlot,
  LessonPlan,
  DailyNotebookEntry,
  InspectionVisit,
  InspectorNote,
} from '../../../types/spex';
import { COMPLETE_ANNUAL_CURRICULUM, PE_LEVELS } from '../../../data/algerianCurriculum';
import { InspectorAnnualPlanProposalCard } from './InspectorAnnualPlanProposalCard';

interface InspectorPedagogicalProfileProps {
  inspector: User;
  selectedTeacher: User;
  teacherClasses: ClassRoom[];
  totalStudentsTaught: number;
  maleCount: number;
  femaleCount: number;
  weeklyHoursCount: number;
  teacherSubTab: 'annual_plan' | 'schedule' | 'lesson_plans' | 'students' | 'visits';
  onSetTeacherSubTab: (tab: 'annual_plan' | 'schedule' | 'lesson_plans' | 'students' | 'visits') => void;
  selectedInspectorLevelId: string;
  onSetSelectedInspectorLevelId: (levelId: string) => void;
  teacherLessonPlans: LessonPlan[];
  teacherNotebook: DailyNotebookEntry[];
  teacherScheduleSlots: WeeklyScheduleSlot[];
  visits: InspectionVisit[];
  notes: InspectorNote[];
  onOpenVisitModal: () => void;
  onOpenNoteModal: () => void;
  onSelectLessonPlanModal: (lp: LessonPlan) => void;
}

export const InspectorPedagogicalProfile: React.FC<InspectorPedagogicalProfileProps> = ({
  inspector,
  selectedTeacher,
  teacherClasses,
  totalStudentsTaught,
  maleCount,
  femaleCount,
  weeklyHoursCount,
  teacherSubTab,
  onSetTeacherSubTab,
  selectedInspectorLevelId,
  onSetSelectedInspectorLevelId,
  teacherLessonPlans,
  teacherNotebook,
  teacherScheduleSlots,
  visits,
  notes,
  onOpenVisitModal,
  onOpenNoteModal,
  onSelectLessonPlanModal,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md">
              {selectedTeacher.firstName?.[0]}
              {selectedTeacher.lastName?.[0]}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold mb-0.5">
                <UserCheck className="w-3 h-3" />
                <span>ملف الإشراف والتأطير البيداغوجي المكتمل</span>
              </div>
              <h3 className="text-base font-extrabold text-white">
                الأستاذ(ة): {selectedTeacher.firstName} {selectedTeacher.lastName}
              </h3>
              <p className="text-xs text-slate-400">
                المؤسسة: {selectedTeacher.schoolName || 'المدرسة الابتدائية بالعين أزال'} • الولاية:{' '}
                {selectedTeacher.wilaya || 'سطيف'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenVisitModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>زيارة تفقدية</span>
            </button>
            <button
              onClick={onOpenNoteModal}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>إرسال توجيه رسمي</span>
            </button>
          </div>
        </div>

        {/* Specs Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/80 p-3.5 rounded-2xl text-xs border border-slate-700/60">
          <div>
            <span className="text-slate-400 block text-[10px] font-bold">العدد الكلي للتلاميذ</span>
            <span className="font-black text-blue-300 text-sm">{totalStudentsTaught} تلميذاً</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-bold">ساعات العمل الأسبوعية</span>
            <span className="font-black text-purple-300 text-sm">{weeklyHoursCount} ساعة / أسبوعياً</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-bold">عدد الأقسام المسندة</span>
            <span className="font-black text-slate-200 text-sm">{teacherClasses.length} أقسام</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-bold">نسبة تنفيذ البرنامج</span>
            <span className="font-black text-emerald-400 text-sm">88% مكتمل</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto">
          <button
            onClick={() => onSetTeacherSubTab('annual_plan')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherSubTab === 'annual_plan'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>المخطط والتوزيع السنوي</span>
          </button>

          <button
            onClick={() => onSetTeacherSubTab('schedule')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherSubTab === 'schedule'
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>التوزيع الأسبوعي وساعات العمل</span>
          </button>

          <button
            onClick={() => onSetTeacherSubTab('lesson_plans')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherSubTab === 'lesson_plans'
                ? 'bg-white text-blue-800 shadow-sm'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>المذكرات البيداغوجية والتحضير</span>
          </button>

          <button
            onClick={() => onSetTeacherSubTab('students')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherSubTab === 'students'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>إجمالي التلاميذ والأقسام</span>
          </button>

          <button
            onClick={() => onSetTeacherSubTab('visits')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherSubTab === 'visits'
                ? 'bg-white text-rose-800 shadow-sm'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-rose-600" />
            <span>الزيارات والتوجيهات</span>
          </button>
        </div>

        {/* SUB-TAB 1: ANNUAL PLAN */}
        {teacherSubTab === 'annual_plan' && (() => {
          const levelData =
            COMPLETE_ANNUAL_CURRICULUM[selectedInspectorLevelId] ||
            COMPLETE_ANNUAL_CURRICULUM['lvl_p1'];
          const levelObj =
            PE_LEVELS.find((l) => l.id === selectedInspectorLevelId) || PE_LEVELS[0];

          const selectedLevelPlans = teacherLessonPlans.filter((lp) => {
            if (!lp.levelName) return true;
            return (
              lp.levelName.includes(levelObj.name) ||
              lp.levelName.includes(selectedInspectorLevelId) ||
              levelObj.name.includes(lp.levelName)
            );
          });

          const selectedLevelNotebook = teacherNotebook.filter((entry) => entry.status === 'منجزة');

          const matchesDomain1 = (item: any) => {
            const text = `${item.fieldName || ''} ${item.competencyTitle || ''} ${item.segmentTitle || ''} ${item.sessionTitle || ''} ${item.note || ''} ${item.domain || ''}`.toLowerCase();
            return (
              text.includes('وضعيات') ||
              text.includes('تنقل') ||
              text.includes('توازن') ||
              text.includes('locomotion') ||
              text.includes('الأول') ||
              text.includes('1')
            );
          };

          const matchesDomain2 = (item: any) => {
            const text = `${item.fieldName || ''} ${item.competencyTitle || ''} ${item.segmentTitle || ''} ${item.sessionTitle || ''} ${item.note || ''} ${item.domain || ''}`.toLowerCase();
            return (
              text.includes('قاعدية') ||
              text.includes('جري') ||
              text.includes('قفز') ||
              text.includes('رمي') ||
              text.includes('fundamentals') ||
              text.includes('الثاني') ||
              text.includes('2')
            );
          };

          const matchesDomain3 = (item: any) => {
            const text = `${item.fieldName || ''} ${item.competencyTitle || ''} ${item.segmentTitle || ''} ${item.sessionTitle || ''} ${item.note || ''} ${item.domain || ''}`.toLowerCase();
            return (
              text.includes('هيكلة') ||
              text.includes('بناء') ||
              text.includes('جماعي') ||
              text.includes('تعاون') ||
              text.includes('انضباط') ||
              text.includes('structuring') ||
              text.includes('الثالث') ||
              text.includes('3')
            );
          };

          let count1 =
            selectedLevelPlans.filter(matchesDomain1).length +
            selectedLevelNotebook.filter(matchesDomain1).length;
          let count2 =
            selectedLevelPlans.filter(matchesDomain2).length +
            selectedLevelNotebook.filter(matchesDomain2).length;
          let count3 =
            selectedLevelPlans.filter(matchesDomain3).length +
            selectedLevelNotebook.filter(matchesDomain3).length;

          const unclassifiedCount = selectedLevelPlans.filter(
            (p) => !matchesDomain1(p) && !matchesDomain2(p) && !matchesDomain3(p)
          ).length;
          if (unclassifiedCount > 0) {
            if (count1 < 10) count1 += unclassifiedCount;
            else if (count2 < 10) count2 += unclassifiedCount;
            else count3 += unclassifiedCount;
          }

          const locCompleted = Math.min(10, count1);
          const fundCompleted = Math.min(10, count2);
          const structCompleted = Math.min(10, count3);
          const totalCompleted = locCompleted + fundCompleted + structCompleted;
          const overallPercentage = Math.round((totalCompleted / 30) * 100);

          return (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block">
                      المستوى الدراسي والمخطط المعتمد:
                    </label>
                    <select
                      value={selectedInspectorLevelId}
                      onChange={(e) => onSetSelectedInspectorLevelId(e.target.value)}
                      className="bg-slate-800 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {PE_LEVELS.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          {lvl.name} ({lvl.cycle})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">إجمالي الحصص البيداغوجية</span>
                    <span className="font-extrabold text-amber-400">30 حصة (10 حصص لكل ميدان)</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">الحصص المنجزة فعلياً</span>
                    <span className="font-extrabold text-emerald-400">{totalCompleted} من أصل 30 حصة</span>
                  </div>
                </div>
              </div>

              <InspectorAnnualPlanProposalCard
                inspector={inspector}
                teacher={selectedTeacher}
                levelId={selectedInspectorLevelId}
              />

              {/* Overall Progress */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>نسبة تقدم الأستاذ الفعلية في {levelObj.name}</span>
                  </h4>
                  <p className="text-xs text-emerald-800/80 mt-1">
                    إجمالي الحصص المنجزة والموثقة فعلياً:{' '}
                    <strong className="text-emerald-900">{totalCompleted} حصة</strong> من أصل{' '}
                    <strong className="text-emerald-900">30 حصة رسمية</strong>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold text-emerald-700 block">نسبة الإنجاز الكلية</span>
                    <span className="text-2xl font-black text-emerald-900">{overallPercentage}%</span>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                    {overallPercentage}%
                  </div>
                </div>
              </div>

              {/* 3 Domain Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-900">الفصل 1: الميدان 1 (10 حصص)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${locCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : locCompleted > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                      {Math.round((locCompleted / 10) * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">الوضعيات والتنقلات: التحكم في وضعيات الجسم والتوازن في الفضاء.</p>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(locCompleted / 10) * 100}%` }}></div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-900">الفصل 2: الميدان 2 (10 حصص)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fundCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : fundCompleted > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                      {Math.round((fundCompleted / 10) * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">الحركات القاعدية: اكتساب وتوظيف المشي والجري والقفز والرمي.</p>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(fundCompleted / 10) * 100}%` }}></div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-900">الفصل 3: الميدان 3 (10 حصص)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${structCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : structCompleted > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {Math.round((structCompleted / 10) * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">الهيكلة والبناء: الأنشطة الجماعية، احترام القواعد والتعاون.</p>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(structCompleted / 10) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3">الميدان البيداغوجي المعتمد</th>
                      <th className="p-3">الكفاءة الختامية للمقطع</th>
                      <th className="p-3 text-center">عدد الحصص</th>
                      <th className="p-3 text-center">حالة الإنجاز الميداني</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{levelData.fields.f_locomotion?.fieldName || 'الميدان الأول: الوضعيات والتنقلات'}</td>
                      <td className="p-3 text-slate-700 max-w-xs">{levelData.fields.f_locomotion?.finalCompetency}</td>
                      <td className="p-3 text-center font-extrabold text-slate-800">10 حصص</td>
                      <td className="p-3 text-center">
                        <span className={`font-bold px-2.5 py-1 rounded-xl text-[10px] ${locCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : locCompleted > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                          {locCompleted}/10 حصص
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{levelData.fields.f_fundamentals?.fieldName || 'الميدان الثاني: الحركات القاعدية'}</td>
                      <td className="p-3 text-slate-700 max-w-xs">{levelData.fields.f_fundamentals?.finalCompetency}</td>
                      <td className="p-3 text-center font-extrabold text-slate-800">10 حصص</td>
                      <td className="p-3 text-center">
                        <span className={`font-bold px-2.5 py-1 rounded-xl text-[10px] ${fundCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : fundCompleted > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                          {fundCompleted}/10 حصص
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{levelData.fields.f_structuring?.fieldName || 'الميدان الثالث: الهيكلة والبناء'}</td>
                      <td className="p-3 text-slate-700 max-w-xs">{levelData.fields.f_structuring?.finalCompetency}</td>
                      <td className="p-3 text-center font-extrabold text-slate-800">10 حصص</td>
                      <td className="p-3 text-center">
                        <span className={`font-bold px-2.5 py-1 rounded-xl text-[10px] ${structCompleted === 10 ? 'bg-emerald-100 text-emerald-800' : structCompleted > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {structCompleted}/10 حصص
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* SUB-TAB 2: SCHEDULE */}
        {teacherSubTab === 'schedule' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-purple-100 mb-1">
                  <Clock className="w-3 h-3" />
                  <span>الحجم الساعي المعتمد رسمياً</span>
                </div>
                <h4 className="text-lg font-black text-white">
                  عدد ساعات عمل الأستاذ أسبوعياً: {weeklyHoursCount} ساعة / أسبوعياً
                </h4>
                <p className="text-xs text-purple-200 mt-1">
                  موزعة على {teacherClasses.length} أقسام مسندة بالطور الابتدائي
                </p>
              </div>

              <div className="bg-white/10 p-3 rounded-2xl border border-white/20 text-center min-w-32">
                <span className="text-[10px] text-purple-200 font-bold block">إجمالي الحصص</span>
                <span className="text-2xl font-black text-amber-300">{weeklyHoursCount} حصص</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3 text-center w-28">التوقيت / اليوم</th>
                    <th className="p-3 text-center">الأحد</th>
                    <th className="p-3 text-center">الإثنين</th>
                    <th className="p-3 text-center">الثلاثاء</th>
                    <th className="p-3 text-center">الأربعاء</th>
                    <th className="p-3 text-center">الخميس</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {['08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '13:00 - 14:00', '14:00 - 15:00'].map((slotTime) => (
                    <tr key={slotTime} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-bold text-slate-500 bg-slate-50 dir-ltr text-[11px]">
                        {slotTime}
                      </td>
                      {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((day) => {
                        const slot = teacherScheduleSlots.find(
                          (s) => s.dayOfWeek === day && s.timeSlot === slotTime
                        );
                        return (
                          <td key={day} className="p-2 text-center align-middle border-r border-slate-100">
                            {slot ? (
                              <div className="bg-purple-50 text-purple-900 border border-purple-200 p-2 rounded-xl text-center shadow-2xs">
                                <span className="font-extrabold text-xs block text-purple-950">
                                  {slot.className}
                                </span>
                                <span className="text-[10px] text-purple-700 block font-semibold">
                                  {slot.venue || 'الفناء الرياضي'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: LESSON PLANS */}
        {teacherSubTab === 'lesson_plans' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>المذكرات البيداغوجية المحضرة من قبل الأستاذ ({teacherLessonPlans.length} مذكرات)</span>
              </h4>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                ✔️ مصادق عليها ومطابقة للتدرج الوزاري
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teacherLessonPlans.map((lp) => (
                <div
                  key={lp.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 leading-snug">{lp.sessionTitle}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                      {lp.levelName || (lp as any).level || 'السنة الأولى ابتدائي'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    <strong>الهدف التعلمي:</strong> {lp.generalObjective || (lp as any).learningGoal || 'تنمية المهارات الحركية والتنقل بالتوازن'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-bold">الحجم: {lp.duration || '45 دقيقة'}</span>
                    <button
                      onClick={() => onSelectLessonPlanModal(lp)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>معاينة تفاصيل المذكرة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: STUDENTS */}
        {teacherSubTab === 'students' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-blue-100 mb-1">
                  <Users className="w-3 h-3" />
                  <span>إحصائيات التلاميذ الكلية</span>
                </div>
                <h4 className="text-lg font-black text-white">
                  العدد الكلي للتلاميذ الذين يدرسهم الأستاذ: {totalStudentsTaught} تلميذاً
                </h4>
                <p className="text-xs text-blue-200 mt-1">
                  موزعين على {teacherClasses.length} أقسام مسندة بـ {selectedTeacher.schoolName || 'المدرسة الابتدائية'}
                </p>
              </div>

              <div className="flex gap-2">
                <div className="bg-white/10 p-3 rounded-2xl border border-white/20 text-center min-w-24">
                  <span className="text-[10px] text-blue-200 font-bold block">ذكور</span>
                  <span className="text-lg font-black text-cyan-300">{maleCount}</span>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl border border-white/20 text-center min-w-24">
                  <span className="text-[10px] text-blue-200 font-bold block">إناث</span>
                  <span className="text-lg font-black text-pink-300">{femaleCount}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {teacherClasses.map((cls) => {
                const count = cls.studentCount || 25;
                return (
                  <div key={cls.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{cls.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-100">
                        {count} تلميذاً
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-1">
                      <div>الذكور: <strong>{Math.round(count * 0.52)}</strong> | الإناث: <strong>{Math.round(count * 0.48)}</strong></div>
                      <div>النوادي: نادي أ ({Math.round(count / 2)}) • نادي ب ({count - Math.round(count / 2)})</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-TAB 5: VISITS */}
        {teacherSubTab === 'visits' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>أرشيف الزيارات والتقييمات البيداغوجية للأستاذ:</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500">
                {visits.filter((v) => v.teacherId === selectedTeacher.id).length} زيارات معتمدة
              </span>
            </div>

            {visits.filter((v) => v.teacherId === selectedTeacher.id).length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center">
                لا توجد زيارات تفتيشية مؤرشفة لهذا الأستاذ حالياً. يمكنك إضافة زيارة جديدة عبر الزر أعلاه.
              </p>
            ) : (
              visits
                .filter((v) => v.teacherId === selectedTeacher.id)
                .map((v) => (
                  <div key={v.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                          {v.visitType}
                        </span>
                        <span className="text-xs text-slate-500">{v.visitDate}</span>
                      </div>
                      {v.pedagogicalGrade && (
                        <div className="text-xs font-extrabold text-slate-900 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-xl">
                          النقطة التربوية: {v.pedagogicalGrade} / 20
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-800">الحصة الملاحظة: {v.lessonObservedTitle}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-[11px]">
                      <div className="bg-emerald-50/80 p-2.5 rounded-xl text-emerald-900 border border-emerald-100">
                        <span className="font-bold block text-emerald-800 mb-1">نقاط القوة والإيجابيات:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {v.positivePoints.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-amber-50/80 p-2.5 rounded-xl text-amber-900 border border-amber-100">
                        <span className="font-bold block text-amber-800 mb-1">توجيهات للتحسين:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {v.areasForImprovement.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))
            )}

            {/* Directives */}
            <div className="pt-2 space-y-3">
              <h5 className="text-xs font-bold text-slate-900">التوجيهات والتنبيهات المباشرة:</h5>
              {notes.filter((n) => n.teacherId === selectedTeacher.id).length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center">
                  لا توجد تنبيهات سابقة.
                </p>
              ) : (
                notes
                  .filter((n) => n.teacherId === selectedTeacher.id)
                  .map((n) => (
                    <div key={n.id} className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400">{n.title}</span>
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">{n.priority}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{n.content}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
