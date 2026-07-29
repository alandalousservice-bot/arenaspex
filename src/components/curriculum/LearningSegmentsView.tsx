/**
 * SPEX - Learning Segments Component
 * المقاطع والوحدات التعليمية الرسمية لمادة التربية البدنية والرياضية لمستويات الابتدائي (س1 إلى س5)
 */

import React, { useState } from 'react';
import { Layers, Search, BookOpen, Clock, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import {
  PE_LEVELS,
  PE_FIELDS,
  COMPLETE_ANNUAL_CURRICULUM
} from '../../data/algerianCurriculum';

export const LearningSegmentsView: React.FC = () => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('lvl_p1');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('all');
  const [searchVal, setSearchVal] = useState('');

  const currentLevelCurriculum = COMPLETE_ANNUAL_CURRICULUM[selectedLevelId] || COMPLETE_ANNUAL_CURRICULUM['lvl_p1'];

  const filteredFields = Object.values(currentLevelCurriculum.fields).filter((field) => {
    const matchesField = selectedFieldId === 'all' || field.fieldId === selectedFieldId;
    const matchesSearch =
      field.fieldName.includes(searchVal) ||
      field.finalCompetency.includes(searchVal) ||
      field.sessionsList.some((s) => s.objective.includes(searchVal));
    return matchesField && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            المرجع البيداغوجي الموحد للابتدائي
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>المقاطع التعليمية والوحدات التعلمية (س1 إلى س5)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            10 حصص بيداغوجية مبرمجة لكل ميدان تعلمي وفق التسلسل الوزاري الرسمي
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="ابحث في الأهداف والمقاطع..."
            className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Level Selection Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-2">اختر المستوى الدراسي:</span>
        {PE_LEVELS.map((lvl) => {
          const isSelected = lvl.id === selectedLevelId;
          return (
            <button
              key={lvl.id}
              onClick={() => setSelectedLevelId(lvl.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {lvl.name}
            </button>
          );
        })}
      </div>

      {/* Field Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedFieldId('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedFieldId === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          جميع الميادين (30 حصة)
        </button>
        {PE_FIELDS.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFieldId(f.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFieldId === f.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Fields List */}
      <div className="space-y-6">
        {filteredFields.map((field) => (
          <div
            key={field.fieldId}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  المقطع التعلمي: {field.fieldName}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-2">{field.finalCompetency}</h3>
              </div>

              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> {field.sessionsCount} حصص مبرمجة
              </span>
            </div>

            {/* Criteria & Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  معايير تحقيق الكفاءة
                </span>
                <ul className="text-xs text-slate-700 space-y-1 pt-1">
                  {field.criteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                  مؤشرات تحقيق الكفاءة
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

            {/* Pedagogical Notes */}
            {field.pedagogicalNotes && field.pedagogicalNotes.length > 0 && (
              <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-amber-800">
                  <BookOpen className="w-3.5 h-3.5" /> ملاحظات بيداغوجية للمقطع:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-amber-900">
                  {field.pedagogicalNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 10 Sessions List */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">سيرورة الحصص التعلمية للمقطع (10 حصص):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                {field.sessionsList.map((sess) => (
                  <div
                    key={sess.sessionNumber}
                    className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      sess.type === 'تقويم تشخيصي'
                        ? 'bg-amber-50 border-amber-200'
                        : sess.type === 'إدماجية'
                        ? 'bg-purple-50 border-purple-200'
                        : sess.type === 'تقويم تحصيلي'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[10px] text-slate-900">
                        حصة {sess.sessionNumber < 10 ? '0' + sess.sessionNumber : sess.sessionNumber}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600">{sess.typeLabel}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-800 leading-tight pt-0.5">
                      {sess.objective}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
