/**
 * SPEX - Teacher-owned learning sections
 * المقاطع التعلمية: مرجع رسمي ثابت وتسلسل يضبطه الأستاذ.
 */

import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  COMPLETE_ANNUAL_CURRICULUM,
  OVERALL_COMPETENCY_BY_LEVEL,
  PE_FIELDS,
  PE_LEVELS,
} from '../../data/algerianCurriculum';
import { useTeacherLearningPlan } from '../../hooks/useTeacherLearningPlan';
import {
  addTeacherLearningIntegration,
  addTeacherLearningObjective,
  deleteTeacherLearningIntegration,
  deleteTeacherLearningObjective,
  reorderTeacherLearningIntegrations,
  reorderTeacherLearningObjectives,
  updateTeacherLearningIntegration,
  updateTeacherLearningObjectiveDetails,
} from '../../services/teacherLearningPlan.service';
import {
  findSuitableSituations,
  referenceSituations,
  snapshotSituation,
} from '../../services/educationalSituation.selector.service';
import type {
  EducationalSituationSnapshot,
  TeacherLearningIntegrationPoint,
  TeacherLearningObjective,
  TeacherLearningPlanData,
  User,
} from '../../types/spex';
import { AcademicYearLabel } from '../common/AcademicYearLabel';
import { LearningSectionPrintPreviewDialog } from './LearningSectionPrintPreviewDialog';
import { mapLearningSectionForPrint } from '../../services/learningSectionPrint.service';

interface LearningSegmentsViewProps {
  currentUser: User;
  academicYearId: string;
  onNavigateToDistribution?: (levelId: string) => void;
}

type EditableDraft = {
  text: string;
  learningContent: string;
  executionContent: string;
  resources: string;
  pedagogicalKnowledge: string;
  guidance: string;
  teacherNotes: string;
  situations: EducationalSituationSnapshot[];
  afterObjectiveId?: string | null;
};

type EditingItem = {
  kind: 'objective' | 'integration';
  fieldId: string;
  id: string;
  draft: EditableDraft;
};

type NewSessionDraft = {
  fieldId: string;
  type: 'تعلمية' | 'إدماجية';
  text: string;
  afterObjectiveId: string | null;
};

type SequenceItem =
  | { kind: 'diagnostic'; id: string; label: string; text: string }
  | { kind: 'summative'; id: string; label: string; text: string }
  | { kind: 'objective'; id: string; label: string; item: TeacherLearningObjective }
  | { kind: 'integration'; id: string; label: string; item: TeacherLearningIntegrationPoint };

