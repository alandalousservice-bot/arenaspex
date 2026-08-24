/**
 * SPEX - Annual Plan View (المخطط السنوي) - نسخة منقحة 2025
 * مهم جداً: هذا التعديل محصور بالكامل في ميزة المخطط السنوي فقط
 * - لا يمس المقاطع التعلمية، التوزيع السنوي، الحصص، الكراس اليومي، أو أي Workflow آخر
 * - المرجع المنهجي من ملف docx الرسمي: مخططات_سنوية_و_مقاطع_1_2_3_4_5_ابتدائي_2025.docx
 *
 * البنية الجديدة:
 * - المستوى
 * - الكفاءة الشاملة
 * - لكل ميدان من الميادين الثلاثة: الميدان، الكفاءة الختامية، مركبات الكفاءة، الموارد المعرفية، الموارد العرضية، معايير ومؤشرات التقويم، الزمن
 * الميادين: الوضعيات والتنقلات، الحركات القاعدية، الهيكلة والبناء
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Printer,
  Layers,
  Clock,
  Save,
  Pencil,
  ShieldCheck,
  Loader2,
  School,
  User as UserIcon,
  GraduationCap,
  Trash2,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  ANNUAL_PLAN_REFERENCE,
  ANNUAL_PLAN_LEVELS,
  AnnualPlanLevel,
} from '../../data/annualPlanReference';
import { PE_LEVELS } from '../../data/algerianCurriculum';
import { User } from '../../types/spex';
import { useCurriculumOverrides } from '../../hooks/useCurriculumOverrides';
import { fetchAnnualPlans } from '../../services/api';

const ACADEMIC_YEAR_LABEL = '2025 / 2026';

interface AnnualPlanViewProps {
  currentUser: User;
  onNavigateToAnnualSchedule?: () => void;
}

type EditValues = {
  comprehensive: string;
  domains: Record<
    string,
    {
      finalCompetency: string;
      components: string;
      knowledgeResources: string;
      transversalResources: string;
      evaluationCriteria: string;
      time: string;
    }
  >;
};

function buildEditValuesFromDisplay(
  level: AnnualPlanLevel,
  getDisplay: (fieldId: string, prop: string, ref: string) => string
): EditValues {
  const domains: EditValues['domains'] = {};
  for (const dom of level.domains) {
    domains[dom.fieldId] = {
      finalCompetency: getDisplay(`${dom.fieldId}__final`, 'finalCompetency', dom.finalCompetency),
      components: getDisplay(`${dom.fieldId}__components`, 'components', dom.components),
      knowledgeResources: getDisplay(
        `${dom.fieldId}__knowledge`,
        'knowledgeResources',
        dom.knowledgeResources
      ),
      transversalResources: getDisplay(
        `${dom.fieldId}__transversal`,
        'transversalResources',
        dom.transversalResources
      ),
      evaluationCriteria: getDisplay(
        `${dom.fieldId}__evaluation`,
        'evaluationCriteria',
        dom.evaluationCriteria
      ),
      time: getDisplay(`${dom.fieldId}__time`, 'time', dom.time),
    };
  }
  return {
    comprehensive: getDisplay('comprehensive', 'comprehensive', level.comprehensive),
    domains,
  };
}

function buildEmptyEditValues(level: AnnualPlanLevel): EditValues {
  const domains: EditValues['domains'] = {};
  for (const dom of level.domains) {
    domains[dom.fieldId] = {
      finalCompetency: '',
      components: '',
      knowledgeResources: '',
      transversalResources: '',
      evaluationCriteria: '',
      time: '',
    };
  }
  return {
    comprehensive: '',
    domains,
  };
}

function buildOverridesFromEditValues(editValues: EditValues) {
  const overrides: Record<string, any> = {};
  overrides['comprehensive'] = { comprehensive: editValues.comprehensive };
  for (const [fieldId, vals] of Object.entries(editValues.domains)) {
    overrides[`${fieldId}__final`] = { finalCompetency: vals.finalCompetency };
    overrides[`${fieldId}__components`] = { components: vals.components };
    overrides[`${fieldId}__knowledge`] = { knowledgeResources: vals.knowledgeResources };
    overrides[`${fieldId}__transversal`] = { transversalResources: vals.transversalResources };
    overrides[`${fieldId}__evaluation`] = { evaluationCriteria: vals.evaluationCriteria };
    overrides[`${fieldId}__time`] = { time: vals.time };
  }
  return overrides;
}

export const AnnualPlanView: React.FC<AnnualPlanViewProps> = ({ currentUser }) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('lvl_p1');
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  const { record, values, isLoading, isSaving, saveAll, clearAll, restoreOriginal, reload } =
    useCurriculumOverrides({
      currentUser,
      levelId: selectedLevelId,
      kind: 'annual_plan_new',
    });

  const referenceLevel: AnnualPlanLevel =
    ANNUAL_PLAN_REFERENCE[selectedLevelId] || ANNUAL_PLAN_REFERENCE['lvl_p1'];

  useEffect(() => {
    if (autoDetected) return;
    if (currentUser.role !== 'teacher') return;
    (async () => {
      try {
        const res = await fetchAnnualPlans({
          teacherId: currentUser.id,
          kind: 'annual_plan_new' as any,
        });
        if (res.success && res.annualPlans && res.annualPlans.length > 0) {
          const sorted = [...res.annualPlans].sort(
            (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          const latest = sorted[0];
          if (latest.levelId && ANNUAL_PLAN_REFERENCE[latest.levelId]) {
            setSelectedLevelId(latest.levelId);
            setAutoDetected(true);
          }
        }
      } catch {
        // Saved-plan auto-detection is best-effort; retain the reference fallback on failure.
      }
    })();
  }, [currentUser.id, currentUser.role, autoDetected]);

  const hasCustomization = !!record;
  const isCleared =
    !!(values as any)?.__cleared ||
    (hasCustomization &&
      Object.keys(values).length > 0 &&
      Object.values(values).every((v: any) => {
        if (!v) return true;
        if ((v as any).isCleared) return true;
        return Object.values(v).every(
          (x) => x === '' || x === null || (Array.isArray(x) && (x as any).length === 0)
        );
      }));

  const getDisplayValue = (key: string, prop: string, refValue: string): string => {
    if (!hasCustomization) return refValue;
    if ((values as any)?.__cleared) return '';
    const override = (values as any)[key];
    if (override && typeof override === 'object' && prop in override) {
      const val = (override as any)[prop];
      if (val !== undefined) return val as string;
    }
    return refValue;
  };

  const displayData = useMemo(() => {
    return buildEditValuesFromDisplay(referenceLevel, getDisplayValue);
  }, [referenceLevel, values, hasCustomization]);

  const handleStartEdit = () => {
    setEditValues(JSON.parse(JSON.stringify(displayData)));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditValues(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editValues) return;
    const overrides = buildOverridesFromEditValues(editValues);
    await saveAll(overrides as any, 'تعديل المخطط السنوي', true);
    setIsEditing(false);
    setEditValues(null);
  };

  const handleClear = async () => {
    const confirmed = window.confirm(
      'هل أنت متأكد من تفريغ المخطط؟\n\nسيتم إفراغ كل محتوى المخطط الخاص بك مع بقاء هيكل الميادين الثلاثة فارغاً حتى تكتب مخططاً جديداً.\nلا يمكن التراجع إلا عبر "استعادة المخطط الأصلي".'
    );
    if (!confirmed) return;
    const empty = buildEmptyEditValues(referenceLevel);
    const overrides = buildOverridesFromEditValues(empty);
    await clearAll(overrides as any);
    setEditValues(empty);
    setIsEditing(false);
  };

  const handleRestore = async () => {
    const confirmed = window.confirm(
      'هل أنت متأكد من استعادة المخطط الأصلي؟\n\nسيتم حذف كل تخصيصاتك للمستوى الحالي وإعادة عرض المخطط المرجعي الأصلي.\nلا يمكن التراجع.'
    );
    if (!confirmed) return;
    await restoreOriginal();
    await reload();
    setIsEditing(false);
    setEditValues(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="mr-2 text-sm text-slate-600">جارٍ تحميل المخطط السنوي...</span>
      </div>
    );
  }

  const currentEdit = isEditing ? editValues : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              المرجع الرسمي 2025
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              مخطط سنوي جديد
            </span>
            {hasCustomization && !isCleared && (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                <Pencil className="w-3 h-3" /> مخصص للأستاذ
              </span>
            )}
            {isCleared && (
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border">
                مفرغ
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>المخطط السنوي لبناء التعلمات</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            يظهر تلقائياً المخطط المرجعي الخاص بالمستوى الذي تدرسه — 3 ميادين فقط بدون حصص أو تواريخ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
              >
                <Pencil className="w-4 h-4" />
                <span>تعديل المخطط</span>
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 text-xs font-bold rounded-2xl shadow-xs transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>تفريغ المخطط</span>
              </button>
              <button
                onClick={handleRestore}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-2xl shadow-xs transition-all"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>استعادة المخطط الأصلي</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>حفظ التعديلات</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-2xl shadow-xs transition-all"
              >
                <span>إلغاء</span>
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
          >
            <span>طباعة</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="block text-slate-500 font-bold">السنة الدراسية</span>
            <span className="block font-extrabold text-slate-900">{ACADEMIC_YEAR_LABEL}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <School className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="block text-slate-500 font-bold">المدرسة</span>
            <span className="block font-extrabold text-slate-900 truncate">
              {currentUser.schoolName || 'غير محددة'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <UserIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="block text-slate-500 font-bold">الأستاذ(ة)</span>
            <span className="block font-extrabold text-slate-900 truncate">
              {currentUser.firstName} {currentUser.lastName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="block text-slate-500 font-bold">المستوى الدراسي</span>
            <span className="block font-extrabold text-slate-900">{referenceLevel.levelName}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>المستويات (من المرجع الرسمي):</span>
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {ANNUAL_PLAN_LEVELS.map((lvl) => {
            const isSelected = lvl.levelId === selectedLevelId;
            return (
              <button
                key={lvl.levelId}
                onClick={() => {
                  setSelectedLevelId(lvl.levelId);
                  setIsEditing(false);
                  setEditValues(null);
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md font-extrabold'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lvl.levelName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-md border border-blue-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            المستوى: {referenceLevel.levelName}
          </span>
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            {hasCustomization
              ? isCleared
                ? 'مخطط مفرغ (تخصيص فارغ صالح)'
                : 'نسخة الأستاذ'
              : 'المخطط المرجعي الأصلي'}
          </span>
        </div>
        <span className="text-[11px] font-bold text-blue-200 bg-white/10 px-2.5 py-1 rounded-lg inline-block">
          الكفاءة الشاملة
        </span>
        {!isEditing ? (
          <h3 className="text-base font-extrabold text-white leading-relaxed min-h-[24px]">
            {displayData.comprehensive ? (
              `« ${displayData.comprehensive} »`
            ) : (
              <span className="text-slate-300 italic">— فارغ —</span>
            )}
          </h3>
        ) : (
          <textarea
            value={currentEdit?.comprehensive || ''}
            onChange={(e) =>
              setEditValues((prev) => (prev ? { ...prev, comprehensive: e.target.value } : prev))
            }
            rows={3}
            placeholder="اكتب الكفاءة الشاملة..."
            className="w-full px-3 py-2.5 bg-white text-slate-900 rounded-xl border border-blue-300 text-sm font-bold focus:ring-2 focus:ring-amber-300 outline-none resize-y"
          />
        )}
      </div>

      <div className="space-y-6">
        {referenceLevel.domains.map((domainRef) => {
          const fieldId = domainRef.fieldId;
          const disp = displayData.domains[fieldId] || {
            finalCompetency: domainRef.finalCompetency,
            components: domainRef.components,
            knowledgeResources: domainRef.knowledgeResources,
            transversalResources: domainRef.transversalResources,
            evaluationCriteria: domainRef.evaluationCriteria,
            time: domainRef.time,
          };
          const editDisp = currentEdit?.domains[fieldId];

          return (
            <div
              key={fieldId}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">الميدان</span>
                    <h3 className="text-base font-black text-slate-900">{domainRef.fieldName}</h3>
                  </div>
                </div>
                {!isEditing ? (
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {disp.time ? disp.time : <span className="italic">— فارغ —</span>}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">الزمن:</span>
                    <input
                      value={editDisp?.time || ''}
                      onChange={(e) =>
                        setEditValues((prev) =>
                          prev
                            ? {
                                ...prev,
                                domains: {
                                  ...prev.domains,
                                  [fieldId]: { ...prev.domains[fieldId], time: e.target.value },
                                },
                              }
                            : prev
                        )
                      }
                      placeholder="مثال: 20 ساعة"
                      className="px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none w-28"
                    />
                  </div>
                )}
              </div>

              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2">
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                  الكفاءة الختامية
                </span>
                {!isEditing ? (
                  <p className="text-sm font-extrabold text-slate-900 leading-relaxed min-h-[20px]">
                    {disp.finalCompetency ? (
                      `« ${disp.finalCompetency} »`
                    ) : (
                      <span className="text-slate-400 italic">— فارغ —</span>
                    )}
                  </p>
                ) : (
                  <textarea
                    value={editDisp?.finalCompetency || ''}
                    onChange={(e) =>
                      setEditValues((prev) =>
                        prev
                          ? {
                              ...prev,
                              domains: {
                                ...prev.domains,
                                [fieldId]: {
                                  ...prev.domains[fieldId],
                                  finalCompetency: e.target.value,
                                },
                              },
                            }
                          : prev
                      )
                    }
                    rows={2}
                    placeholder="الكفاءة الختامية..."
                    className="w-full px-3 py-2 bg-white rounded-lg border border-blue-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    مركبات الكفاءة
                  </span>
                  {!isEditing ? (
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[20px]">
                      {disp.components || <span className="text-slate-400 italic">— فارغ —</span>}
                    </p>
                  ) : (
                    <textarea
                      value={editDisp?.components || ''}
                      onChange={(e) =>
                        setEditValues((prev) =>
                          prev
                            ? {
                                ...prev,
                                domains: {
                                  ...prev.domains,
                                  [fieldId]: {
                                    ...prev.domains[fieldId],
                                    components: e.target.value,
                                  },
                                },
                              }
                            : prev
                        )
                      }
                      rows={5}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-emerald-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                    />
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                    الموارد المعرفية
                  </span>
                  {!isEditing ? (
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[20px]">
                      {disp.knowledgeResources || (
                        <span className="text-slate-400 italic">— فارغ —</span>
                      )}
                    </p>
                  ) : (
                    <textarea
                      value={editDisp?.knowledgeResources || ''}
                      onChange={(e) =>
                        setEditValues((prev) =>
                          prev
                            ? {
                                ...prev,
                                domains: {
                                  ...prev.domains,
                                  [fieldId]: {
                                    ...prev.domains[fieldId],
                                    knowledgeResources: e.target.value,
                                  },
                                },
                              }
                            : prev
                        )
                      }
                      rows={5}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-teal-300 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none resize-y"
                    />
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    الموارد العرضية
                  </span>
                  {!isEditing ? (
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[20px]">
                      {disp.transversalResources || (
                        <span className="text-slate-400 italic">— فارغ —</span>
                      )}
                    </p>
                  ) : (
                    <textarea
                      value={editDisp?.transversalResources || ''}
                      onChange={(e) =>
                        setEditValues((prev) =>
                          prev
                            ? {
                                ...prev,
                                domains: {
                                  ...prev.domains,
                                  [fieldId]: {
                                    ...prev.domains[fieldId],
                                    transversalResources: e.target.value,
                                  },
                                },
                              }
                            : prev
                        )
                      }
                      rows={5}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-amber-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none resize-y"
                    />
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                    معايير ومؤشرات التقويم
                  </span>
                  {!isEditing ? (
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[20px]">
                      {disp.evaluationCriteria || (
                        <span className="text-slate-400 italic">— فارغ —</span>
                      )}
                    </p>
                  ) : (
                    <textarea
                      value={editDisp?.evaluationCriteria || ''}
                      onChange={(e) =>
                        setEditValues((prev) =>
                          prev
                            ? {
                                ...prev,
                                domains: {
                                  ...prev.domains,
                                  [fieldId]: {
                                    ...prev.domains[fieldId],
                                    evaluationCriteria: e.target.value,
                                  },
                                },
                              }
                            : prev
                        )
                      }
                      rows={5}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-indigo-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isCleared && !isEditing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-xs font-bold">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>
            هذا المخطط مفرغ حالياً (تخصيص فارغ صالح) — لن يتم الرجوع تلقائياً إلى المرجع. يمكنك
            كتابة مخطط جديد ثم حفظه، أو استعادة الأصلي.
          </span>
        </div>
      )}
    </div>
  );
};
