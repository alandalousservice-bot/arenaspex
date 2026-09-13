import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  CircleDot,
  Clock3,
  Dumbbell,
  ImageOff,
  Layers3,
  Search,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { EducationalSituation, KnowledgeItem, User } from '../../types/spex';
import { COMPLETE_ANNUAL_CURRICULUM } from '../../data/algerianCurriculum';
import {
  adaptEducationalSituation,
  adaptLegacyGame,
  isLegacyGameReadModel,
  mergePedagogicalSituationReadModels,
  situationDomainLabel,
  situationDifficultyLabel,
  situationEquipmentLabels,
  situationEquipmentOptions,
  situationLessonTypeLabel,
  situationRelationTypeLabel,
  situationSkillOptions,
  situationVisual,
  teacherFacingSituationSkillOptions,
  SITUATION_DOMAIN_LABELS,
  SITUATION_LESSON_TYPE_LABELS,
  SITUATION_RELATION_LABELS,
} from '../../services/pedagogicalSituationReadModel.service';

export const FIELD_OPTIONS = [
  { id: 'f_locomotion', name: SITUATION_DOMAIN_LABELS.f_locomotion },
  { id: 'f_fundamentals', name: SITUATION_DOMAIN_LABELS.f_fundamentals },
  { id: 'f_structuring', name: SITUATION_DOMAIN_LABELS.f_structuring },
] as const;
const STATUS_LABELS: Record<EducationalSituation['status'], string> = {
  PRIVATE: 'خاص',
  PENDING_APPROVAL: 'بانتظار الاعتماد',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
};

export const LESSON_TYPE_LABELS = SITUATION_LESSON_TYPE_LABELS;

export type SituationDurationFilter = 'all' | 'short' | 'medium' | 'long';

const SituationVisualPreview: React.FC<{ item: EducationalSituation }> = ({ item }) => {
  const visual = situationVisual(item);
  if (visual.kind === 'media') {
    return (
      <img
        src={visual.media.mediaRef}
        alt={`صورة توضيحية: ${item.name}`}
        className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/40"
      />
    );
  }
  if (visual.kind === 'skill-icon') {
    if (visual.iconKey === 'ball')
      return <CircleDot aria-hidden="true" className="h-9 w-9 opacity-80" />;
    if (visual.iconKey === 'running')
      return <Zap aria-hidden="true" className="h-9 w-9 opacity-80" />;
    return <Dumbbell aria-hidden="true" className="h-9 w-9 opacity-80" />;
  }
  if (visual.kind === 'project-icon') {
    if (visual.iconKey === 'fundamentals')
      return <Dumbbell aria-hidden="true" className="h-9 w-9 opacity-80" />;
    if (visual.iconKey === 'structuring')
      return <CircleDot aria-hidden="true" className="h-9 w-9 opacity-80" />;
    return <Activity aria-hidden="true" className="h-9 w-9 opacity-80" />;
  }
  return <ImageOff aria-hidden="true" className="h-9 w-9 opacity-80" />;
};

export function detailText(value: string | string[] | null | undefined): string {
  return Array.isArray(value) ? value.filter(Boolean).join('، ') : value || '';
}

export function situationSkillTags(item: EducationalSituation): string[] {
  return situationSkillOptions(item).map((option) => option.label);
}

export function situationSkillValues(item: EducationalSituation): string[] {
  return situationSkillOptions(item).map((option) => option.value);
}

