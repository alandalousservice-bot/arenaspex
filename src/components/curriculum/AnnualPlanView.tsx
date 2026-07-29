/**
 * SPEX - Annual Plan View Component
 * المخطط السنوي للمناهج والكفاءات الختامية المعيارية لمادة التربية البدنية والرياضية
 */

import React, { useState } from 'react';
import {
  Calendar,
  Printer,
  Layers,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowLeft,
  CalendarCheck,
  Target,
  Sparkles
} from 'lucide-react';
import {
  PE_LEVELS,
  COMPLETE_ANNUAL_CURRICULUM
} from '../../data/algerianCurriculum';

interface AnnualPlanViewProps {
  onNavigateToAnnualSchedule?: () => void;
}

export const AnnualPlanView: React.FC<AnnualPlanViewProps> = ({
  onNavigateToAnnualSchedule
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('lvl_p1');

  const selectedLevel = PE_LEVELS.find((l) => l.id === selectedLevelId) || PE_LEVELS[0];
  const levelCurriculum = COMPLETE_ANNUAL_CURRICULUM[selectedLevelId] || COMPLETE_ANNUAL_CURRICULUM['lvl_p1'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 print:space-y-3">
      {/* Printable Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4 space-y-1">
        <h3 className="text-sm font-black text-slate-900">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
        <h4 className="text-xs font-bold text-slate-700">وزارة التربية الوطنية - مديرية التربية لولاية سطيف</h4>
        <h5 className="text-xs font-extrabold text-blue-900 mt-1">
          المخطط السنوي لبناء التعلمات والكفاءات الختامية ({levelCurriculum.levelName})
        </h5>
        <div className="flex justify-between text-[11px] font-bold text-slate-600 pt-2 px-2">
          <span>المادة: التربية البدنية والرياضية</span>
          <span>الحجم الساعي السنوي: 30 حصة</span>
          <span>الموسم الدراسي: 2025 / 2026</span>
        </div>
      </div>

      {/* Header & Main Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              المرجع البيداغوجي الرسمي (2025 / 2026)
            </span>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
              منهاج الابتدائي المعتمد
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>المخطط السنوي لبناء التعلمات</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            المخطط البيداغوجي السنوي المعتمد وفق منهاج التربية البدنية والرياضية بالجزائر (3 ميادين تعليمية)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة المخطط السنوي</span>
          </button>
        </div>
      </div>

      {/* Direct Pedagogical Link Banner to Schedule */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-teal-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
            <CalendarCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-300 block">الترابط البيداغوجي بين المخطط والتوزيع</span>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              التوزيع السنوي الزمني للحصص (30 حصة) والتفادي الآلي للعطل
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              ترجمة أهداف هذا المخطط السنوي إلى رزنامة زمنيّة برمجية تتفادى العطل المدرسية تلقائياً
            </p>
          </div>
        </div>

        {onNavigateToAnnualSchedule && (
          <button
            onClick={onNavigateToAnnualSchedule}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <span>عرض التوزيع السنوي للحصص</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Level Selector Tabs */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>اختر المستوى الدراسي لعرض المخطط السنوي:</span>
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
                    ? 'bg-slate-900 text-white shadow-md font-extrabold'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lvl.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Annual Plan Overview Box */}
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-md border border-blue-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-amber-300 bg-white/10 px-3 py-1 rounded-full border border-white/10 self-start">
              المستوى: {levelCurriculum.levelName}
            </span>
            <span className="text-xs font-bold text-slate-200">
              الحجم الساعي الإجمالي: 30 حصة (10 حصص لكل ميدان تعليلمي)
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-white">
            الكفاءات الختامية والمعايير والمؤشرات المعتمدة وفق منهاج التربية البدنية والرياضية
          </h3>
        </div>

        {/* 3 Fields Cards */}
        <div className="space-y-6">
          {Object.entries(levelCurriculum.fields).map(([fieldKey, field]) => (
            <div
              key={fieldKey}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4"
            >
              {/* Field Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <h3 className="text-base font-black text-slate-900">
                    {field.fieldName}
                  </h3>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  الحجم الساعي: 10 حصص تعليلمية
                </span>
              </div>

              {/* Target Competency & Indicators Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Target Competency Card */}
                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2">
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                    الكفاءة الختامية للميدان
                  </span>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-relaxed pt-1">
                    « {field.finalCompetency} »
                  </p>
                </div>

                {/* Indicators Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                    مؤشرات تحقيق الكفاءة الختامية
                  </span>
                  <ul className="text-xs text-slate-700 space-y-1 pt-1">
                    {field.indicators.map((ind, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                        <span>{ind}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggested Tools */}
              {field.suggestedTools && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span className="font-bold text-slate-700">الوسائل والأدوات المقترحة:</span>
                  {field.suggestedTools.map((tool, i) => (
                    <span key={i} className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg font-bold">
                      {tool}
                    </span>
                  ))}
                </div>
              )}

              {/* 10 Sessions Flow Grid */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>سيرورة المقطع التعلمي (الحصص العشر الترتيبية):</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                  {field.sessionsList.map((s) => (
                    <div
                      key={s.sessionNumber}
                      className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                        s.type === 'تقويم تشخيصي'
                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                          : s.type === 'إدماجية'
                          ? 'bg-purple-50/60 border-purple-200 text-purple-900'
                          : s.type === 'تقويم تحصيلي'
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white shadow-2xs">
                          الحصة {s.sessionNumber < 10 ? '0' + s.sessionNumber : s.sessionNumber}
                        </span>
                        <span className="text-[10px] font-bold opacity-80">
                          {s.typeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold leading-tight pt-1">
                        {s.objective}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
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