function gradeFromLevelId(levelId: string): number {
  const match = levelId.match(/(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function draftFromObjective(objective: TeacherLearningObjective): EditableDraft {
  return {
    text: objective.text,
    learningContent: objective.learningContent || '',
    executionContent: objective.executionContent || '',
    resources: (objective.resources || []).join('، '),
    pedagogicalKnowledge: objective.pedagogicalKnowledge || '',
    guidance: objective.guidance || '',
    teacherNotes: objective.teacherNotes || '',
    situations: objective.situations || [],
  };
}

function draftFromIntegration(point: TeacherLearningIntegrationPoint): EditableDraft {
  return {
    text: point.objective || '',
    learningContent: point.learningContent || '',
    executionContent: point.executionContent || '',
    resources: (point.resources || []).join('، '),
    pedagogicalKnowledge: point.pedagogicalKnowledge || '',
    guidance: point.guidance || '',
    teacherNotes: point.teacherNotes || '',
    situations: point.situations || [],
    afterObjectiveId: point.afterObjectiveId,
  };
}

function sequenceFor(
  field: (typeof COMPLETE_ANNUAL_CURRICULUM)[string]['fields'][string],
  domain: Pick<TeacherLearningPlanData['domains'][number], 'objectives' | 'integrationPoints'>
): SequenceItem[] {
  const items: SequenceItem[] = [
    {
      kind: 'diagnostic',
      id: `diagnostic:${field.fieldId}`,
      label: 'تقويم تشخيصي',
      text:
        field.sessionsList.find((session) => session.type === 'تقويم تشخيصي')?.objective ||
        'تقويم تشخيصي لمكتسبات التلاميذ',
    },
  ];
  const integrations = [...domain.integrationPoints].sort(
    (left, right) => left.orderIndex - right.orderIndex
  );
  const addIntegrations = (afterObjectiveId: string | null) => {
    integrations
      .filter((point) => point.afterObjectiveId === afterObjectiveId)
      .forEach((point) =>
        items.push({ kind: 'integration', id: point.id, label: point.label, item: point })
      );
  };
  addIntegrations(null);
  domain.objectives.forEach((objective, index) => {
    items.push({
      kind: 'objective',
      id: objective.id,
      label: `حصة تعلمية ${index + 1}`,
      item: objective,
    });
    addIntegrations(objective.id);
  });
  items.push({
    kind: 'summative',
    id: `summative:${field.fieldId}`,
    label: 'تقويم تحصيلي',
    text:
      field.sessionsList.find((session) => session.type === 'تقويم تحصيلي')?.objective ||
      'تقويم تحصيلي لمكتسبات المتعلمين',
  });
  return items;
}

function splitResources(value: string): string[] {
  return value
    .split(/[،,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

export const LearningSegmentsView: React.FC<LearningSegmentsViewProps> = ({
  currentUser,
  academicYearId,
  onNavigateToDistribution,
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState('lvl_p1');
  const [selectedFieldId, setSelectedFieldId] = useState('all');
  const [searchVal, setSearchVal] = useState('');
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [newSessionDraft, setNewSessionDraft] = useState<NewSessionDraft | null>(null);
  const [situationPickerKey, setSituationPickerKey] = useState<string | null>(null);
  const [printingFieldId, setPrintingFieldId] = useState<string | null>(null);
  const printPreviewDialogRef = useRef<HTMLDivElement>(null);
  const printPreviewOpenerRef = useRef<HTMLButtonElement>(null);
  const closePrintPreview = () => setPrintingFieldId(null);
  const openPrintPreview = (event: React.MouseEvent<HTMLButtonElement>, fieldId: string | null) => {
    printPreviewOpenerRef.current = event.currentTarget;
    setPrintingFieldId(fieldId);
  };

  const {
    plan,
    isLoading: isPlanLoading,
    isSaving,
    error: planError,
    persist,
  } = useTeacherLearningPlan({ currentUser, levelId: selectedLevelId, academicYearId });

  const currentLevelCurriculum =
    COMPLETE_ANNUAL_CURRICULUM[selectedLevelId] || COMPLETE_ANNUAL_CURRICULUM.lvl_p1;
  const totalTeacherObjectives =
    plan?.domains.reduce((total, domain) => total + domain.objectives.length, 0) || 0;
  const totalIntegrations =
    plan?.domains.reduce((total, domain) => total + domain.integrationPoints.length, 0) || 0;
  const savePlan = (nextPlan: Parameters<typeof persist>[0]) => void persist(nextPlan);

  const filteredFields = Object.values(currentLevelCurriculum.fields).filter((field) => {
    const domain = plan?.domains.find((item) => item.fieldId === field.fieldId);
    const query = searchVal.trim();
    return (
      (selectedFieldId === 'all' || field.fieldId === selectedFieldId) &&
      (!query ||
        field.fieldName.includes(query) ||
        field.finalCompetency.includes(query) ||
        domain?.objectives.some((objective) => objective.text.includes(query)) ||
        domain?.integrationPoints.some((point) => point.objective?.includes(query)))
    );
  });

  const startEditing = (
    kind: EditingItem['kind'],
    fieldId: string,
    item: TeacherLearningObjective | TeacherLearningIntegrationPoint
  ) => {
    setSituationPickerKey(null);
    setEditingItem({
      kind,
      fieldId,
      id: item.id,
      draft:
        kind === 'objective'
          ? draftFromObjective(item as TeacherLearningObjective)
          : draftFromIntegration(item as TeacherLearningIntegrationPoint),
    });
  };

  const updateDraft = (changes: Partial<EditableDraft>) =>
    setEditingItem((current) =>
      current ? { ...current, draft: { ...current.draft, ...changes } } : null
    );

  const saveEditing = () => {
    if (!plan || !editingItem || !editingItem.draft.text.trim()) return;
    const draft = editingItem.draft;
    const fields = {
      learningContent: draft.learningContent,
      executionContent: draft.executionContent,
      resources: splitResources(draft.resources),
      pedagogicalKnowledge: draft.pedagogicalKnowledge,
      guidance: draft.guidance,
      teacherNotes: draft.teacherNotes,
      situations: draft.situations,
    };
    try {
      savePlan(
        editingItem.kind === 'objective'
          ? updateTeacherLearningObjectiveDetails(plan, editingItem.fieldId, editingItem.id, {
              text: draft.text,
              ...fields,
            })
          : updateTeacherLearningIntegration(plan, editingItem.fieldId, editingItem.id, {
              objective: draft.text,
              afterObjectiveId: draft.afterObjectiveId || null,
              ...fields,
            })
      );
      setEditingItem(null);
      setSituationPickerKey(null);
    } catch (reason: unknown) {
      window.alert(reason instanceof Error ? reason.message : 'تعذر حفظ الحصة.');
    }
  };

  const addSession = () => {
    if (!plan || !newSessionDraft || !newSessionDraft.text.trim()) return;
    try {
      const nextPlan =
        newSessionDraft.type === 'تعلمية'
          ? addTeacherLearningObjective(plan, newSessionDraft.fieldId, newSessionDraft.text)
          : addTeacherLearningIntegration(
              plan,
              newSessionDraft.fieldId,
              newSessionDraft.afterObjectiveId,
              { objective: newSessionDraft.text }
            );
      savePlan(nextPlan);
      const nextDomain = nextPlan.domains.find(
        (domain) => domain.fieldId === newSessionDraft.fieldId
      );
      const createdItem =
        newSessionDraft.type === 'تعلمية'
          ? nextDomain?.objectives.at(-1)
          : nextDomain?.integrationPoints.at(-1);
      if (createdItem) {
        setEditingItem({
          kind: newSessionDraft.type === 'تعلمية' ? 'objective' : 'integration',
          fieldId: newSessionDraft.fieldId,
          id: createdItem.id,
          draft:
            newSessionDraft.type === 'تعلمية'
              ? draftFromObjective(createdItem as TeacherLearningObjective)
              : draftFromIntegration(createdItem as TeacherLearningIntegrationPoint),
        });
      }
      setNewSessionDraft(null);
    } catch (reason: unknown) {
      window.alert(reason instanceof Error ? reason.message : 'تعذر إضافة الحصة.');
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

  const removeIntegration = (fieldId: string, integrationId: string) => {
    if (!plan || !window.confirm('هل تريد حذف هذه الحصة الإدماجية؟')) return;
    savePlan(deleteTeacherLearningIntegration(plan, fieldId, integrationId));
  };

  const suitableSituations = editingItem
    ? findSuitableSituations(referenceSituations, {
        grade: gradeFromLevelId(selectedLevelId),
        fieldId: editingItem.fieldId,
        objectiveId:
          editingItem.kind === 'objective'
            ? plan?.domains
                .find((domain) => domain.fieldId === editingItem.fieldId)
                ?.objectives.find((objective) => objective.id === editingItem.id)
                ?.sourceReferenceId || undefined
            : undefined,
        objectiveText: editingItem.draft.text,
        previousSituationIds: editingItem.draft.situations.map((item) => item.situationId),
      }).filter(
        (situation) =>
          !editingItem.draft.situations.some((item) => item.situationId === situation.id)
      )
    : [];

  const printField = printingFieldId ? currentLevelCurriculum.fields[printingFieldId] : undefined;
  const printDomain = printField
    ? (plan?.domains.find((domain) => domain.fieldId === printField.fieldId) as
        TeacherLearningPlanData['domains'][number] | undefined)
    : undefined;
  const printModel =
    printField && printDomain && plan
      ? mapLearningSectionForPrint({
          field: printField,
          domain: printDomain,
          level: currentLevelCurriculum.levelName,
          currentUser,
          academicYearId,
        })
      : null;

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

      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center print:hidden">
        <div>
          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
            المرجع البيداغوجي الموحد للابتدائي
          </span>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-slate-900">
            <Layers className="h-5 w-5 text-blue-600" />
            <span>المقاطع التعليمية والوحدات التعلمية (س1 إلى س5)</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            المرجع الرسمي ثابت، بينما يضبط الأستاذ أهدافه وحصصه وترتيبها داخل كل ميدان.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToDistribution && (
            <button
              type="button"
              onClick={() => onNavigateToDistribution(selectedLevelId)}
              className="action-primary rounded-xl px-3 py-2 text-xs font-bold text-white"
            >
              فتح التوزيع السنوي
            </button>
          )}
          <button
            type="button"
            onClick={(event) =>
              openPrintPreview(
                event,
                selectedFieldId === 'all' ? filteredFields[0]?.fieldId || null : selectedFieldId
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
          >
            <Printer className="h-4 w-4" /> طباعة المقطع المحدد
          </button>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchVal}
              onChange={(event) => setSearchVal(event.target.value)}
              placeholder="ابحث في الأهداف والمقاطع..."
              className={`${inputClass} pl-3 pr-9`}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
        <span className="ml-2 whitespace-nowrap text-xs font-bold text-slate-500">
          اختر المستوى الدراسي:
        </span>
        {PE_LEVELS.map((level) => (
          <button
            type="button"
            key={level.id}
            onClick={() => {
              setSelectedLevelId(level.id);
              setEditingItem(null);
              setNewSessionDraft(null);
            }}
            className={`workspace-level-selector cursor-pointer whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-bold transition-all ${level.id === selectedLevelId ? 'is-selected text-white shadow-md shadow-emerald-600/20' : 'border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            {level.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950 sm:col-span-3">
          <span className="font-extrabold">الكفاءة الشاملة للمستوى: </span>
          {OVERALL_COMPETENCY_BY_LEVEL[selectedLevelId] || 'غير محددة'}
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
          <span className="font-extrabold">أهداف الأستاذ</span>
          <strong className="mr-2 text-lg">{totalTeacherObjectives}</strong>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
          <span className="font-extrabold">الحصص الإدماجية</span>
          <strong className="mr-2 text-lg">{totalIntegrations}</strong>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <span className="font-extrabold">حالة الخطة</span>
          <span className="mr-2 font-bold">{isSaving ? 'جارٍ الحفظ...' : 'محفوظة'}</span>
        </div>
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

      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
        <button
          type="button"
          onClick={() => setSelectedFieldId('all')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${selectedFieldId === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'border border-slate-200 bg-white text-slate-700'}`}
        >
          جميع الميادين ({totalTeacherObjectives} هدفاً)
        </button>
        {PE_FIELDS.map((field) => (
          <button
            type="button"
            key={field.id}
            onClick={() => setSelectedFieldId(field.id)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${selectedFieldId === field.id ? 'bg-slate-900 text-white shadow-xs' : 'border border-slate-200 bg-white text-slate-700'}`}
          >
            {field.name}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {filteredFields.map((field) => {
          const domain = plan?.domains.find((item) => item.fieldId === field.fieldId) as
            TeacherLearningPlanData['domains'][number] | undefined;
          if (!domain) return null;
          const objectives = domain.objectives || [];
          const integrationPoints = domain.integrationPoints || [];
          const sequence = sequenceFor(field, { objectives, integrationPoints });
          return (
            <section
              key={field.fieldId}
              className="break-inside-avoid space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs print:break-inside-avoid"
            >
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start">
                <div>
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    الميدان الرسمي: {field.fieldName}
                  </span>
                  <h3 className="mt-2 text-base font-extrabold text-slate-900">
                    {field.finalCompetency}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    المستوى: {currentLevelCurriculum.levelName} · الكفاءة الشاملة محفوظة من المرجع
                    الرسمي
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-blue-600" /> {domain.objectives.length} أهداف ·{' '}
                  {domain.integrationPoints.length} إدماجيات
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    معايير تحقيق الكفاءة
                  </span>
                  <ul className="space-y-1 pt-1 text-xs text-slate-700">
                    {field.criteria.map((criterion, index) => (
                      <li key={index} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                    مؤشرات تحقيق الكفاءة
                  </span>
                  <ul className="space-y-1 pt-1 text-xs text-slate-700">
                    {field.indicators.map((indicator, index) => (
                      <li key={index} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                        <span>{indicator}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {field.pedagogicalNotes && field.pedagogicalNotes.length > 0 && (
                <div className="space-y-1 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900">
                  <span className="flex items-center gap-1 font-bold text-amber-800">
                    <BookOpen className="h-3.5 w-3.5" /> ملاحظات بيداغوجية للميدان
                  </span>
                  <ul className="list-inside list-disc space-y-0.5">
                    {field.pedagogicalNotes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">التسلسل البيداغوجي</h4>
                    <p className="text-[11px] text-slate-500">
                      التقويمات الرسمية ثابتة، وتُدار الأهداف والإدماجيات من طرف الأستاذ.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={(event) => openPrintPreview(event, field.fieldId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                    >
                      <Printer className="h-3.5 w-3.5" /> طباعة المقطع
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewSessionDraft({
                          fieldId: field.fieldId,
                          type: 'تعلمية',
                          text: '',
                          afterObjectiveId: objectives.at(-1)?.id || null,
                        })
                      }
                      className="action-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white"
                    >
                      <Plus className="h-3.5 w-3.5" /> إضافة حصة / إضافة هدف
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {sequence.map((item) => {
                    if (item.kind === 'diagnostic' || item.kind === 'summative')
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <span
                            className={`rounded-lg px-2 py-1 text-[11px] font-black ${item.kind === 'diagnostic' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}
                          >
                            {item.label}
                          </span>
                          <p className="flex-1 text-xs leading-6 text-slate-700">{item.text}</p>
                          <span className="text-[10px] font-bold text-slate-400">مرجع رسمي</span>
                        </div>
                      );
                    const isObjective = item.kind === 'objective';
                    const itemDraft =
                      editingItem?.fieldId === field.fieldId && editingItem.id === item.id
                        ? editingItem.draft
                        : null;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-3 ${isObjective ? 'border-blue-200 bg-blue-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}
                      >
                        <div className="flex flex-wrap items-start gap-2">
                          <span
                            className={`rounded-lg px-2 py-1 text-center text-[11px] font-black ${isObjective ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}
                          >
                            {item.label}
                          </span>
                          {itemDraft ? (
                            <EditFields
                              draft={itemDraft}
                              isIntegration={!isObjective}
                              objectives={objectives}
                              pickerOpen={situationPickerKey === item.id}
                              onChange={updateDraft}
                              onTogglePicker={() =>
                                setSituationPickerKey(
                                  situationPickerKey === item.id ? null : item.id
                                )
                              }
                              suggestions={suitableSituations}
                              onAddSituation={(situation) =>
                                updateDraft({
                                  situations: [
                                    ...itemDraft.situations,
                                    snapshotSituation(situation),
                                  ],
                                })
                              }
                              onRemoveSituation={(id) =>
                                updateDraft({
                                  situations: itemDraft.situations.filter(
                                    (situation) => situation.situationId !== id
                                  ),
                                })
                              }
                              onSave={saveEditing}
                              onCancel={() => {
                                setEditingItem(null);
                                setSituationPickerKey(null);
                              }}
                              saving={isSaving}
                            />
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold leading-6 text-slate-800">
                                  {isObjective
                                    ? item.item.text
                                    : item.item.objective ||
                                      'حصة إدماجية قابلة للتخصيص من طرف الأستاذ.'}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                                  {item.item.learningContent && (
                                    <span className="max-w-full truncate">
                                      محتوى التعلم: {item.item.learningContent}
                                    </span>
                                  )}
                                  <span>المواقف التربوية: {item.item.situations?.length || 0}</span>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1 print:hidden">
                                <button
                                  type="button"
                                  aria-label="تعديل"
                                  title="تعديل"
                                  onClick={() => startEditing(item.kind, field.fieldId, item.item)}
                                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:text-blue-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="تحريك لأعلى"
                                  title="تحريك لأعلى"
                                  disabled={
                                    isSaving ||
                                    (isObjective
                                      ? objectives.findIndex(
                                          (objective) => objective.id === item.id
                                        ) === 0
                                      : integrationPoints.findIndex(
                                          (point) => point.id === item.id
                                        ) === 0)
                                  }
                                  onClick={() =>
                                    savePlan(
                                      isObjective
                                        ? reorderTeacherLearningObjectives(
                                            plan,
                                            field.fieldId,
                                            item.id,
                                            'up'
                                          )
                                        : reorderTeacherLearningIntegrations(
                                            plan,
                                            field.fieldId,
                                            item.id,
                                            'up'
                                          )
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="تحريك لأسفل"
                                  title="تحريك لأسفل"
                                  disabled={
                                    isSaving ||
                                    (isObjective
                                      ? objectives.findIndex(
                                          (objective) => objective.id === item.id
                                        ) ===
                                        objectives.length - 1
                                      : integrationPoints.findIndex(
                                          (point) => point.id === item.id
                                        ) ===
                                        integrationPoints.length - 1)
                                  }
                                  onClick={() =>
                                    savePlan(
                                      isObjective
                                        ? reorderTeacherLearningObjectives(
                                            plan,
                                            field.fieldId,
                                            item.id,
                                            'down'
                                          )
                                        : reorderTeacherLearningIntegrations(
                                            plan,
                                            field.fieldId,
                                            item.id,
                                            'down'
                                          )
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={isObjective ? 'حذف الهدف' : 'حذف الحصة'}
                                  title={isObjective ? 'حذف الهدف' : 'حذف الحصة'}
                                  disabled={isSaving || (isObjective && objectives.length <= 1)}
                                  onClick={() =>
                                    isObjective
                                      ? removeObjective(field.fieldId, item.id)
                                      : removeIntegration(field.fieldId, item.id)
                                  }
                                  className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 disabled:opacity-30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        {!itemDraft && !isObjective && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
                            <span>
                              الموضع:{' '}
                              {item.item.afterObjectiveId
                                ? `بعد الهدف ${objectives.findIndex((objective) => objective.id === item.item.afterObjectiveId) + 1}`
                                : 'قبل أول هدف'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {newSessionDraft?.fieldId === field.fieldId && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 print:hidden">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="text-xs font-bold text-blue-950">
                        نوع الحصة
                        <select
                          value={newSessionDraft.type}
                          onChange={(event) =>
                            setNewSessionDraft({
                              ...newSessionDraft,
                              type: event.target.value as NewSessionDraft['type'],
                            })
                          }
                          className={`${inputClass} mt-1`}
                        >
                          <option value="تعلمية">حصة تعلمية</option>
                          <option value="إدماجية">حصة إدماجية</option>
                        </select>
                      </label>
                      <label className="text-xs font-bold text-blue-950 sm:col-span-2">
                        الهدف / موضوع الحصة
                        <input
                          value={newSessionDraft.text}
                          onChange={(event) =>
                            setNewSessionDraft({ ...newSessionDraft, text: event.target.value })
                          }
                          className={`${inputClass} mt-1`}
                          placeholder="اكتب صياغة الأستاذ..."
                        />
                      </label>
                    </div>
                    {newSessionDraft.type === 'إدماجية' && (
                      <label className="mt-2 block text-xs font-bold text-blue-950">
                        موضع الإدماجية
                        <select
                          value={newSessionDraft.afterObjectiveId || ''}
                          onChange={(event) =>
                            setNewSessionDraft({
                              ...newSessionDraft,
                              afterObjectiveId: event.target.value || null,
                            })
                          }
                          className={`${inputClass} mt-1`}
                        >
                          <option value="">قبل أول هدف</option>
                          {objectives.map((objective, index) => (
                            <option key={objective.id} value={objective.id}>
                              بعد حصة تعلمية {index + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={addSession}
                        disabled={isSaving || !newSessionDraft.text.trim()}
                        className="action-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" /> حفظ الحصة
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSessionDraft(null)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                      >
                        <X className="h-3.5 w-3.5" /> إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <footer className="planning-print-footer hidden border-t border-slate-300 pt-3 text-xs font-bold text-slate-700 print:grid">
        <div>الأستاذ: {`${currentUser.firstName} ${currentUser.lastName}`.trim() || ' '}</div>
        <div className="text-left">المفتش: </div>
      </footer>

      {printModel && (
        <LearningSectionPrintPreviewDialog
          model={printModel}
          dialogRef={printPreviewDialogRef}
          openerRef={printPreviewOpenerRef}
          onClose={closePrintPreview}
        />
      )}
    </div>
  );
};

interface EditFieldsProps {
  draft: EditableDraft;
  isIntegration: boolean;
  objectives: TeacherLearningObjective[];
  pickerOpen: boolean;
  onChange: (changes: Partial<EditableDraft>) => void;
  onTogglePicker: () => void;
  suggestions: ReturnType<typeof findSuitableSituations>;
  onAddSituation: (situation: ReturnType<typeof findSuitableSituations>[number]) => void;
  onRemoveSituation: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const EditFields: React.FC<EditFieldsProps> = ({
  draft,
  isIntegration,
  objectives,
  pickerOpen,
  onChange,
  onTogglePicker,
  suggestions,
  onAddSituation,
  onRemoveSituation,
  onSave,
  onCancel,
  saving,
}) => (
  <div className="min-w-0 flex-1 space-y-2">
    <label className="block text-xs font-bold text-slate-700">
      {isIntegration ? 'عنوان / هدف الإدماج' : 'هدف الحصة / التعلم'}
      <textarea
        value={draft.text}
        onChange={(event) => onChange({ text: event.target.value })}
        rows={2}
        className={`${inputClass} mt-1`}
        placeholder={isIntegration ? 'موضوع الحصة الإدماجية...' : 'الهدف التعليمي...'}
      />
    </label>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="block text-xs font-bold text-slate-700">
        محتوى التعلم
        <textarea
          value={draft.learningContent}
          onChange={(event) => onChange({ learningContent: event.target.value })}
          rows={2}
          className={`${inputClass} mt-1`}
        />
      </label>
      <label className="block text-xs font-bold text-slate-700">
        محتوى الإنجاز
        <textarea
          value={draft.executionContent}
          onChange={(event) => onChange({ executionContent: event.target.value })}
          rows={2}
          className={`${inputClass} mt-1`}
        />
      </label>
      <label className="block text-xs font-bold text-slate-700">
        المواقف التربوية / الموارد
        <input
          value={draft.resources}
          onChange={(event) => onChange({ resources: event.target.value })}
          className={`${inputClass} mt-1`}
          placeholder="افصل الموارد بفاصلة"
        />
      </label>
      <label className="block text-xs font-bold text-slate-700">
        المعارف المجندة
        <textarea
          value={draft.pedagogicalKnowledge}
          onChange={(event) => onChange({ pedagogicalKnowledge: event.target.value })}
          rows={2}
          className={`${inputClass} mt-1`}
        />
      </label>
      <label className="block text-xs font-bold text-slate-700">
        التوجيهات
        <textarea
          value={draft.guidance}
          onChange={(event) => onChange({ guidance: event.target.value })}
          rows={2}
          className={`${inputClass} mt-1`}
        />
      </label>
      <label className="block text-xs font-bold text-slate-700">
        ملاحظات الأستاذ
        <textarea
          value={draft.teacherNotes}
          onChange={(event) => onChange({ teacherNotes: event.target.value })}
          rows={2}
          className={`${inputClass} mt-1`}
        />
      </label>
    </div>
    {isIntegration && (
      <label className="block text-xs font-bold text-slate-700">
        موضع الإدماجية
        <select
          value={draft.afterObjectiveId || ''}
          onChange={(event) => onChange({ afterObjectiveId: event.target.value || null })}
          className={`${inputClass} mt-1`}
        >
          <option value="">قبل أول هدف</option>
          {objectives.map((objective, index) => (
            <option key={objective.id} value={objective.id}>
              بعد حصة تعلمية {index + 1}
            </option>
          ))}
        </select>
      </label>
    )}
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-700">مواقف من بنك الوضعيات المرجعي</span>
        <button
          type="button"
          onClick={onTogglePicker}
          className="rounded-lg border border-blue-200 px-2 py-1 text-[10px] font-bold text-blue-700"
        >
          {pickerOpen ? 'إخفاء المواقف' : 'اختيار موقف'}
        </button>
      </div>
      {draft.situations.length > 0 && (
        <div className="mt-2 space-y-1">
          {draft.situations.map((situation) => (
            <div
              key={situation.situationId}
              className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-700"
            >
              <span>{situation.name}</span>
              <button
                type="button"
                onClick={() => onRemoveSituation(situation.situationId)}
                className="text-rose-600"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}
      {pickerOpen && (
        <div className="mt-2 space-y-1">
          {suggestions.length === 0 ? (
            <p className="text-[10px] text-slate-500">
              لا توجد وضعيات مطابقة لهذا الهدف في البنك المرجعي.
            </p>
          ) : (
            suggestions.slice(0, 6).map((situation) => (
              <button
                type="button"
                key={situation.id}
                onClick={() => onAddSituation(situation)}
                className="block w-full rounded bg-blue-50 px-2 py-1 text-right text-[10px] text-blue-900 hover:bg-blue-100"
              >
                {situation.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !draft.text.trim()}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" /> حفظ
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
      >
        <X className="h-3.5 w-3.5" /> إلغاء
      </button>
    </div>
  </div>
);