export function situationSearchText(item: EducationalSituation): string {
  return [
    item.name,
    item.sourceDescription,
    item.sourceGoal,
    item.instructions,
    item.executionConditions,
    item.successCriteria,
    detailText(item.observationIndicators),
    ...item.objectiveTexts,
    ...situationSkillTags(item),
    ...situationEquipmentLabels(item.equipment),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

export function durationBucket(
  minutes?: number | null
): Exclude<SituationDurationFilter, 'all'> | null {
  if (minutes == null || !Number.isFinite(minutes)) return null;
  if (minutes <= 15) return 'short';
  if (minutes <= 45) return 'medium';
  return 'long';
}

export function matchesSituationFilters(
  item: EducationalSituation,
  filters: {
    skill: string;
    lessonType: string;
    relationType?: string;
    equipment: string;
    duration: SituationDurationFilter;
  }
): boolean {
  const skills = situationSkillValues(item);
  const lessonTypes = item.lessonTypes || [];
  const relationTypes = item.relationTypes || [];
  const equipment = item.equipment || [];
  return (
    (!filters.skill || skills.includes(filters.skill)) &&
    (!filters.lessonType || lessonTypes.includes(filters.lessonType)) &&
    (!filters.relationType || relationTypes.some((value) => value === filters.relationType)) &&
    (!filters.equipment || equipment.includes(filters.equipment)) &&
    (filters.duration === 'all' || durationBucket(item.durationMinutes) === filters.duration)
  );
}

export function objectivesFor(grade: number, fieldId: string) {
  const level = COMPLETE_ANNUAL_CURRICULUM[`lvl_p${grade}`];
  const field = level?.fields[fieldId];
  return (field?.sessionsList || []).map((session) => ({
    id: `${fieldId}__${session.sessionNumber}`,
    text: session.objective,
    label: `${session.typeLabel} — ${session.objective}`,
  }));
}

const empty = {
  name: '',
  grade: 1,
  fieldId: 'f_locomotion',
  fieldName: 'الوضعيات والتنقلات',
  objectiveIds: ['f_locomotion__1'],
  objectiveTexts: [objectivesFor(1, 'f_locomotion')[0]?.text || ''],
  sourceGoal: '',
  organization: '',
  equipment: [],
  variations: '',
};
const request = async (url: string, options?: RequestInit) => {
  const response = await fetch(`/api${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'تعذر تنفيذ العملية');
  return body;
};

export const EducationalSituationsBankView: React.FC<{
  currentUser: User;
  embedded?: boolean;
  legacyGames?: KnowledgeItem[];
}> = ({ currentUser, embedded = false, legacyGames = [] }) => {
  const [items, setItems] = useState<EducationalSituation[]>([]);
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState('');
  const [field, setField] = useState('');
  const [objective, setObjective] = useState('');
  const [skill, setSkill] = useState('');
  const [lessonType, setLessonType] = useState('');
  const [relationType, setRelationType] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [duration, setDuration] = useState<SituationDurationFilter>('all');
  const [selected, setSelected] = useState<EducationalSituation | null>(null);
  const [selectedLegacyGame, setSelectedLegacyGame] = useState<KnowledgeItem | null>(null);
  const [draft, setDraft] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const objectiveOptions = useMemo(
    () => objectivesFor(Number(draft.grade) || 1, draft.fieldId),
    [draft.grade, draft.fieldId]
  );
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (grade) params.set('grade', grade);
      if (field) params.set('fieldId', field);
      if (objective) params.set('objective', objective);
      const body = await request(`/educational-situations?${params}`);
      setItems(body.situations);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحميل البنك');
    }
  }, [field, grade, objective]);
  useEffect(() => {
    void load();
  }, [load]);
  const mine = useMemo(
    () => items.filter((item) => item.ownerId === currentUser.id),
    [items, currentUser.id]
  );
  const pending = useMemo(
    () => items.filter((item) => item.status === 'PENDING_APPROVAL'),
    [items]
  );
  const availableSkills = useMemo(() => {
    const legacySources = legacyGames.map((item) => ({
      fieldId: item.fieldId,
      gradeId: item.levelId,
      motorActions: item.targetSkill ? [item.targetSkill] : [],
      pedagogicalTags: item.tags,
      requirements: [],
    }));
    return teacherFacingSituationSkillOptions([...items, ...legacySources]);
  }, [items, legacyGames]);
  const availableLessonTypes = useMemo(
    () =>
      Array.from(new Set(items.flatMap((item) => item.lessonTypes || []))).filter((value) =>
        Boolean(situationLessonTypeLabel(value))
      ),
    [items]
  );
  const availableEquipment = useMemo(
    () =>
      situationEquipmentOptions([
        ...items.flatMap((item) => item.equipment || []),
        ...legacyGames.flatMap((item) => item.equipment || []),
      ]),
    [items, legacyGames]
  );
  const availableRelationTypes = useMemo(
    () =>
      Array.from(new Set(items.flatMap((item) => item.relationTypes || []))).filter((value) =>
        Boolean(situationRelationTypeLabel(value))
      ),
    [items]
  );
  const visibleSituations = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.status === 'APPROVED' || item.ownerId === currentUser.id) &&
          (!q.trim() || situationSearchText(item).includes(q.trim().toLocaleLowerCase())) &&
          matchesSituationFilters(item, {
            skill,
            lessonType,
            relationType,
            equipment: equipmentFilter,
            duration,
          })
      ),
    [currentUser.id, duration, equipmentFilter, items, lessonType, q, relationType, skill]
  );
  const visibleLegacyGames = useMemo(() => {
    const query = q.trim().toLocaleLowerCase();
    const filtered = legacyGames.filter((item) => {
      const levels = item.levelIds?.length ? item.levelIds : item.levelId ? [item.levelId] : [];
      const gradeMatches = !grade || levels.includes(`lvl_p${grade}`);
      const fieldMatches = !field || item.fieldId === field;
      const text =
        `${item.title} ${item.description} ${item.objectiveText || ''} ${item.targetSkill || ''} ${item.tags.join(' ')} ${(item.equipment || []).join(' ')}`.toLocaleLowerCase();
      const queryMatches = !query || text.includes(query);
      const objectiveMatches = !objective || text.includes(objective.toLocaleLowerCase());
      const skillMatches =
        !skill ||
        situationSkillOptions({
          fieldId: item.fieldId,
          gradeId: item.levelId,
          motorActions: item.targetSkill ? [item.targetSkill] : [],
          pedagogicalTags: item.tags,
          requirements: [],
        }).some((option) => option.value === skill);
      const equipmentMatches = !equipmentFilter || (item.equipment || []).includes(equipmentFilter);
      const relationMatches = !relationType;
      return (
        (item.approved || item.ownerId === currentUser.id) &&
        gradeMatches &&
        fieldMatches &&
        queryMatches &&
        objectiveMatches &&
        skillMatches &&
        relationMatches &&
        equipmentMatches
      );
    });
    const canonicalReadModels = items.map(adaptEducationalSituation);
    const legacyReadModels = filtered.map(adaptLegacyGame);
    const merged = mergePedagogicalSituationReadModels(canonicalReadModels, legacyReadModels);
    const allowedLegacyIds = new Set(
      merged.filter(isLegacyGameReadModel).map((item) => item.sourceId)
    );
    return filtered.filter((item) => allowedLegacyIds.has(item.id));
  }, [
    currentUser.id,
    equipmentFilter,
    field,
    grade,
    items,
    legacyGames,
    objective,
    q,
    relationType,
    skill,
  ]);
  const reviewer = currentUser.role === 'admin' || currentUser.role === 'inspector';
  const save = async () => {
    try {
      const selectedField = FIELD_OPTIONS.find((field) => field.id === draft.fieldId);
      const payload = {
        ...draft,
        grade: Number(draft.grade),
        fieldName: selectedField?.name || '',
        objectiveIds: draft.objectiveIds.filter(Boolean),
        objectiveTexts: draft.objectiveTexts.filter(Boolean),
        equipment: String(draft.equipment || '')
          .split(/[،,]/)
          .map((x: string) => x.trim())
          .filter(Boolean),
      };
      await request(
        editingId ? `/educational-situations/${editingId}` : '/educational-situations',
        { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) }
      );
      setDraft(empty);
      setEditingId(null);
      setMessage(editingId ? 'تم تعديل الموقف الخاص.' : 'تم حفظ الموقف الخاص.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر الحفظ');
    }
  };
  const edit = (item: EducationalSituation) => {
    setEditingId(item.id);
    setDraft({
      ...item,
      equipment: item.equipment.join('، '),
      objectiveTexts: item.objectiveTexts.length ? item.objectiveTexts : [''],
    });
  };
  const remove = async (id: string) => {
    if (!window.confirm('حذف هذا الموقف الخاص؟')) return;
    try {
      await request(`/educational-situations/${id}`, { method: 'DELETE' });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر الحذف');
    }
  };
  const submit = async (id: string) => {
    await request(`/educational-situations/${id}/submit`, { method: 'POST' });
    await load();
  };
  const review = async (id: string, action: 'approve' | 'reject') => {
    const rejectionReason = action === 'reject' ? window.prompt('سبب الرفض (إلزامي):') || '' : '';
    try {
      await request(`/educational-situations/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, rejectionReason }),
      });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر المراجعة');
    }
  };
  const closeDetails = useCallback(() => {
    setSelected(null);
    setSelectedLegacyGame(null);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }, []);
  useEffect(() => {
    if (!selected && !selectedLegacyGame) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    (focusable()[0] || dialog).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetails();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeDetails, selected, selectedLegacyGame]);
  const selectedVisual = selected ? situationVisual(selected) : null;
  return (
    <div className="space-y-5" dir="rtl">
      <div className="rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-extrabold">
          {embedded ? 'المواقف التربوية' : 'بنك المواقف التربوية'}
        </h2>
        <p className="text-xs text-slate-500">
          المواقف العامة ومواقفك الخاصة المرتبطة بالأهداف التعليمية، بما فيها الألعاب التربوية
          المحفوظة سابقًا.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              aria-label="البحث في بنك المواقف"
              placeholder="ابحث في بنك المواقف"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border p-2 pr-9"
            />
          </label>
          <select
            aria-label="تصفية حسب المستوى"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option value="">كل المستويات</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب الميدان"
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option value="">كل الميادين</option>
            {FIELD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <input
            aria-label="تصفية حسب الهدف التعليمي"
            placeholder="الهدف التعليمي المطابق"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="rounded-xl border p-2"
          />
          <select
            aria-label="تصفية حسب المهارة أو المتطلب"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option value="">كل المهارات والمتطلبات</option>
            {availableSkills.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب نوع الحصة"
            value={lessonType}
            onChange={(e) => setLessonType(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option value="">كل أنواع الحصص</option>
            {availableLessonTypes.map((value) => (
              <option key={value} value={value}>
                {LESSON_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب علاقة الموقف بالهدف"
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option value="">كل علاقات الأهداف</option>
            {availableRelationTypes.map((value) => (
              <option key={value} value={value}>
                {SITUATION_RELATION_LABELS[value]}
              </option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب الوسائل"
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option value="">كل الوسائل</option>
            {availableEquipment.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب المدة"
            value={duration}
            onChange={(e) => setDuration(e.target.value as SituationDurationFilter)}
            className="rounded-xl border p-2"
          >
            <option value="all">كل المدد</option>
            <option value="short">قصيرة · حتى 15 دقيقة</option>
            <option value="medium">متوسطة · 16–45 دقيقة</option>
            <option value="long">طويلة · أكثر من 45 دقيقة</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {visibleSituations.length + visibleLegacyGames.length} نتيجة
          </span>
          <span>المكتبة تعرض مواقف بصرية قابلة للتصفح، دون تغيير مصدر البيانات أو الاعتماد.</span>
        </div>
      </div>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm">{message}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleLegacyGames.map((item) => (
          <div
            key={`legacy-game-${item.id}`}
            className="group overflow-hidden rounded-2xl border border-indigo-100 bg-white text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="bg-gradient-to-br from-indigo-600 to-sky-500 p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <Layers3 className="h-9 w-9 opacity-80" />
                <span className="rounded-lg bg-white/20 px-2 py-1 text-[10px] font-bold">
                  موقف محفوظ سابقًا
                </span>
              </div>
              <strong className="mt-4 block text-lg">{item.title}</strong>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500">
                {item.levelName || 'مرجع متعدد السنوات'} —{' '}
                {situationDomainLabel(item.fieldId, item.fieldName) || 'الميدان العام'}
              </p>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
              <button
                onClick={(event) => {
                  openerRef.current = event.currentTarget;
                  setSelectedLegacyGame(item);
                }}
                aria-label={`فتح تفاصيل الموقف ${item.title}`}
                className="mt-4 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
              >
                فتح التفاصيل
              </button>
            </div>
          </div>
        ))}
        {visibleSituations.map((item) => (
          <div
            key={item.id}
            className="group overflow-hidden rounded-2xl border bg-white text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <button
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setSelected(item);
              }}
              aria-label={`فتح تفاصيل الموقف ${item.name}`}
              className="w-full text-right"
            >
              <div className="bg-gradient-to-br from-emerald-700 to-teal-500 p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <SituationVisualPreview item={item} />
                  <div className="flex flex-wrap justify-end gap-1 text-[10px] font-bold">
                    <span className="rounded-lg bg-white/20 px-2 py-1">
                      {situationLessonTypeLabel(item.lessonTypes?.[0] || '') || 'موقف تطبيقي'}
                    </span>
                    {item.status === 'APPROVED' && (
                      <span className="rounded-lg bg-emerald-950/30 px-2 py-1">معتمد</span>
                    )}
                    {item.relationTypes
                      ?.map((value) => situationRelationTypeLabel(value))
                      .filter(Boolean)
                      .map((label) => (
                        <span key={label} className="rounded-lg bg-white/20 px-2 py-1">
                          {label}
                        </span>
                      ))}
                  </div>
                </div>
                <strong className="mt-4 block text-lg">{item.name}</strong>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">السنة {item.grade}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    {situationDomainLabel(item.fieldId, item.fieldName) || 'الميدان غير محدد'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    <Clock3 className="ml-1 inline h-3 w-3" />
                    {item.durationMinutes ? `${item.durationMinutes} دقيقة` : 'المدة غير محددة'}
                  </span>
                  {situationDifficultyLabel(item.difficulty) && (
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      الصعوبة: {situationDifficultyLabel(item.difficulty)}
                    </span>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-slate-600">
                  {item.sourceGoal || item.executionConditions || 'موقف تربوي مرتبط بهدف تعلّمي.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {situationSkillTags(item)
                    .slice(0, 3)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
                {situationEquipmentLabels(item.equipment).length > 0 && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    الوسائل: {situationEquipmentLabels(item.equipment).slice(0, 3).join('، ')}
                  </p>
                )}
                {adaptEducationalSituation(item).provenance.label && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    المصدر: {adaptEducationalSituation(item).provenance.label}
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  فتح التفاصيل <Target className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
            {item.ownerId === currentUser.id && (
              <>
                <span className="mt-2 inline-block text-xs font-bold text-blue-700">
                  {STATUS_LABELS[item.status]}
                  {item.rejectionReason ? ` — ${item.rejectionReason}` : ''}
                </span>
                {['PRIVATE', 'REJECTED'].includes(item.status) && (
                  <span className="mr-2">
                    <button
                      onClick={() => edit(item)}
                      aria-label={`تعديل الموقف ${item.name}`}
                      className="rounded-lg border px-2 py-1 text-xs"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => void remove(item.id)}
                      aria-label={`حذف الموقف ${item.name}`}
                      className="mr-1 rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700"
                    >
                      حذف
                    </button>
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {!visibleSituations.length && !visibleLegacyGames.length && (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">
          لا توجد مواقف مطابقة للفلاتر الحالية. جرّب توسيع البحث أو إعادة ضبط أحد الفلاتر.
        </div>
      )}
      {currentUser.role === 'teacher' && (
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="font-extrabold">{editingId ? 'تعديل موقف تربوي' : 'إضافة موقف تربوي'}</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              placeholder="اسم الموقف"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="rounded-xl border p-2"
            />
            <select
              value={draft.grade}
              onChange={(e) => {
                const nextGrade = Number(e.target.value);
                const options = objectivesFor(nextGrade, draft.fieldId);
                setDraft({
                  ...draft,
                  grade: nextGrade,
                  objectiveIds: options[0] ? [options[0].id] : [],
                  objectiveTexts: options[0] ? [options[0].text] : [],
                });
              }}
              className="rounded-xl border p-2"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  السنة{' '}
                  {value === 1
                    ? 'الأولى'
                    : value === 2
                      ? 'الثانية'
                      : value === 3
                        ? 'الثالثة'
                        : value === 4
                          ? 'الرابعة'
                          : 'الخامسة'}
                </option>
              ))}
            </select>
            <select
              value={draft.fieldId}
              onChange={(e) => {
                const nextField = e.target.value;
                const options = objectivesFor(Number(draft.grade) || 1, nextField);
                setDraft({
                  ...draft,
                  fieldId: nextField,
                  fieldName: FIELD_OPTIONS.find((field) => field.id === nextField)?.name || '',
                  objectiveIds: options[0] ? [options[0].id] : [],
                  objectiveTexts: options[0] ? [options[0].text] : [],
                });
              }}
              className="rounded-xl border p-2"
            >
              {FIELD_OPTIONS.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
            <select
              value={draft.objectiveIds[0] || ''}
              onChange={(e) => {
                const option = objectiveOptions.find((item) => item.id === e.target.value);
                setDraft({
                  ...draft,
                  objectiveIds: option ? [option.id] : [],
                  objectiveTexts: option ? [option.text] : [],
                });
              }}
              className="rounded-xl border p-2 md:col-span-2"
            >
              <option value="">اختر الهدف التعلمي</option>
              {objectiveOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {['sourceGoal', 'organization', 'variations'].map((key) => (
              <input
                key={key}
                placeholder={
                  key === 'name' ? 'اسم الموقف' : key === 'organization' ? 'التنظيم/الإنجاز' : key
                }
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                className="rounded-xl border p-2"
              />
            ))}
            <input
              placeholder="الوسائل"
              value={draft.equipment}
              onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}
              className="rounded-xl border p-2"
            />
          </div>
          <button
            onClick={save}
            className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            {editingId ? 'حفظ التعديل' : 'حفظ كموقف خاص'}
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setDraft(empty);
              }}
              className="mr-2 mt-3 rounded-xl border px-3 py-2 text-sm"
            >
              إلغاء
            </button>
          )}
          {mine
            .filter((item) => ['PRIVATE', 'REJECTED'].includes(item.status))
            .map((item) => (
              <button
                key={item.id}
                onClick={() => void submit(item.id)}
                className="mr-2 mt-3 rounded-xl border border-blue-300 px-3 py-2 text-xs font-bold"
              >
                إرسال إلى بنك المواقف: {item.name}
              </button>
            ))}
        </section>
      )}
      {reviewer && (
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="font-extrabold">مواقف بانتظار الاعتماد</h3>
          {pending.map((item) => (
            <div
              key={item.id}
              className="mt-3 flex items-center justify-between rounded-xl border p-3"
            >
              <span>
                {item.name} — السنة {item.grade} — {item.objectiveTexts.join('، ')}
              </span>
              <span>
                <button
                  onClick={() => void review(item.id, 'approve')}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
                >
                  اعتماد
                </button>
                <button
                  onClick={() => void review(item.id, 'reject')}
                  className="mr-2 rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                >
                  رفض
                </button>
              </span>
            </div>
          ))}
        </section>
      )}
      {(selected || selectedLegacyGame) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="educational-situation-details-title"
            aria-describedby="educational-situation-details-content"
            tabIndex={-1}
            ref={dialogRef}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b pb-4">
              <div>
                <p className="text-xs font-bold text-emerald-700">مكتبة المواقف التربوية</p>
                <h3
                  id="educational-situation-details-title"
                  className="mt-1 text-xl font-extrabold text-slate-900"
                >
                  {selected?.name || selectedLegacyGame?.title}
                </h3>
              </div>
              <button
                aria-label="إغلاق التفاصيل"
                onClick={closeDetails}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selected ? (
              <div id="educational-situation-details-content" className="mt-4 space-y-4">
                {selectedVisual?.kind === 'media' && (
                  <img
                    src={selectedVisual.media.mediaRef}
                    alt={`صورة توضيحية: ${selected.name}`}
                    className="max-h-56 w-full rounded-xl object-contain bg-slate-50"
                  />
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-sm">
                    <BookOpen className="mb-1 h-4 w-4 text-emerald-700" />
                    <strong>المستوى</strong>
                    <p>{selected.grade}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm">
                    <Layers3 className="mb-1 h-4 w-4 text-emerald-700" />
                    <strong>الميدان</strong>
                    <p>
                      {situationDomainLabel(selected.fieldId, selected.fieldName) ||
                        'الميدان غير محدد'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm">
                    <Clock3 className="mb-1 h-4 w-4 text-emerald-700" />
                    <strong>المدة</strong>
                    <p>
                      {selected.durationMinutes ? `${selected.durationMinutes} دقيقة` : 'غير محددة'}
                    </p>
                  </div>
                  {situationDifficultyLabel(selected.difficulty) && (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm">
                      <strong>الصعوبة</strong>
                      <p>{situationDifficultyLabel(selected.difficulty)}</p>
                    </div>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ['الهدف / الغاية', selected.sourceGoal],
                    ['الفكرة العامة', selected.sourceDescription],
                    ['الأهداف المرتبطة', selected.objectiveTexts.join('، ')],
                    ['التنظيم', selected.organization],
                    ['الوسائل', situationEquipmentLabels(selected.equipment).join('، ')],
                    ['كيف يتم الإنجاز؟ (شروط الإنجاز)', selected.executionConditions],
                    ['مؤشرات الملاحظة', detailText(selected.observationIndicators)],
                    ['شروط النجاح (معيار النجاح)', selected.successCriteria],
                    ['ماذا يقول الأستاذ؟', selected.instructions],
                    ['التنويعات', selected.variations],
                    ['المهارات والإجراءات', situationSkillTags(selected).join('، ')],
                  ].map(([label, value]) =>
                    value ? (
                      <div key={label} className="rounded-xl border border-slate-100 p-3 text-sm">
                        <strong className="text-slate-700">{label}</strong>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-600">
                          {value}
                        </p>
                      </div>
                    ) : null
                  )}
                </div>
                {!!selected.lessonTypes?.length && (
                  <div className="rounded-xl bg-emerald-50 p-3 text-sm">
                    <strong>أنواع الحصص المناسبة:</strong>{' '}
                    {selected.lessonTypes
                      .map((value) => situationLessonTypeLabel(value))
                      .filter(Boolean)
                      .join('، ')}
                  </div>
                )}
                {!!selected.relationTypes?.length && (
                  <div className="rounded-xl bg-indigo-50 p-3 text-sm">
                    <strong>علاقة الموقف بالأهداف:</strong>{' '}
                    {selected.relationTypes
                      .map((value) => situationRelationTypeLabel(value))
                      .filter(Boolean)
                      .join('، ')}
                  </div>
                )}
                {adaptEducationalSituation(selected).provenance.label && (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm">
                    <strong>المصدر:</strong> {adaptEducationalSituation(selected).provenance.label}
                  </div>
                )}
                {!!selected.pedagogicalTags?.length && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selected.pedagogicalTags
                      .map((tag) =>
                        situationSkillOptions(selected).find((option) => option.value === tag)
                      )
                      .filter(Boolean)
                      .map((option) => (
                        <span key={option!.value} className="rounded-full bg-slate-100 px-3 py-1">
                          #{option!.label}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ) : selectedLegacyGame ? (
              <div id="educational-situation-details-content" className="mt-4 space-y-4 text-sm">
                <div className="rounded-xl bg-indigo-50 p-4">
                  <strong>الوصف</strong>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedLegacyGame.description}
                  </p>
                </div>
                {[
                  ['طريقة التنفيذ والقواعد', selectedLegacyGame.rules],
                  ['التنظيم', selectedLegacyGame.organization],
                  ['الهدف التربوي', selectedLegacyGame.pedagogicalPurpose],
                  ['إرشادات السلامة', selectedLegacyGame.safetyGuidance],
                  ['التدرج', selectedLegacyGame.progression],
                  ['الوسائل', situationEquipmentLabels(selectedLegacyGame.equipment).join('، ')],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label} className="rounded-xl border border-slate-100 p-3">
                      <strong>{label}</strong>
                      <p className="mt-1 whitespace-pre-wrap text-slate-600">{value}</p>
                    </div>
                  ) : null
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
