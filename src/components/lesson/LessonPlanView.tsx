import React, { useEffect, useMemo, useState } from 'react';
import { FileText, PenSquare, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { LessonPlan, LessonPlanRow, User } from '../../types/spex';
import { COMPLETE_ANNUAL_CURRICULUM } from '../../data/algerianCurriculum';
import { autoGenerateLessonPlan, getUnifiedLessonRows } from '../../services/lessonPlan.generator.service';
import { exportLessonPlanToPdf, exportLessonPlanToWord } from '../../services/lessonPlanExport.service';
import { findSuitableSituations, referenceSituations, snapshotSituation } from '../../services/educationalSituation.selector.service';

interface LessonPlanViewProps {
  lessonPlans: LessonPlan[];
  activeLessonId?: string;
  onSaveLessonPlan: (lesson: LessonPlan) => void;
  onDeleteLessonPlan?: (lessonId: string) => void;
  onUpdateLessonStatus?: (lessonId: string, status: 'منجزة' | 'مؤجلة' | 'غير منجزة', note?: string) => void;
  onOpenCommandCenterForPlan?: (plan: LessonPlan) => void;
  currentUser?: User;
}

const LEVEL_KEYS: Record<string, string> = {
  'السنة الأولى ابتدائي': 'lvl_p1', 'السنة الثانية ابتدائي': 'lvl_p2', 'السنة الثالثة ابتدائي': 'lvl_p3',
  'السنة الرابعة ابتدائي': 'lvl_p4', 'السنة الخامسة ابتدائي': 'lvl_p5'
};
const LEVELS = Object.keys(LEVEL_KEYS);

type SourceSession = Parameters<typeof autoGenerateLessonPlan>[0];

function sessionsForLevel(levelName: string): SourceSession[] {
  const level = COMPLETE_ANNUAL_CURRICULUM[LEVEL_KEYS[levelName]];
  if (!level) return [];
  let globalNumber = 0;
  return Object.values(level.fields).flatMap((field) => field.sessionsList.map((session) => ({
    fieldId: field.fieldId, fieldName: field.fieldName, finalCompetency: field.finalCompetency,
    segmentGoal: field.finalCompetency, sessionNumber: session.sessionNumber, globalNumber: ++globalNumber,
    weekNumber: globalNumber, type: session.type as LessonPlan['sessionType'], typeLabel: session.typeLabel,
    objective: session.objective, tools: field.suggestedTools || []
  })));
}

const editableRow = (row: LessonPlanRow, key: keyof LessonPlanRow, value: string | number): LessonPlanRow => ({ ...row, [key]: value });

export const LessonPlanView: React.FC<LessonPlanViewProps> = ({ lessonPlans, activeLessonId, onSaveLessonPlan, onDeleteLessonPlan, currentUser }) => {
  const [selectedId, setSelectedId] = useState(activeLessonId || lessonPlans[0]?.id || '');
  const [showGenerator, setShowGenerator] = useState(false);
  const [levelName, setLevelName] = useState(LEVELS[0]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [draft, setDraft] = useState<LessonPlan | null>(null);
  const sessions = useMemo(() => sessionsForLevel(levelName), [levelName]);
  const selected = lessonPlans.find((plan) => plan.id === selectedId) || lessonPlans[0];

  useEffect(() => { setSessionIndex(0); }, [levelName]);
  useEffect(() => { if (activeLessonId) setSelectedId(activeLessonId); }, [activeLessonId]);

  const createPlan = () => {
    const source = sessions[sessionIndex];
    if (!source) return;
    const plan = autoGenerateLessonPlan(source, { levelName, teacher: currentUser, className: '' });
    onSaveLessonPlan(plan);
    setSelectedId(plan.id);
    setShowGenerator(false);
  };

  const beginEdit = () => {
    if (!selected) return;
    setDraft({ ...selected, lessonRows: getUnifiedLessonRows(selected).map((row) => ({ ...row })), equipmentNeeded: [...selected.equipmentNeeded] });
    setEditing(true);
  };
  const saveEdit = () => {
    if (!draft) return;
    const equipmentNeeded = [...new Set(draft.equipmentNeeded.map((item) => item.trim()).filter(Boolean))];
    onSaveLessonPlan({ ...draft, equipmentNeeded, equipmentChecklist: equipmentNeeded.map((name) => ({ name, available: true })), version: Math.max(draft.version || 1, 2) });
    setEditing(false);
    setDraft(null);
  };

  const plan = editing ? draft : selected;
  if (!plan) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="font-bold text-slate-600">لا توجد مذكرات بعد.</p><button className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white" onClick={() => setShowGenerator(true)}>توليد مذكرة من التوزيع السنوي</button>{showGenerator && null}</div>;
  }
  const rows = editing ? (draft?.lessonRows || []) : getUnifiedLessonRows(plan);
  const setRows = (lessonRows: LessonPlanRow[]) => setDraft((previous) => previous && ({ ...previous, lessonRows }));
  const grade = LEVELS.indexOf(plan.levelName) + 1;
  const matchingSituations = findSuitableSituations(referenceSituations, { grade, fieldId: plan.fieldName.includes('') ? (sessionsForLevel(plan.levelName).find((s) => s.fieldName === plan.fieldName)?.fieldId || '') : '', objectiveText: plan.sessionTitle });
  const addSituation = (situation: typeof referenceSituations[number]) => { const main = { id: `main-${Date.now()}`, phase: 'المرحلة الرئيسية' as const, learningContent: plan.sessionTitle, executionContent: `${situation.name}: ${situation.organization}`, durationMinutes: 20, guidance: situation.variations || 'احترام التعليمات.', situationSnapshot: snapshotSituation(situation) }; const next = [...rows.filter((row) => row.phase !== 'المرحلة الرئيسية'), main]; const equipmentNeeded = [...new Set([...plan.equipmentNeeded, ...situation.equipment])]; onSaveLessonPlan({ ...plan, lessonRows: next, equipmentNeeded }); setShowBank(false); };

  return <div className="space-y-5" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div><h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><FileText className="h-5 w-5 text-blue-600" />مذكرة الحصة</h2><p className="mt-1 text-xs text-slate-500">قالب موحد مستمد من الحصة المحددة في التوزيع السنوي.</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowGenerator(true)} className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />توليد مذكرة</button>
        {!editing && <><button onClick={beginEdit} className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"><PenSquare className="h-4 w-4" />تعديل</button><button onClick={() => exportLessonPlanToPdf(plan)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"><Printer className="ml-1 inline h-4 w-4" />طباعة</button><button onClick={() => exportLessonPlanToWord(plan)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">Word</button></>}
        {!editing && <button onClick={() => setShowBank(true)} className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-bold text-blue-800">اختيار من بنك المواقف</button>}
        {editing && <><button onClick={saveEdit} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" />حفظ</button><button onClick={() => { setEditing(false); setDraft(null); }} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">إلغاء</button></>}
        {!editing && onDeleteLessonPlan && <button onClick={() => onDeleteLessonPlan(plan.id)} className="rounded-xl border border-rose-200 p-2 text-rose-700" title="حذف المذكرة"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </div>

    {!editing && lessonPlans.length > 1 && <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold">{lessonPlans.map((item) => <option key={item.id} value={item.id}>الحصة {item.sessionGlobalNumber || '—'} — {item.sessionTitle}</option>)}</select>}

    <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-300 bg-slate-50 px-5 py-3 text-center font-extrabold text-slate-900">مذكرة الحصة</div>
      <div className="grid grid-cols-1 gap-px bg-slate-300 text-sm md:grid-cols-2">
        {[
          ['المؤسسة', plan.institutionName], ['المستوى', plan.levelName], ['الكفاءة الختامية', plan.competencyTitle], ['الميدان', plan.fieldName],
          ['الهدف التعليمي', plan.sessionTitle], ['الأستاذ', plan.teacherName], ['المدة', `${plan.durationMinutes} دقيقة`], ['رقم الحصة', String(plan.sessionGlobalNumber || '—')], ['الوسائل', plan.equipmentNeeded.join('، ')]
        ].map(([label, value]) => <div key={label} className="grid grid-cols-[9rem_1fr] bg-white"><strong className="bg-slate-50 p-3 text-slate-800">{label}</strong>{editing && (label === 'الهدف التعليمي' || label === 'الوسائل') ? <input value={label === 'الهدف التعليمي' ? draft?.sessionTitle : draft?.equipmentNeeded.join('، ')} onChange={(event) => setDraft((previous) => previous && (label === 'الهدف التعليمي' ? { ...previous, sessionTitle: event.target.value, generalObjective: event.target.value } : { ...previous, equipmentNeeded: event.target.value.split(/[,،]/) }))} className="min-w-0 p-3 outline-none" /> : <span className="p-3">{value || '—'}</span>}</div>)}
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-right text-sm"><thead><tr className="bg-slate-800 text-white"><th className="border border-slate-500 p-3">المراحل</th><th className="border border-slate-500 p-3">محتوى التعلم</th><th className="border border-slate-500 p-3">محتوى الإنجاز</th><th className="border border-slate-500 p-3">الوقت</th><th className="border border-slate-500 p-3">التوجيهات</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id} className="align-top"><th className="border border-slate-300 bg-slate-50 p-3 font-bold">{row.phase}</th>{editing ? <><td className="border border-slate-300 p-1"><textarea value={row.learningContent} onChange={(event) => setRows(rows.map((item, i) => i === index ? editableRow(item, 'learningContent', event.target.value) : item))} className="min-h-24 w-full resize-y p-2 outline-none" /></td><td className="border border-slate-300 p-1"><textarea value={row.executionContent} onChange={(event) => setRows(rows.map((item, i) => i === index ? editableRow(item, 'executionContent', event.target.value) : item))} className="min-h-24 w-full resize-y p-2 outline-none" /></td><td className="border border-slate-300 p-1"><input type="number" min="1" value={row.durationMinutes} onChange={(event) => setRows(rows.map((item, i) => i === index ? editableRow(item, 'durationMinutes', Number(event.target.value)) : item))} className="w-20 p-2 outline-none" /></td><td className="border border-slate-300 p-1"><textarea value={row.guidance} onChange={(event) => setRows(rows.map((item, i) => i === index ? editableRow(item, 'guidance', event.target.value) : item))} className="min-h-24 w-full resize-y p-2 outline-none" /></td></> : <><td className="border border-slate-300 p-3 whitespace-pre-line">{row.learningContent}</td><td className="border border-slate-300 p-3 whitespace-pre-line">{row.executionContent}{row.illustrationUrl && <img src={row.illustrationUrl} alt="رسم توضيحي للموقف" className="mt-3 max-h-40 rounded" />}</td><td className="border border-slate-300 p-3 font-bold">{row.durationMinutes} د</td><td className="border border-slate-300 p-3 whitespace-pre-line">{row.guidance}</td></>}</tr>)}</tbody></table></div>
    </article>
    <p className="text-xs text-slate-500">مجموع الزمن: {rows.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0)} دقيقة.</p>

    {showGenerator && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h3 className="font-extrabold">توليد مذكرة من التوزيع السنوي</h3><button onClick={() => setShowGenerator(false)}><X className="h-5 w-5" /></button></div><label className="mb-1 block text-sm font-bold">المستوى</label><select value={levelName} onChange={(event) => setLevelName(event.target.value)} className="mb-4 w-full rounded-xl border p-2">{LEVELS.map((level) => <option key={level}>{level}</option>)}</select><label className="mb-1 block text-sm font-bold">الحصة</label><select value={sessionIndex} onChange={(event) => setSessionIndex(Number(event.target.value))} className="w-full rounded-xl border p-2">{sessions.map((session, index) => <option key={`${session.fieldId}-${session.sessionNumber}`} value={index}>الحصة {session.globalNumber}: {session.objective}</option>)}</select><p className="mt-3 text-xs text-slate-500">يُؤخذ الهدف والكفاءة والميدان والوسائل من الحصة الحالية؛ يمكن تعديل المذكرة بعد توليدها.</p><button onClick={createPlan} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">إنشاء المذكرة</button></div></div>}
    {showBank && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"><div className="flex justify-between"><h3 className="font-extrabold">بنك المواقف التربوية المطابقة للهدف</h3><button onClick={() => setShowBank(false)}>✕</button></div>{matchingSituations.length ? matchingSituations.map((situation) => <div key={situation.id} className="mt-3 rounded-xl border p-3"><strong>{situation.name}</strong><p className="mt-1 text-xs">{situation.organization}</p><p className="mt-1 text-xs text-slate-500">{situation.equipment.join('، ')}</p><button onClick={() => addSituation(situation)} className="mt-2 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white">اختيار</button></div>) : <p className="mt-4 text-sm text-slate-500">لا يوجد موقف بنكي مطابق؛ تبقى المذكرة على مسودة fallback المحلية.</p>}</div></div>}
  </div>;
};
