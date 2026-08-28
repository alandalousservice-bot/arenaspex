import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  GraduationCap,
  Loader2,
  Pencil,
  Printer,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  ANNUAL_PLAN_LEVELS,
  ANNUAL_PLAN_REFERENCE,
  type AnnualPlanDomain,
  type AnnualPlanLevel,
} from '../../data/annualPlanReference';
import type { User } from '../../types/spex';
import { useCurriculumOverrides } from '../../hooks/useCurriculumOverrides';
import { fetchAnnualPlans } from '../../services/api';
import { formatAcademicYearLabel, getCurrentAcademicYear } from '../../services/academicYear';
import { AnnualPlanOfficialTable, type AnnualPlanEditValues } from './AnnualPlanOfficialTable';
import {
  annualPlanTimeLabel,
  buildAnnualPlanPresentation,
  buildDomainPresentation,
} from '../../services/annualPlanPresentation';

interface AnnualPlanViewProps {
  currentUser: User;
  onNavigateToAnnualSchedule?: () => void;
  academicYearId?: string;
}

function buildEditValues(
  level: AnnualPlanLevel,
  display: (key: string, value: string) => string
): AnnualPlanEditValues {
  return {
    comprehensive: display('comprehensive', level.comprehensive),
    domains: Object.fromEntries(
      level.domains.map((domain) => [
        domain.fieldId,
        {
          competency: display(`${domain.fieldId}__final`, domain.finalCompetency),
          components: display(`${domain.fieldId}__components`, domain.components),
          knowledgeResources: display(`${domain.fieldId}__knowledge`, domain.knowledgeResources),
          transversalResources: display(
            `${domain.fieldId}__transversal`,
            domain.transversalResources
          ),
          evaluationCriteria: display(`${domain.fieldId}__evaluation`, domain.evaluationCriteria),
          time: display(
            `${domain.fieldId}__time`,
            annualPlanTimeLabel(Number(level.levelId.replace('lvl_p', ''))) || domain.time
          ),
        },
      ])
    ),
  };
}

function buildOverrides(values: AnnualPlanEditValues) {
  const overrides: Record<string, Record<string, string>> = {
    comprehensive: { comprehensive: values.comprehensive },
  };
  Object.entries(values.domains).forEach(([fieldId, value]) => {
    overrides[`${fieldId}__final`] = { finalCompetency: value.competency || '' };
    overrides[`${fieldId}__components`] = { components: value.components || '' };
    overrides[`${fieldId}__knowledge`] = { knowledgeResources: value.knowledgeResources || '' };
    overrides[`${fieldId}__transversal`] = {
      transversalResources: value.transversalResources || '',
    };
    overrides[`${fieldId}__evaluation`] = { evaluationCriteria: value.evaluationCriteria || '' };
    overrides[`${fieldId}__time`] = { time: value.time || '' };
  });
  return overrides;
}

