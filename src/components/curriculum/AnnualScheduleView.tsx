/**
 * SPEX - Annual Schedule View Component
 * التوزيع السنوي للحصص (30 حصة) في خانة مستقلة مع الربط البيداغوجي مع المخطط السنوي
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
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import {
  PE_LEVELS,
  PE_FIELDS,
  COMPLETE_ANNUAL_CURRICULUM,
  generateAnnualTimeDistribution,
  ScheduledAnnualSession
} from '../../data/algerianCurriculum';

interface AnnualScheduleViewProps {
  onNavigateToAnnualPlan?: () => void;
}

export const AnnualScheduleView: React.FC<AnnualScheduleViewProps> = ({
  onNavigateToAnnualPlan
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('lvl_p1');
  const [startDate, setStartDate] = useState<string>('2025-09-21');
  const [teachingDay, setTeachingDay] = useState<number>(0); // 0: الأحد, 1: الاثنين...
  const [className, setClassName] = useState<string>('1 ابتدائي 1');
  const [filterField, setFilterField] = useState<string>('all');

  const selectedLevel = PE_LEVELS.find((l) => l.id === selectedLevelId) || PE_LEVELS[0];
  const levelCurriculum = COMPLETE_ANNUAL_CURRICULUM[selectedLevelId] || COMPLETE_ANNUAL_CURRICULUM['lvl_p1'];

  // Calculate dynamic 30-session distribution
  const scheduledSessions = useMemo(() => {
    return generateAnnualTimeDistribution(selectedLevelId, startDate, teachingDay, className);
  }, [selectedLevelId, startDate, teachingDay, className]);

  const filteredScheduledSessions = useMemo(() => {
    if (filterField === 'all') return scheduledSessions;
    return scheduledSessions.filter((s) => s.fieldId === filterField);
  }, [scheduledSessions, filterField]);

  const totalPostponedHolidays = useMemo(() => {
    return scheduledSessions.filter((s) => s.isHolidayPostponed).length;
  }, [scheduledSessions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 print:space-y-3">
      {/* Printable Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4 space-y-1">
        <h3 className="text-sm font-black text-slate-900">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
        <h4 className="text-xs font-bold text-slate-700">وزارة التربية الوطنية - مديرية التربية لولاية سطيف</h4>
        <h5 className="text-xs font-extrabold text-blue-900 mt-1">
          التوزيع الزمني السنوي للحصص التعليمية (30 حصة) - {selectedLevel.name} - قسم: {className}
        </h5>
        <div className="flex justify-between text-[11px] font-bold text-slate-600 pt-2 px-2">
          <span>تاريخ أول حصة: {startDate}</span>
          <span>يوم التدريس: {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'][teachingDay]}</span>
          <span>الموسم الدراسي: 2025 / 2026</span>
        </div>
      </div>

      {/* Main Header Screen */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              التخطيط والتوزيع الزمني للحصص
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              البرمجة الآلية لـ 30 حصة
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-blue-600" />
            <span>التوزيع السنوي للحصص التعليمية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            نظام البرمجة الزمنية للحصص الثلاثين (30) للتربية البدنية والرياضية مع التفادي الآلي للعطل المدرسية الجزائرية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة التوزيع السنوي</span>
          </button>
        </div>
      </div>

      {/* Direct Pedagogical Link Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
            <Layers className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-300 block">الربط البيداغوجي المباشر بالمنهاج</span>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              المخطط السنوي للمناهج والكفاءات الختامية المعيارية ({selectedLevel.name})
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              يتصل هذا التوزيع السنوي للحصص مباشرة بالكفاءات الختامية والمعايير الرسمية للميدان والمستوى
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
              اختر تاريخ بداية الموسم ويوم التدريس لحساب تواريخ الحصص الـ 30 تلقائياً
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
              filterField === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            جميع الميادين (30 حصة)
          </button>
          {PE_FIELDS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterField(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterField === f.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.name} (10 حصص)
            </button>
          ))}
        </div>
      </div>

      {/* 30 Sessions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>التوزيع الزمني الرسمي لـ {selectedLevel.name} - قسم: {className}</span>
          </div>
          <span className="text-blue-700 font-black bg-blue-100 px-3 py-1 rounded-xl">
            {filteredScheduledSessions.length} حصة مبرمجة معروضة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
              <tr>
                <th className="p-3 text-center">رقم الحصة</th>
                <th className="p-3">تاريخ الحصة</th>
                <th className="p-3">الميدان التعلمي</th>
                <th className="p-3">نوع الحصة</th>
                <th className="p-3">الهدف التعلمي الخاص بالحصة</th>
                <th className="p-3 text-center">ملاحظات الرزنامة والعطل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredScheduledSessions.map((sess) => (
                <tr
                  key={sess.globalSessionNumber}
                  className={`hover:bg-slate-50 transition-colors ${
                    sess.isHolidayPostponed ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="p-3 text-center font-extrabold text-slate-900">
                    <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-black inline-flex items-center justify-center border border-blue-200">
                      {sess.globalSessionNumber < 10 ? '0' + sess.globalSessionNumber : sess.globalSessionNumber}
                    </span>
                  </td>

                  <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-900 border border-slate-200 font-mono">
                      {sess.scheduledDate}
                    </span>
                  </td>

                  <td className="p-3 font-extrabold text-slate-900 whitespace-nowrap">
                    {sess.fieldName}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        sess.sessionType === 'تقويم تشخيصي'
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

                  <td className="p-3 font-semibold text-slate-800 leading-relaxed">
                    {sess.targetObjective}
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
