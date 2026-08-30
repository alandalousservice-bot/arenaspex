/**
 * SPEX - Annual Schedule View Component
 * التوزيع السنوي: مسؤول حصرياً عن برمجة تواريخ تنفيذ الحصص المعرَّفة مسبقاً في
 * المقاطع التعليمية. لا يُنشئ حصصاً ولا يعدّل ترتيبها أو نوعها أو صياغتها — فقط
 * يعيّن/يؤجل/يعيد برمجة التاريخ، مع التفادي الآلي للعطل المدرسية.
 */

import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Printer,
  Clock,
  Layers,
  AlertTriangle,
  Filter,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  RotateCcw,
  PenLine,
} from 'lucide-react';
import {
  PE_LEVELS,
  PE_FIELDS,
  COMPLETE_ANNUAL_CURRICULUM,
  generateAnnualTimeDistribution,
} from '../../data/algerianCurriculum';
import { LAUNCH_ACADEMIC_YEAR_ID } from '../../services/academicYear';
import { getAcademicCalendar } from '../../data/academicCalendars';
import { User, LessonExecutionStatus } from '../../types/spex';
import { useCurriculumOverrides } from '../../hooks/useCurriculumOverrides';
import { mergeSchedule } from '../../services/schedule/scheduleMerge';
import { AcademicYearLabel } from '../common/AcademicYearLabel';

interface AnnualScheduleViewProps {
  currentUser: User;
  onNavigateToAnnualPlan?: () => void;
}

const STATUS_STYLES: Record<LessonExecutionStatus, string> = {
  مبرمجة: 'bg-blue-100 text-blue-800 border-blue-200',
  منجزة: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  مؤجلة: 'bg-amber-100 text-amber-800 border-amber-200',
  'غير منجزة': 'bg-slate-200 text-slate-700 border-slate-300',
};

const formatDisplayDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day} / ${month} / ${year}` : value;
};

export const AnnualScheduleView: React.FC<AnnualScheduleViewProps> = ({
  currentUser,
  onNavigateToAnnualPlan,
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('lvl_p1');
  const [startDate, setStartDate] = useState<string>(
    () => getAcademicCalendar(LAUNCH_ACADEMIC_YEAR_ID).schoolStart
  );
  const [teachingDay, setTeachingDay] = useState<number>(0); // 0: الأحد, 1: الاثنين...
  const [className, setClassName] = useState<string>('1 ابتدائي 1');
  const [filterField, setFilterField] = useState<string>('all');

  const selectedLevel = PE_LEVELS.find((l) => l.id === selectedLevelId) || PE_LEVELS[0];

  // تخصيصات التاريخ/الحالة لكل حصة (تأجيل/إعادة برمجة يدوية) — نفس المصدر الذي
  // يقرأه الكراس اليومي تلقائياً، بدون أي تكرار للبيانات
  const {
    values: scheduleOverrides,
    setValueAndSave,
    restore: restoreLesson,
    isLockedForTeacher,
  } = useCurriculumOverrides({ currentUser, levelId: selectedLevelId, kind: 'schedule_dates' });

  const canEdit = currentUser.role === 'teacher' && !isLockedForTeacher;

  // Calculate dynamic 30-session distribution (auto-computed base, holiday-avoiding)
  const baseSchedule = useMemo(() => {
    return generateAnnualTimeDistribution(
      selectedLevelId,
      startDate,
      teachingDay,
      className,
      LAUNCH_ACADEMIC_YEAR_ID
    );
  }, [selectedLevelId, startDate, teachingDay, className]);

  const mergedSchedule = useMemo(
    () => mergeSchedule(baseSchedule, scheduleOverrides),
    [baseSchedule, scheduleOverrides]
  );

  const filteredSchedule = useMemo(() => {
    if (filterField === 'all') return mergedSchedule;
    if (filterField === 'intro') return mergedSchedule.filter((s) => (s as any).isIntro);
    return mergedSchedule.filter((s) => s.fieldId === filterField);
  }, [mergedSchedule, filterField]);

  const totalPostponedHolidays = useMemo(
    () => baseSchedule.filter((s) => s.isHolidayPostponed).length,
    [baseSchedule]
  );

  return (
    <div className="workspace-page workspace-page--annual-schedule space-y-6 animate-in fade-in duration-200 print:space-y-3">
      {/* Printable Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4 space-y-1">
        <h3 className="text-sm font-black text-slate-900">
          الجمهورية الجزائرية الديمقراطية الشعبية
        </h3>
        <h4 className="text-xs font-bold text-slate-700">
          وزارة التربية الوطنية - {currentUser.schoolName || 'المدرسة الابتدائية'}
        </h4>
        <h5 className="text-xs font-extrabold text-blue-900 mt-1">
          التوزيع الزمني السنوي للحصص التعليمية ({baseSchedule.length} حصة) - {selectedLevel.name} -
          قسم: {className}
        </h5>
        <div className="flex justify-between text-[11px] font-bold text-slate-600 pt-2 px-2">
          <span>تاريخ أول حصة: {formatDisplayDate(startDate)}</span>
          <span>
            يوم التدريس: {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'][teachingDay]}
          </span>
          <span>
            الموسم الدراسي: <AcademicYearLabel value={LAUNCH_ACADEMIC_YEAR_ID} />
          </span>
        </div>
      </div>

      {/* Main Header Screen */}
      <div className="workspace-header bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              برمجة تواريخ التنفيذ فقط
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              البرمجة الآلية لـ {baseSchedule.length} حصة (مع أسبوع التعارف والإدماجية 2)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-blue-600" />
            <span>التوزيع السنوي للحصص التعليمية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            برمجة/تأجيل/إعادة برمجة تاريخ كل حصة، مع التفادي الآلي للعطل — حصتان = هدف واحد للسنوات
            1-3، 90 دقيقة للرابعة
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="workspace-button-secondary flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة التوزيع السنوي</span>
          </button>
        </div>
      </div>

      {isLockedForTeacher && (
        <div className="rounded-2xl p-4 border bg-amber-50 border-amber-200 text-amber-900 flex items-center gap-3 text-xs font-bold print:hidden">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>يوجد اقتراح برمجة من مفتش المقاطعة على هذا المستوى بانتظار اعتماده.</span>
        </div>
      )}

      {/* Direct Pedagogical Link Banner */}
      <div className="workspace-hero bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
            <Layers className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-300 block">
              الربط البيداغوجي المباشر بالمنهاج
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              الحصص مستوردة تلقائياً من المقاطع التعليمية ({selectedLevel.name})
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              أي تعديل لصياغة الأهداف يتم من وحدة المقاطع التعليمية؛ هذه الوحدة تُبرمج التاريخ فقط
            </p>
          </div>
        </div>

        {onNavigateToAnnualPlan && (
          <button
            onClick={onNavigateToAnnualPlan}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <span>عرض المخطط السنوي للمناهج</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Level Selector */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>اختر المستوى الدراسي المخصص للتوزيع:</span>
        </span>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {PE_LEVELS.map((lvl) => {
            const isSelected = lvl.id === selectedLevelId;
            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevelId(lvl.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-extrabold'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lvl.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Configuration Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              إعدادات التوقيت والرزنامة
            </span>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">
              خصائص التوزيع الزمني والتفادي التلقائي للعطل
            </h3>
            <p className="text-xs text-slate-500">
              اختر تاريخ بداية الموسم ويوم التدريس لحساب تواريخ الحصص ({baseSchedule.length} حصة
              تشمل أسبوع التعارف والإدماجية 2) تلقائياً (يمكن لاحقاً تعديل أي حصة يدوياً)
            </p>
          </div>

          {totalPostponedHolidays > 0 && (
            <div className="bg-amber-50 text-amber-900 border border-amber-200 px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تم تفادي وتأجيل {totalPostponedHolidays} حصة تزامنت مع العطل المدرسية</span>
            </div>
          )}
        </div>

        {/* Config Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">تاريخ انطلاق أول حصة:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-300 font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">يوم الحصة الأسبوعية:</label>
            <select
              value={teachingDay}
              onChange={(e) => setTeachingDay(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-300 font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value={0}>الأحد (Sunday)</option>
              <option value={1}>الاثنين (Monday)</option>
              <option value={2}>الثلاثاء (Tuesday)</option>
              <option value={3}>الأربعاء (Wednesday)</option>
              <option value={4}>الخميس (Thursday)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">اسم القسم المخصص:</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="مثال: 1 ابتدائي 1"
              className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-300 font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Filter by Field */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            تصفية الحصص حسب الميدان:
          </span>
          <button
            onClick={() => setFilterField('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterField === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            جميع الميادين ({baseSchedule.filter((s) => !s.isIntro).length} حصة +{' '}
            {baseSchedule.filter((s) => s.isIntro).length} تعارف)
          </button>
          {PE_FIELDS.map((f) => {
            const count = baseSchedule.filter((s) => s.fieldId === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilterField(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterField === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.name} ({count} حصة)
              </button>
            );
          })}
          <button
            onClick={() => setFilterField('intro')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterField === 'intro'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            أسبوع التعارف ({baseSchedule.filter((s) => s.isIntro).length})
          </button>
        </div>
      </div>

      {/* 30 Sessions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>
              التوزيع الزمني الرسمي لـ {selectedLevel.name} - قسم: {className}
            </span>
          </div>
          <span className="text-blue-700 font-black bg-blue-100 px-3 py-1 rounded-xl">
            {filteredSchedule.length} حصة مبرمجة معروضة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
              <tr>
                <th className="p-3 text-center">رقم الحصة</th>
                <th className="p-3">المقطع التعليمي</th>
                <th className="p-3">نوع الحصة</th>
                <th className="p-3 text-center">المدة</th>
                <th className="p-3">تاريخ التنفيذ</th>
                <th className="p-3 text-center">حالة التنفيذ</th>
                <th className="p-3 text-center">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSchedule.map((sess) => (
                <tr
                  key={sess.key}
                  className={`hover:bg-slate-50 transition-colors ${(sess as any).isIntro ? 'bg-amber-50/60 border-l-4 border-l-amber-400' : ''} ${
                    sess.isHolidayPostponed || sess.isManuallyRescheduled ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="p-3 text-center font-extrabold text-slate-900">
                    <span
                      className={`w-8 h-8 rounded-xl font-black inline-flex items-center justify-center border ${(sess as any).isIntro ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                    >
                      {sess.globalSessionNumber < 10
                        ? '0' + sess.globalSessionNumber
                        : sess.globalSessionNumber}
                    </span>
                  </td>

                  <td className="p-3 font-extrabold text-slate-900 whitespace-nowrap">
                    {sess.fieldName}
                    <span className="block text-[10px] font-bold text-slate-400">
                      {(sess as any).isIntro ? 'تعارف' : `حصة ${sess.fieldSessionNumber}/10`}
                      {(sess as any).objectiveGroupId
                        ? ` • ${String((sess as any).objectiveGroupId)
                            .split('__')
                            .pop()}`
                        : ''}
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        (sess as any).isIntro
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : sess.sessionType === 'تقويم تشخيصي'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : sess.sessionType === 'إدماجية'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : sess.sessionType === 'تقويم تحصيلي'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {sess.sessionTypeLabel}
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                      {(sess as any).durationMinutes || 60} د
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    {canEdit ? (
                      <input
                        type="date"
                        value={sess.scheduledDate}
                        onChange={(e) => setValueAndSave(sess.key, { date: e.target.value })}
                        className="px-2 py-1 rounded-lg text-slate-900 border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-900 border border-slate-200 font-mono">
                        {sess.scheduledDate}
                      </span>
                    )}
                    {sess.isManuallyRescheduled && (
                      <span className="block text-[10px] font-bold text-amber-700 mt-1 flex items-center gap-1">
                        <PenLine className="w-2.5 h-2.5" /> معدَّلة يدوياً (الأصل:{' '}
                        {sess.originalScheduledDate})
                        {canEdit && (
                          <button
                            onClick={() => restoreLesson(sess.key)}
                            className="text-blue-700 hover:underline flex items-center gap-0.5 mr-1"
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> رجوع
                          </button>
                        )}
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    {canEdit ? (
                      <select
                        value={sess.status}
                        onChange={(e) =>
                          setValueAndSave(sess.key, {
                            status: e.target.value as LessonExecutionStatus,
                          })
                        }
                        className={`px-2 py-1 rounded-lg font-bold text-[11px] border cursor-pointer outline-none ${STATUS_STYLES[sess.status]}`}
                      >
                        <option value="مبرمجة">مبرمجة</option>
                        <option value="منجزة">منجزة</option>
                        <option value="مؤجلة">مؤجلة</option>
                        <option value="غير منجزة">غير منجزة</option>
                      </select>
                    ) : (
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border ${STATUS_STYLES[sess.status]}`}
                      >
                        {sess.status}
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-center whitespace-nowrap">
                    {sess.isHolidayPostponed ? (
                      <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        {sess.holidayNote}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                        حصة دراسية منتظمة
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Footer / Signatures - Visible in Print Only */}
      <div className="hidden print:grid grid-cols-2 gap-8 text-xs font-bold text-slate-800 pt-8 border-t border-slate-300 mt-6">
        <div className="text-center space-y-12">
          <p>توقيع وختم أستاذ التربية البدنية والرياضية</p>
          <p className="text-slate-400">......................................................</p>
        </div>
        <div className="text-center space-y-12">
          <p>توقيع وختم مفتش التربية البدنية والرياضية</p>
          <p className="text-slate-400">......................................................</p>
        </div>
      </div>
    </div>
  );
};