export const AnnualPlanView: React.FC<AnnualPlanViewProps> = ({
  currentUser,
  academicYearId = getCurrentAcademicYear(),
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState('lvl_p1');
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<AnnualPlanEditValues | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const { record, values, isLoading, isSaving, saveAll, clearAll, restoreOriginal, reload } =
    useCurriculumOverrides({
      currentUser,
      levelId: selectedLevelId,
      kind: 'annual_plan_new',
      academicYearId,
    });
  const referenceLevel = ANNUAL_PLAN_REFERENCE[selectedLevelId] || ANNUAL_PLAN_REFERENCE.lvl_p1;
  const hasCustomization = !!record;
  const isCleared =
    !!values.__cleared ||
    (hasCustomization &&
      Object.keys(values).length > 0 &&
      Object.values(values).every(
        (value) =>
          !value ||
          value.isCleared ||
          Object.values(value).every(
            (item) => item === '' || item === null || (Array.isArray(item) && item.length === 0)
          )
      ));
  const displayValue = useCallback(
    (key: string, reference: string): string => {
      if (!hasCustomization) return reference;
      if (values.__cleared) return '';
      const override = values[key];
      if (!override) return reference;
      const value =
        key === 'comprehensive'
          ? override.comprehensive
          : key.endsWith('__final')
            ? override.finalCompetency
            : key.endsWith('__components')
              ? override.components
              : key.endsWith('__knowledge')
                ? override.knowledgeResources
                : key.endsWith('__transversal')
                  ? override.transversalResources
                  : key.endsWith('__evaluation')
                    ? override.evaluationCriteria
                    : override.time;
      return typeof value === 'string' ? value : reference;
    },
    [hasCustomization, values]
  );
  const presentation = useMemo(() => {
    const model = buildAnnualPlanPresentation(referenceLevel, (domain: AnnualPlanDomain, grade) =>
      buildDomainPresentation(
        {
          ...domain,
          finalCompetency: displayValue(`${domain.fieldId}__final`, domain.finalCompetency),
          components: displayValue(`${domain.fieldId}__components`, domain.components),
          knowledgeResources: displayValue(
            `${domain.fieldId}__knowledge`,
            domain.knowledgeResources
          ),
          transversalResources: displayValue(
            `${domain.fieldId}__transversal`,
            domain.transversalResources
          ),
          evaluationCriteria: displayValue(
            `${domain.fieldId}__evaluation`,
            domain.evaluationCriteria
          ),
          time: displayValue(`${domain.fieldId}__time`, domain.time),
        },
        grade
      )
    );
    return {
      ...model,
      overallCompetency: displayValue('comprehensive', referenceLevel.comprehensive),
    };
  }, [referenceLevel, displayValue]);
  useEffect(() => {
    if (autoDetected || currentUser.role !== 'teacher') return;
    fetchAnnualPlans({ teacherId: currentUser.id, kind: 'annual_plan_new', academicYearId })
      .then((result) => {
        const latest = [...(result.annualPlans || [])].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        if (latest?.levelId && ANNUAL_PLAN_REFERENCE[latest.levelId])
          setSelectedLevelId(latest.levelId);
        setAutoDetected(true);
      })
      .catch(() => setAutoDetected(true));
  }, [autoDetected, currentUser.id, currentUser.role, academicYearId]);
  const startEdit = () => {
    setEditValues(buildEditValues(referenceLevel, displayValue));
    setIsEditing(true);
  };
  const updateDomain = (domainId: string, field: string, value: string) =>
    setEditValues((current) =>
      current
        ? {
            ...current,
            domains: {
              ...current.domains,
              [domainId]: { ...current.domains[domainId], [field]: value },
            },
          }
        : current
    );
  const save = async () => {
    if (!editValues) return;
    await saveAll(buildOverrides(editValues), 'تعديل المخطط السنوي', true);
    setIsEditing(false);
    setEditValues(null);
  };
  const clear = async () => {
    if (!window.confirm('هل أنت متأكد من تفريغ المخطط؟')) return;
    await clearAll(buildOverrides(buildEditValues(referenceLevel, () => '')));
    setIsEditing(false);
    setEditValues(null);
  };
  const restore = async () => {
    if (!window.confirm('هل أنت متأكد من استعادة المخطط الأصلي؟')) return;
    await restoreOriginal();
    await reload();
    setIsEditing(false);
    setEditValues(null);
  };
  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="mr-2 text-sm text-slate-600">جارٍ تحميل المخطط السنوي...</span>
      </div>
    );
  const edit = editValues || buildEditValues(referenceLevel, displayValue);
  return (
    <div
      className="annual-plan-print-root annual-plan-print planning-print-document space-y-5"
      dir="rtl"
    >
      <header className="planning-print-header rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm print:rounded-none print:border-slate-400">
        <p className="text-xs font-bold text-slate-600">الجمهورية الجزائرية الديمقراطية الشعبية</p>
        <p className="text-xs font-bold text-slate-600">وزارة التربية الوطنية</p>
        <h1 className="mt-2 border-y border-slate-200 py-2 text-xl font-black text-slate-900">
          المخطط السنوي للتربية البدنية والرياضية
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4">
          {[
            ['المؤسسة', currentUser.schoolName || ''],
            ['الأستاذ(ة)', `${currentUser.firstName} ${currentUser.lastName}`.trim()],
            ['السنة الدراسية', formatAcademicYearLabel(academicYearId)],
            ['المستوى', referenceLevel.levelName],
          ].map(([label, value]) => (
            <div key={label} className="border border-slate-200 bg-slate-50 p-2">
              <span className="block font-bold text-slate-500">{label}</span>
              <span className="block font-black text-slate-900">{value || ' '}</span>
            </div>
          ))}
        </div>
      </header>
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
            <Calendar className="h-4 w-4" /> المرجع الرسمي — المخطط السنوي
          </div>
          <h2 className="mt-1 text-xl font-black text-slate-900">المخطط السنوي لبناء التعلمات</h2>
          <p className="mt-1 text-xs text-slate-500">
            مرجع تربوي منظم حسب المستوى والميادين، مع تخصيص محفوظ للأستاذ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={startEdit}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Pencil className="h-4 w-4" />
                تعديل
              </button>
              <button
                onClick={clear}
                className="flex items-center gap-2 rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800"
              >
                <Trash2 className="h-4 w-4" />
                تفريغ
              </button>
              <button
                onClick={restore}
                className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
              >
                <RefreshCcw className="h-4 w-4" />
                استعادة النص المرجعي
              </button>
            </>
          ) : (
            <>
              <button
                onClick={save}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Save className="h-4 w-4" />
                حفظ
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditValues(null);
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
              >
                إلغاء
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
          >
            <Printer className="h-4 w-4" />
            طباعة المخطط
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 print:hidden">
        {ANNUAL_PLAN_LEVELS.map((level) => (
          <button
            key={level.levelId}
            onClick={() => {
              setSelectedLevelId(level.levelId);
              setIsEditing(false);
              setEditValues(null);
            }}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${level.levelId === selectedLevelId ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}
          >
            <GraduationCap className="ml-1 inline h-4 w-4" />
            {level.levelName}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-bold text-white print:hidden">
        <span>{referenceLevel.levelName}</span>
        <span className="flex items-center gap-1 text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          {hasCustomization ? (isCleared ? 'مخطط مفرغ' : 'نسخة الأستاذ') : 'المخطط المرجعي الأصلي'}
        </span>
      </div>
      <AnnualPlanOfficialTable
        presentation={presentation}
        editValues={edit}
        isEditing={isEditing}
        onComprehensiveChange={(value) =>
          setEditValues((current) => (current ? { ...current, comprehensive: value } : current))
        }
        onDomainChange={updateDomain}
      />
      {isCleared && !isEditing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900 print:hidden">
          هذا المخطط مفرغ كتخصيص صالح. يمكنك استعادة النص المرجعي أو كتابة صياغة جديدة.
        </div>
      )}
      <footer className="planning-print-footer hidden border-t border-slate-300 pt-3 text-xs font-bold text-slate-700 print:grid">
        <div>الأستاذ(ة): {`${currentUser.firstName} ${currentUser.lastName}`.trim() || ' '}</div>
        <div>المدير(ة): __________________</div>
      </footer>
    </div>
  );
};
