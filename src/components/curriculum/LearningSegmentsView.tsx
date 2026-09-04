/**
 * SPEX - Learning Segments Component
 * المقاطع والوحدات التعليمية الرسمية لمادة التربية البدنية والرياضية لمستويات الابتدائي (س1 إلى س5)
 */

import React, { useState } from 'react';
import {
  Layers,
  Search,
  BookOpen,
  Clock,
  CheckCircle2,
  Printer,
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  PE_LEVELS,
  PE_FIELDS,
  COMPLETE_ANNUAL_CURRICULUM,
  OVERALL_COMPETENCY_BY_LEVEL,
} from '../../data/algerianCurriculum';
import { useTeacherLearningPlan } from '../../hooks/useTeacherLearningPlan';
import {
  addTeacherLearningObjective,
  deleteTeacherLearningObjective,
  reorderTeacherLearningObjectives,
  updateTeacherLearningObjective,
} from '../../services/teacherLearningPlan.service';
import type { User } from '../../types/spex';
import { AcademicYearLabel } from '../common/AcademicYearLabel';

interface LearningSegmentsViewProps {
  currentUser: User;
  academicYearId: string;
  onNavigateToDistribution?: (levelId: string) => void;
}

export const LearningSegmentsView: React.FC<LearningSegmentsViewProps> = ({
  currentUser,
  academicYearId,
  onNavigateToDistribution,
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('lvl_p1');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('all');
  const [searchVal, setSearchVal] = useState('');
  const {
    plan,
    isLoading: isPlanLoading,
    isSaving,
    error: planError,
    persist,
  } = useTeacherLearningPlan({
    currentUser,
    levelId: selectedLevelId,
    academicYearId,
  });
  const [newObjectiveFieldId, setNewObjectiveFieldId] = useState<string | null>(null);
  const [newObjectiveText, setNewObjectiveText] = useState('');
  const [editingObjective, setEditingObjective] = useState<{
    fieldId: string;
    objectiveId: string;
    text: string;
  } | null>(null);

  const currentLevelCurriculum =
    COMPLETE_ANNUAL_CURRICULUM[selectedLevelId] || COMPLETE_ANNUAL_CURRICULUM['lvl_p1'];

  const filteredFields = Object.values(currentLevelCurriculum.fields).filter((field) => {
    const matchesField = selectedFieldId === 'all' || field.fieldId === selectedFieldId;
    const planDomain = plan?.domains.find((domain) => domain.fieldId === field.fieldId);
    const matchesSearch =
      field.fieldName.includes(searchVal) ||
      field.finalCompetency.includes(searchVal) ||
      planDomain?.objectives.some((objective) => objective.text.includes(searchVal));
    return matchesField && matchesSearch;
  });

  const savePlan = (nextPlan: Parameters<typeof persist>[0]) => {
    void persist(nextPlan);
  };

  const addObjective = (fieldId: string) => {
    if (!plan || !newObjectiveText.trim()) return;
    try {
      savePlan(addTeacherLearningObjective(plan, fieldId, newObjectiveText));
      setNewObjectiveText('');
      setNewObjectiveFieldId(null);
    } catch (reason: unknown) {
      window.alert(reason instanceof Error ? reason.message : 'تعذر إضافة الهدف.');
    }
  };

  const updateObjective = () => {
    if (!plan || !editingObjective || !editingObjective.text.trim()) return;
    try {
      savePlan(
        updateTeacherLearningObjective(
          plan,
          editingObjective.fieldId,
          editingObjective.objectiveId,
          editingObjective.text
        )
      );
      setEditingObjective(null);
    } catch (reason: unknown) {
      window.alert(reason instanceof Error ? reason.message : 'تعذر تعديل الهدف.');
    }
  };

  const removeObjective = (fieldId: string, objectiveId: string) => {
    if (!plan || !window.confirm('هل تريد حذف هذا الهدف من خطة الأستاذ؟')) return;
    try {
      savePlan(deleteTeacherLearningObjective(plan, fieldId, objectiveId));
    } catch (reason: unknown) {
      window.alert(reason instanceof Error ? reason.message : 'تعذر حذف الهدف.');
    }
  };

  const moveObjective = (fieldId: string, objectiveId: string, direction: 'up' | 'down') => {
    if (!plan) return;
    savePlan(reorderTeacherLearningObjectives(plan, fieldId, objectiveId, direction));
  };

  return (
    <div
      className="workspace-page workspace-page--learning-segments planning-print-document learning-segments-print space-y-6 animate-in fade-in duration-200"
      dir="rtl"
    >
      <header className="planning-print-header hidden border border-slate-300 bg-white p-4 text-center print:block">
        <p className="text-[10px] font-bold text-slate-600">
          الجمهورية الجزائرية الديمقراطية الشعبية
        </p>
        <p className="text-[10px] font-bold text-slate-600">وزارة التربية الوطنية</p>
        <div className="my-2 border-y border-slate-200 py-2">
          <h1 className="text-xl font-extrabold text-slate-900">المقاطع التعلمية</h1>
          <p className="mt-1 text-sm font-bold text-blue-800">لمادة التربية البدنية والرياضية</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-[10px] sm:grid-cols-4 print:grid-cols-4">
          {[
            ['المؤسسة', currentUser.schoolName || ''],
            ['الأستاذ', `${currentUser.firstName} ${currentUser.lastName}`.trim()],
            [
              'المستوى',
              PE_LEVELS.find((level) => level.id === selectedLevelId)?.name || selectedLevelId,
            ],
            ['السنة الدراسية', academicYearId],
          ].map(([label, value]) => (
            <div key={label} className="border border-slate-200 bg-slate-50 px-2 py-1.5">
              <span className="block font-bold text-slate-500">{label}</span>
              <span className="mt-0.5 block font-extrabold text-slate-900">
                {label === 'السنة الدراسية' ? <AcademicYearLabel value={value} /> : value || ' '}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            المرجع البيداغوجي الموحد للابتدائي
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>المقاطع التعليمية والوحدات التعلمية (س1 إلى س5)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            المرجع الرسمي ثابت، بينما يضبط الأستاذ أهدافه التعليمية وترتيبها داخل كل ميدان.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToDistribution && (
            <button
              onClick={() => onNavigateToDistribution(selectedLevelId)}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
            >
              فتح التوزيع السنوي
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
          >
            <Printer className="h-4 w-4" /> طباعة المقاطع التعلمية
          </button>
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
      </div>

      {/* Level Selection Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-2">
          اختر المستوى الدراسي:
        </span>
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

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
        <span className="font-extrabold">الكفاءة الشاملة للمستوى: </span>
        {OVERALL_COMPETENCY_BY_LEVEL[selectedLevelId] || 'غير محددة'}
      </div>

      {isPlanLoading && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-900">
          جارٍ تحميل خطة الأهداف الخاصة بالأستاذ...
        </div>
      )}
      {planError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-900"
        >
          {planError}
        </div>
      )}

      {/* Field Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
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
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow break-inside-avoid print:break-inside-avoid"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  المقطع التعلمي: {field.fieldName}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-2">
                  {field.finalCompetency}
                </h3>
              </div>

              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
                <Clock className="w-3.5 h-3.5 text-blue-600" />{' '}
                {plan?.domains.find((domain) => domain.fieldId === field.fieldId)?.objectives
                  .length || 0}{' '}
                أهداف تعليمية
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

            {/* Teacher-owned learning objectives */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 block">الأهداف التعليمية</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewObjectiveFieldId(field.fieldId);
                    setNewObjectiveText('');
                    setEditingObjective(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> إضافة هدف
                </button>
              </div>
              <div className="space-y-2">
                {(
                  plan?.domains.find((domain) => domain.fieldId === field.fieldId)?.objectives || []
                ).map((objective, objectiveIndex, objectives) => (
                  <div
                    key={objective.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-start"
                  >
                    <span className="min-w-8 rounded-lg bg-blue-100 px-2 py-1 text-center text-[11px] font-black text-blue-800">
                      {objectiveIndex + 1}
                    </span>
                    {editingObjective?.objectiveId === objective.id ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <textarea
                          value={editingObjective.text}
                          onChange={(event) =>
                            setEditingObjective({ ...editingObjective, text: event.target.value })
                          }
                          rows={2}
                          className="w-full rounded-lg border border-blue-300 bg-white p-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={updateObjective}
                            disabled={isSaving || !editingObjective.text.trim()}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" /> حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingObjective(null)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                          >
                            <X className="h-3.5 w-3.5" /> إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="min-w-0 flex-1 text-xs font-semibold leading-6 text-slate-800">
                          {objective.text}
                        </p>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label="تحرير الهدف"
                            onClick={() =>
                              setEditingObjective({
                                fieldId: field.fieldId,
                                objectiveId: objective.id,
                                text: objective.text,
                              })
                            }
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:text-blue-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="رفع الهدف"
                            disabled={objectiveIndex === 0 || isSaving}
                            onClick={() => moveObjective(field.fieldId, objective.id, 'up')}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="خفض الهدف"
                            disabled={objectiveIndex === objectives.length - 1 || isSaving}
                            onClick={() => moveObjective(field.fieldId, objective.id, 'down')}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="حذف الهدف"
                            disabled={objectives.length <= 1 || isSaving}
                            onClick={() => removeObjective(field.fieldId, objective.id)}
                            className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {newObjectiveFieldId === field.fieldId && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <label
                    className="block text-xs font-bold text-blue-950"
                    htmlFor={`new-objective-${field.fieldId}`}
                  >
                    الهدف التعليمي الجديد
                  </label>
                  <textarea
                    id={`new-objective-${field.fieldId}`}
                    value={newObjectiveText}
                    onChange={(event) => setNewObjectiveText(event.target.value)}
                    rows={2}
                    placeholder="اكتب الهدف التعليمي..."
                    className="mt-2 w-full rounded-lg border border-blue-300 bg-white p-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => addObjective(field.fieldId)}
                      disabled={isSaving || !newObjectiveText.trim()}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" /> حفظ الهدف
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewObjectiveFieldId(null)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" /> إلغاء
                    </button>
                  </div>
                </div>
              )}
              {isSaving && <p className="text-[11px] font-bold text-blue-700">جارٍ حفظ الخطة...</p>}
            </div>
          </div>
        ))}
      </div>
      <footer className="planning-print-footer hidden border-t border-slate-300 pt-3 text-xs font-bold text-slate-700 print:grid">
        <div>الأستاذ: {`${currentUser.firstName} ${currentUser.lastName}`.trim() || ' '}</div>
        <div className="text-left">المفتش: </div>
      </footer>
    </div>
  );
};
