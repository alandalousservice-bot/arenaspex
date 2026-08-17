/**
 * SPEX - Lesson Plan View & Generator Component
 * مذكرة الحصة البيداغوجية لمادة التربية البدنية والرياضية والتوليد بالذكاء الاصطناعي
 * المربوطة بالتوزيع السنوي والهدف التعلمي للمقطع البيداغوجي
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Printer,
  Clock,
  RefreshCw,
  Target,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  List,
  Trash2,
  ChevronDown,
  ChevronUp,
  BookMarked,
  Filter,
  Check,
  PenSquare,
  Zap
} from 'lucide-react';
import { LessonPlan, User } from '../../types/spex';
import { requestAILessonPlan, requestAIImproveWording } from '../../services/api';
import { exportLessonPlanToWord, exportLessonPlanToPdf } from '../../services/lessonPlanExport.service';
import { autoGenerateLessonPlan } from '../../services/lessonPlan.generator.service';
import { COMPLETE_ANNUAL_CURRICULUM } from '../../data/algerianCurriculum';

interface LessonPlanViewProps {
  lessonPlans: LessonPlan[];
  activeLessonId?: string;
  onSaveLessonPlan: (lesson: LessonPlan) => void;
  onDeleteLessonPlan?: (lessonId: string) => void;
  onUpdateLessonStatus?: (lessonId: string, status: 'منجزة' | 'مؤجلة' | 'غير منجزة', note?: string) => void;
  onOpenCommandCenterForPlan?: (plan: LessonPlan) => void;
  currentUser?: User;
}

const LEVEL_KEY_MAP: Record<string, string> = {
  'السنة الأولى ابتدائي': 'lvl_p1',
  'السنة الثانية ابتدائي': 'lvl_p2',
  'السنة الثالثة ابتدائي': 'lvl_p3',
  'السنة الرابعة ابتدائي': 'lvl_p4',
  'السنة الخامسة ابتدائي': 'lvl_p5'
};

const FIELD_SEGMENT_GOALS: Record<string, string> = {
  'f_locomotion': 'التحكم في الوضعيات والتنقلات وتطوير الوعي بالجسم والتوازن والتوجه المكاني أثناء الأنشطة الحركية.',
  'f_fundamentals': 'توظيف الحركات القاعدية الأساسية (الجري السريع، القفز والرمي) وتنسيقها في مسارات وألعاب شبه رياضية.',
  'f_structuring': 'بناء وتنظيم النشاط الجماعي والاحتكاك الإيجابي والتكيف مع القواعد وتوزيع الأدوار داخل الفريق.'
};

export const LessonPlanView: React.FC<LessonPlanViewProps> = ({
  lessonPlans,
  activeLessonId,
  onSaveLessonPlan,
  onDeleteLessonPlan,
  onUpdateLessonStatus,
  onOpenCommandCenterForPlan,
  currentUser
}) => {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    activeLessonId || lessonPlans[0]?.id || ''
  );

  // Collapsible cards state: track expanded/collapsed state for each lesson plan
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (activeLessonId) initial[activeLessonId] = true;
    else if (lessonPlans[0]) initial[lessonPlans[0].id] = true;
    return initial;
  });

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [editingObjectivesId, setEditingObjectivesId] = useState<string | null>(null);
  const [objectivesDraft, setObjectivesDraft] = useState<{
    generalObjective: string;
    motor: string;
    cognitive: string;
    communication: string;
    personalSocial: string;
  } | null>(null);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandAll = () => {
    const isAnyCollapsed = lessonPlans.some((lp) => !expandedMap[lp.id]);
    const nextMap: Record<string, boolean> = {};
    lessonPlans.forEach((lp) => {
      nextMap[lp.id] = isAnyCollapsed;
    });
    setExpandedMap(nextMap);
  };

  const handleSetStatus = (
    lpId: string,
    status: 'منجزة' | 'مؤجلة' | 'غير منجزة',
    note?: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (onUpdateLessonStatus) {
      onUpdateLessonStatus(lpId, status, note);
      setSyncNotice(`تم تسجيل الحصة كـ (${status}) وتدوينها آلياً في الكراس اليومي 📖✨`);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  const handleDeleteLesson = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('هل أنت تأكد من إرادة حذف هذه المذكرة البيداغوجية؟')) {
      if (onDeleteLessonPlan) {
        onDeleteLessonPlan(id);
      }
      const remaining = lessonPlans.filter((l) => l.id !== id);
      if (remaining.length > 0) {
        setSelectedLessonId(remaining[0].id);
      } else {
        setSelectedLessonId('');
      }
    }
  };
  const startEditingObjectives = (lp: LessonPlan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingObjectivesId(lp.id);
    setObjectivesDraft({
      generalObjective: lp.generalObjective || '',
      motor: lp.proceduralObjectives.motor || '',
      cognitive: lp.proceduralObjectives.cognitive || '',
      communication: lp.proceduralObjectives.communication || '',
      personalSocial: lp.proceduralObjectives.personalSocial || lp.proceduralObjectives.affective || ''
    });
  };

  const [improvingField, setImprovingField] = useState<string | null>(null);

  const handleImproveWording = async (
    field: 'generalObjective' | 'motor' | 'cognitive' | 'communication' | 'personalSocial',
    label: string,
    lp: LessonPlan
  ) => {
    if (!objectivesDraft) return;
    const currentText = objectivesDraft[field];
    if (!currentText || !currentText.trim()) return;
    setImprovingField(field);
    try {
      const improvedText = await requestAIImproveWording({
        fieldLabel: label,
        currentText,
        context: `${lp.levelName} — ${lp.fieldName} — ${lp.sessionTitle}`
      });
      setObjectivesDraft((prev) => prev && { ...prev, [field]: improvedText });
    } finally {
      setImprovingField(null);
    }
  };

  const cancelEditingObjectives = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingObjectivesId(null);
    setObjectivesDraft(null);
  };

  const saveEditingObjectives = (lp: LessonPlan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!objectivesDraft) return;
    const updatedLesson: LessonPlan = {
      ...lp,
      generalObjective: objectivesDraft.generalObjective,
      proceduralObjectives: {
        ...lp.proceduralObjectives,
        motor: objectivesDraft.motor,
        cognitive: objectivesDraft.cognitive,
        communication: objectivesDraft.communication,
        personalSocial: objectivesDraft.personalSocial
      }
    };
    onSaveLessonPlan(updatedLesson);
    setEditingObjectivesId(null);
    setObjectivesDraft(null);
    setSyncNotice('تم تحديث صياغة الأهداف التعليمية للحصة بنجاح ✅');
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Generator Form States
  const [genLevel, setGenLevel] = useState('السنة الأولى ابتدائي');
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number>(0);
  
  const [genAnnualSessionRef, setGenAnnualSessionRef] = useState('التوزيع السنوي - الأسبوع 01 / الحصة 01 (تقويم تشخيصي)');
  const [genField, setGenField] = useState('الميدان الأول: الوضعيات والتنقلات');
  const [genSegmentGoal, setGenSegmentGoal] = useState('التحكم في الوضعيات والتنقلات وتطوير الوعي بالجسم والتوازن والتوجه المكاني أثناء الأنشطة الحركية.');
  const [genCompetency, setGenCompetency] = useState('التحكم في الوضعيات الأساسية للجسم والتنقلات البسيطة في فضاء محدد.');
  const [genSegment, setGenSegment] = useState('المقطع الأول: الوضعيات والتنقلات الأساسية');
  const [genSessionTitle, setGenSessionTitle] = useState('تشخيص مستوى التحكم في وضعيات الجسم الأساسية وقدرة المتعلم على التنقل في فضاء محدد.');
  const [genSessionType, setGenSessionType] = useState<'تعلمية' | 'إدماجية' | 'تقويمية' | 'علاجية' | 'تقويم تشخيصي' | 'تقويم تحصيلي'>('تقويم تشخيصي');
  const [genCustomObj, setGenCustomObj] = useState('');
  const [genEquipment, setGenEquipment] = useState('أقماع، حلقات، حبال، بساط، ميقاتي');

  // Compute all 30 sessions for currently selected grade level
  const currentLevelKey = LEVEL_KEY_MAP[genLevel] || 'lvl_p1';
  const currentLevelData = COMPLETE_ANNUAL_CURRICULUM[currentLevelKey];

  const levelSessionsList = React.useMemo(() => {
    if (!currentLevelData) return [];
    const list: Array<{
      globalNumber: number;
      weekNumber: number;
      fieldId: string;
      fieldName: string;
      segmentGoal: string;
      finalCompetency: string;
      sessionNumber: number;
      type: 'تعلمية' | 'إدماجية' | 'تقويمية' | 'علاجية' | 'تقويم تشخيصي' | 'تقويم تحصيلي';
      typeLabel: string;
      objective: string;
      tools: string[];
    }> = [];

    let globalCount = 1;
    Object.values(currentLevelData.fields).forEach((field) => {
      const segGoal = FIELD_SEGMENT_GOALS[field.fieldId] || field.finalCompetency;
      field.sessionsList.forEach((sess) => {
        list.push({
          globalNumber: globalCount,
          weekNumber: globalCount,
          fieldId: field.fieldId,
          fieldName: field.fieldName,
          segmentGoal: segGoal,
          finalCompetency: field.finalCompetency,
          sessionNumber: sess.sessionNumber,
          type: (sess.type as any) || 'تعلمية',
          typeLabel: sess.typeLabel || `حصة ${sess.sessionNumber}`,
          objective: sess.objective,
          tools: field.suggestedTools || []
        });
        globalCount++;
      });
    });

    return list;
  }, [currentLevelData]);

  // When session selection changes or level changes
  const handleSelectAnnualSession = (index: number) => {
    setSelectedSessionIndex(index);
    const item = levelSessionsList[index];
    if (item) {
      setGenAnnualSessionRef(`التوزيع السنوي - الأسبوع ${item.weekNumber < 10 ? '0' + item.weekNumber : item.weekNumber} / الحصة ${item.globalNumber < 10 ? '0' + item.globalNumber : item.globalNumber} (${item.typeLabel})`);
      setGenField(item.fieldName);
      setGenSegmentGoal(item.segmentGoal);
      setGenCompetency(item.finalCompetency);
      setGenSegment(`المقطع التعلمي: ${item.fieldName.split(':')[1] || item.fieldName}`);
      setGenSessionTitle(item.objective);
      setGenSessionType(item.type);
      setGenCustomObj(item.objective);
      setGenEquipment(item.tools.join('، ') || 'أقماع، ميقاتي، صفارة');
    }
  };

  // Sync when genLevel changes
  useEffect(() => {
    handleSelectAnnualSession(0);
  }, [genLevel]);

  const currentLesson = lessonPlans.find((l) => l.id === selectedLessonId) || lessonPlans[0];

  const handleRunAIGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    const selectedSessionItem = levelSessionsList[selectedSessionIndex];

    try {
      const generatedData = await requestAILessonPlan({
        levelName: genLevel,
        fieldName: genField,
        competencyTitle: genCompetency,
        segmentTitle: genSegment,
        sessionTitle: genSessionTitle,
        annualSessionRef: genAnnualSessionRef,
        segmentGoal: genSegmentGoal,
        sessionType: genSessionType,
        customObjective: genCustomObj || genSessionTitle,
        customEquipment: genEquipment
      });

      const newLesson: LessonPlan = {
        id: `lp_ai_${Date.now()}`,
        teacherId: currentUser?.id || '',
        institutionName: currentUser?.schoolName || 'المؤسسة التعليمية',
        teacherName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'أستاذ المادة',
        inspectorName: 'عبد الرحمن سطيفي',
        levelName: genLevel,
        className: '1 ابتدائي 1',
        fieldName: genField,
        competencyTitle: genCompetency,
        segmentTitle: genSegment,
        sessionTitle: genSessionTitle,
        sessionType: genSessionType,
        sessionTypeNumber: selectedSessionItem?.typeLabel,
        sessionGlobalNumber: selectedSessionItem?.globalNumber || 1,
        annualSessionRef: genAnnualSessionRef,
        segmentGoal: genSegmentGoal,
        date: new Date().toISOString().split('T')[0],
        durationMinutes: 60,
        equipmentNeeded: generatedData.equipmentNeeded || genEquipment.split(/[,،]/),
        equipmentChecklist: (generatedData.equipmentNeeded || genEquipment.split(/[,،]/))
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((name: string) => ({ name, available: true })),
        generalObjective: generatedData.generalObjective || genCustomObj || genSessionTitle,
        proceduralObjectives: generatedData.proceduralObjectives,
        warmupPhase: generatedData.warmupPhase,
        mainPhase: generatedData.mainPhase,
        coolDownPhase: generatedData.coolDownPhase,
        safetyRules: generatedData.safetyRules || [],
        aiGenerated: true,
        version: 1,
        createdAt: new Date().toISOString()
      };

      onSaveLessonPlan(newLesson);
      setSelectedLessonId(newLesson.id);
      setShowAIGeneratorModal(false);
    } catch (err) {
      console.error('Lesson generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoGenerateInstant = () => {
    const item = levelSessionsList[selectedSessionIndex];
    if (!item) return;

    const newLesson = autoGenerateLessonPlan(
      {
        fieldId: item.fieldId,
        fieldName: item.fieldName,
        finalCompetency: item.finalCompetency,
        segmentGoal: item.segmentGoal,
        sessionNumber: item.sessionNumber,
        globalNumber: item.globalNumber,
        weekNumber: item.weekNumber,
        type: item.type,
        typeLabel: item.typeLabel,
        objective: genCustomObj || item.objective,
        tools: genEquipment ? genEquipment.split(/[,،]/).map((s) => s.trim()).filter(Boolean) : item.tools
      },
      {
        levelName: genLevel,
        className: '1 ابتدائي 1',
        teacher: currentUser,
        inspectorName: 'عبد الرحمن سطيفي'
      }
    );

    onSaveLessonPlan(newLesson);
    setSelectedLessonId(newLesson.id);
    setShowAIGeneratorModal(false);
    setSyncNotice('تم توليد المذكرة تلقائياً وفورياً من التوزيع السنوي ⚡');
    setTimeout(() => setSyncNotice(null), 4000);
  };

  // Filter lesson plans
  const filteredLessonPlans = lessonPlans.filter((lp) => {
    if (statusFilter !== 'all' && lp.executionStatus !== statusFilter) return false;
    if (levelFilter !== 'all' && !lp.levelName.includes(levelFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            الوثائق البيداغوجية الرسمية
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>مذكرات الحصص البيداغوجية والربط الآلي بالكراس اليومي</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            مذكرات قابلة للطي والفتح لتوفير المساحة، مع إمكانية تحديد حالة الإنجاز (منجزة / غير منجزة / مؤجلة) والربط الأوتوماتيكي بالكراس اليومي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAIGeneratorModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>توليد مذكرة حسب التوزيع السنوي ⚡</span>
          </button>

          <button
            onClick={toggleExpandAll}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200"
          >
            <ChevronDown className="w-4 h-4 text-blue-600" />
            <span>طي / توسيع كافة المذكرات</span>
          </button>
        </div>
      </div>

      {/* Auto Sync Notification Banner */}
      {syncNotice && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl text-xs font-bold shadow-md animate-in slide-in-from-top-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-emerald-200" />
            <span>{syncNotice}</span>
          </span>
          <button onClick={() => setSyncNotice(null)} className="text-emerald-200 hover:text-white font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* Toolbar: Filters & Status Controls */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            جميع المذكرات ({lessonPlans.length})
          </button>
          <button
            onClick={() => setStatusFilter('منجزة')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'منجزة' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>منجزة ({lessonPlans.filter((l) => l.executionStatus === 'منجزة').length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('غير منجزة')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'غير منجزة' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>غير منجزة ({lessonPlans.filter((l) => l.executionStatus === 'غير منجزة').length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('مؤجلة')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'مؤجلة' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>مؤجلة ({lessonPlans.filter((l) => l.executionStatus === 'مؤجلة').length})</span>
          </button>
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 font-bold">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">المستوى:</span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
          >
            <option value="all">جميع السنوات (س1 - س5)</option>
            <option value="الأولى">السنة 1 ابتدائي</option>
            <option value="الثانية">السنة 2 ابتدائي</option>
            <option value="الثالثة">السنة 3 ابتدائي</option>
            <option value="الرابعة">السنة 4 ابتدائي</option>
            <option value="الخامسة">السنة 5 ابتدائي</option>
          </select>
        </div>
      </div>

      {/* Collapsible Lesson Plans List Cards */}
      <div className="space-y-4">
        {filteredLessonPlans.length > 0 ? (
          filteredLessonPlans.map((lp) => {
            const isExpanded = !!expandedMap[lp.id];
            const currentStatus = lp.executionStatus || 'لم تحدد بعد';

            return (
              <div
                key={lp.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200"
              >
                {/* Collapsible Card Header Bar */}
                <div
                  onClick={() => toggleExpand(lp.id)}
                  className="p-4 sm:p-5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer border-b border-slate-100 select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Expand/Collapse Chevron Button */}
                    <button
                      onClick={(e) => toggleExpand(lp.id, e)}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                      title={isExpanded ? 'طي المذكرة' : 'فتح المذكرة'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                          {lp.levelName} ({lp.className})
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-lg">
                          {lp.annualSessionRef || `حصة ${lp.sessionGlobalNumber || 1}`}
                        </span>

                        {/* Execution Status Badge */}
                        {lp.executionStatus === 'منجزة' && (
                          <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>منجزة</span>
                          </span>
                        )}
                        {lp.executionStatus === 'غير منجزة' && (
                          <span className="text-[11px] font-extrabold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-lg border border-rose-300 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>غير منجزة</span>
                          </span>
                        )}
                        {lp.executionStatus === 'مؤجلة' && (
                          <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>مؤجلة</span>
                          </span>
                        )}
                        {!lp.executionStatus && (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            لم تحدد بعد
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{lp.sessionTitle}</span>
                      </h3>
                    </div>
                  </div>

                  {/* Quick Decision & Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center" onClick={(e) => e.stopPropagation()}>
                    {/* Direct Launch Command Center Button */}
                    {onOpenCommandCenterForPlan && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCommandCenterForPlan(lp);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-amber-400 animate-pulse"
                        title="تنشيط مركز قيادة الحصة الميداني المباشر لمذكرة هذا اليوم"
                      >
                        <Clock className="w-4 h-4 text-slate-950" />
                        <span>تفعيل مركز القيادة ⏱️</span>
                      </button>
                    )}

                    <span className="text-[11px] font-extrabold text-slate-500 ml-1 hidden sm:inline">قرار الأستاذ:</span>

                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
                      <button
                        onClick={(e) => handleSetStatus(lp.id, 'منجزة', lp.executionNote, e)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                          lp.executionStatus === 'منجزة'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                        title="تحديد الحصة كـ (منجزة) والمزامنة آلياً بالكراس اليومي"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>منجزة</span>
                      </button>

                      <button
                        onClick={(e) => handleSetStatus(lp.id, 'غير منجزة', lp.executionNote, e)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                          lp.executionStatus === 'غير منجزة'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-rose-50 hover:text-rose-800'
                        }`}
                        title="تحديد الحصة كـ (غير منجزة)"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>غير منجزة</span>
                      </button>

                      <button
                        onClick={(e) => handleSetStatus(lp.id, 'مؤجلة', lp.executionNote, e)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                          lp.executionStatus === 'مؤجلة'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                        }`}
                        title="تحديد الحصة كـ (مؤجلة)"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>مؤجلة</span>
                      </button>
                    </div>

                    {/* Export & Delete Buttons */}
                    <button
                      onClick={() => exportLessonPlanToPdf(lp)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                      title="تصدير PDF (عبر معاينة الطباعة)"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => exportLessonPlanToWord(lp)}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition-colors cursor-pointer"
                      title="تصدير ملف Word (.docx)"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteLesson(lp.id, e)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-500 transition-colors cursor-pointer"
                      title="حذف المذكرة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Card Body (Official Lesson Document) */}
                {isExpanded && (
                  <div className="p-4 sm:p-8 bg-slate-50/50 space-y-6">
                    {/* Official Lesson Paper Printable Container */}
                    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-300 shadow-md space-y-6 text-slate-800 printable-paper">
                      {/* Header Metadata Section */}
                      <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1.5">
                        <h3 className="text-sm font-extrabold text-slate-900">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                        <h4 className="text-xs font-bold text-slate-700">وزارة التربية الوطنية - مديرية التربية لولاية سطيف (المقاطعة 07 عين أزال)</h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mt-3 text-right">
                          <div><span className="text-slate-500">اسم المدرسة:</span> <strong className="text-slate-900">{lp.institutionName || 'مدرسة الشهيد بالخيري عبد القادر'}</strong></div>
                          <div><span className="text-slate-500">اسم الأستاذ:</span> <strong className="text-slate-900">{lp.teacherName || 'أ. علي بن زايد'}</strong></div>
                          <div><span className="text-slate-500">الأستاذ المفتش:</span> <strong className="text-blue-900">{lp.inspectorName || 'المفتش: عبد الرحمن سطيفي'}</strong></div>
                          <div><span className="text-slate-500">المستوى والقسم:</span> <strong className="text-slate-900">{lp.levelName} ({lp.className})</strong></div>
                        </div>
                      </div>

                      {/* Official Annual Schedule & Learning Segment Goal Linkage Box */}
                      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4.5 rounded-2xl shadow-sm border border-blue-800 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-800/80 pb-2">
                          <span className="font-extrabold flex items-center gap-1.5 text-yellow-300">
                            <Calendar className="w-4 h-4" />
                            <span>الارتباط بالتوزيع السنوي الرسمي للحصص:</span>
                          </span>
                          <span className="bg-blue-800/80 px-3 py-1 rounded-xl text-white font-extrabold border border-blue-700/80">
                            📌 {lp.annualSessionRef || `التوزيع السنوي - الأسبوع 0${lp.sessionGlobalNumber || 1} / الحصة 0${lp.sessionGlobalNumber || 1}`}
                          </span>
                        </div>

                        <div className="pt-1 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              <strong className="text-emerald-300 ml-1">الهدف التعلمي للمقطع البيداغوجي:</strong>
                              <span className="text-slate-100 font-medium">
                                {lp.segmentGoal || 'التحكم في الوضعيات والتنقلات والمهارات الحركية والتنظيم الجماعي وفق معايير المنهاج.'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Curriculum Mapping Bar & Session Type */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-blue-50/80 p-4 rounded-2xl border border-blue-100 font-bold">
                        <div>
                          <span className="text-blue-600 block text-[10px] uppercase">الميدان التعليمي</span>
                          <span className="text-slate-900">{lp.fieldName}</span>
                        </div>
                        <div>
                          <span className="text-blue-600 block text-[10px] uppercase">المقطع التعليمي</span>
                          <span className="text-slate-900">{lp.segmentTitle}</span>
                        </div>
                        <div>
                          <span className="text-blue-600 block text-[10px] uppercase">نوع الحصة ورقمها</span>
                          <span className="text-slate-900 font-extrabold text-blue-900">
                            {lp.sessionTypeNumber || `${lp.sessionType} - حصة 0${lp.sessionGlobalNumber || 1}`}
                          </span>
                        </div>
                      </div>

                      {/* Final Competency Box */}
                      <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80 text-xs font-bold text-amber-950">
                        <span className="text-amber-800 text-[10px] uppercase block mb-0.5">الكفاءة الختامية للميدان:</span>
                        <p className="text-slate-900 font-medium leading-relaxed">{lp.competencyTitle}</p>
                      </div>

                      {/* Objectives & Safety Rules */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                          <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                            <span>الهدف العام الإجرائي للحصة:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold">{lp.sessionTitle}</span>
                              {editingObjectivesId !== lp.id && (
                                <button
                                  onClick={(e) => startEditingObjectives(lp, e)}
                                  className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 px-2 py-0.5 rounded-md cursor-pointer"
                                  title="تعديل صياغة الأهداف التعليمية"
                                >
                                  <PenSquare className="w-3 h-3" />
                                  <span>تعديل الصياغة</span>
                                </button>
                              )}
                            </div>
                          </h4>

                          {editingObjectivesId === lp.id && objectivesDraft ? (
                            <div className="space-y-2 pt-1">
                              {([
                                { field: 'generalObjective' as const, label: 'الهدف العام الإجرائي', emoji: '🎯', color: 'text-slate-500', boldValue: true },
                                { field: 'motor' as const, label: '1. الهدف المهاري الحركي', color: 'text-blue-800' },
                                { field: 'cognitive' as const, label: '2. الهدف المعرفي', color: 'text-indigo-800' },
                                { field: 'communication' as const, label: '3. الهدف التواصلي (اختياري)', color: 'text-amber-800' },
                                { field: 'personalSocial' as const, label: '4. الهدف الشخصي والاجتماعي', color: 'text-teal-800' }
                              ]).map((f) => (
                                <div key={f.field}>
                                  <label className={`text-[10px] font-bold ${f.color} mb-0.5 flex items-center justify-between gap-2`}>
                                    <span>{f.emoji ? `${f.emoji} ` : ''}{f.label}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleImproveWording(f.field, f.label, lp);
                                      }}
                                      disabled={improvingField === f.field || !objectivesDraft[f.field]?.trim()}
                                      className="flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded-md cursor-pointer shrink-0"
                                      title="تحسين الصياغة بالذكاء الاصطناعي"
                                    >
                                      <Sparkles className={`w-3 h-3 ${improvingField === f.field ? 'animate-spin' : ''}`} />
                                      <span>{improvingField === f.field ? 'جارٍ التحسين...' : 'تحسين الصياغة'}</span>
                                    </button>
                                  </label>
                                  <textarea
                                    value={objectivesDraft[f.field]}
                                    onChange={(e) => setObjectivesDraft((prev) => prev && { ...prev, [f.field]: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    rows={2}
                                    className={`w-full text-xs ${f.boldValue ? 'font-bold' : ''} text-slate-800 bg-white p-2.5 rounded-xl border ${f.boldValue ? 'border-blue-300' : 'border-slate-300'} outline-none focus:ring-2 focus:ring-blue-200`}
                                  />
                                </div>
                              ))}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={(e) => saveEditingObjectives(lp, e)}
                                  className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>حفظ التعديلات</span>
                                </button>
                                <button
                                  onClick={cancelEditingObjectives}
                                  className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-xl cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>إلغاء</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200">
                                🎯 {lp.generalObjective}
                              </p>

                              <div className="text-xs space-y-1 pt-1">
                                <p><span className="font-bold text-blue-800">1. الهدف المهاري الحركي:</span> {lp.proceduralObjectives.motor}</p>
                                <p><span className="font-bold text-indigo-800">2. الهدف المعرفي:</span> {lp.proceduralObjectives.cognitive}</p>
                                {lp.proceduralObjectives.communication && (
                                  <p><span className="font-bold text-amber-800">3. الهدف التواصلي:</span> {lp.proceduralObjectives.communication}</p>
                                )}
                                <p><span className="font-bold text-teal-800">{lp.proceduralObjectives.communication ? '4' : '3'}. الهدف الشخصي والاجتماعي:</span> {lp.proceduralObjectives.personalSocial || lp.proceduralObjectives.affective}</p>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                          <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-200 pb-1">
                            الوسائل وقواعد السلامة:
                          </h4>
                          <div className="text-xs space-y-1">
                            <span className="font-bold text-slate-700 block mb-1">الوسائل والتجهيزات (قائمة تحقق):</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(lp.equipmentChecklist && lp.equipmentChecklist.length > 0
                                ? lp.equipmentChecklist
                                : lp.equipmentNeeded.map((name) => ({ name, available: true }))
                              ).map((item, idx) => (
                                <button
                                  key={`${item.name}_${idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const base =
                                      lp.equipmentChecklist && lp.equipmentChecklist.length > 0
                                        ? lp.equipmentChecklist
                                        : lp.equipmentNeeded.map((name) => ({ name, available: true }));
                                    const updatedChecklist = base.map((it, i) =>
                                      i === idx ? { ...it, available: !it.available } : it
                                    );
                                    onSaveLessonPlan({ ...lp, equipmentChecklist: updatedChecklist });
                                  }}
                                  title={item.available ? 'متوفر — اضغط لتغيير الحالة إلى: يجب توفيره' : 'يجب توفيره — اضغط لتأكيد التوفر'}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                    item.available
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                      : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                                  }`}
                                >
                                  {item.available ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  <span>{item.name}</span>
                                </button>
                              ))}
                            </div>
                            <span className="font-bold text-rose-700 block mt-2">الأمن والسلامة:</span>
                            <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5">
                              {lp.safetyRules.map((rule, idx) => (
                                <li key={idx}>{rule}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Lesson Phases Table / Grid */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-r-4 border-blue-600 pr-2">
                          سير الحصة والمراحل البيداغوجية
                        </h4>

                        {/* Phase 1: Warmup */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                          <div className="bg-blue-600 text-white p-2.5 font-bold flex items-center justify-between">
                            <span>1. المرحلة التحضيرية (المجلس والتهيئة + لعبة تربوية إحمائية)</span>
                            <span className="bg-blue-800 px-2 py-0.5 rounded-lg text-[11px]">{lp.warmupPhase.duration}</span>
                          </div>
                          
                          <div className="p-4 bg-slate-50 space-y-3">
                            {lp.warmupPhase.pedagogicalWarmupGame && (
                              <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-1">
                                <span className="text-xs font-black text-blue-900 flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  اللعبة التربوية التمهيدية: {lp.warmupPhase.pedagogicalWarmupGame.title}
                                </span>
                                <p className="text-slate-700 text-xs">{lp.warmupPhase.pedagogicalWarmupGame.rules}</p>
                                {lp.warmupPhase.pedagogicalWarmupGame.equipment && (
                                  <span className="text-[10px] text-slate-500 block">وسائل اللعبة: {lp.warmupPhase.pedagogicalWarmupGame.equipment}</span>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="font-bold text-slate-800 block">الإحماء العام والخاص:</span>
                                <p className="text-slate-600">{lp.warmupPhase.generalWarmup} - {lp.warmupPhase.specificWarmup}</p>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block">التنظيم والتوجيه:</span>
                                <p className="text-slate-600">{lp.warmupPhase.organization}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Phase 2: Main Phase */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                          <div className="bg-indigo-600 text-white p-2.5 font-bold flex items-center justify-between">
                            <span>2. المرحلة الرئيسية (وضعية المشكل والمواقف التعلمية التنافسية)</span>
                            <span className="bg-indigo-800 px-2 py-0.5 rounded-lg text-[11px]">{lp.mainPhase.duration}</span>
                          </div>

                          <div className="p-4 bg-white space-y-3">
                            {lp.mainPhase.problemSituation && (
                              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-amber-950 font-bold">
                                <span>الوضعية المشكلة الانطلاقية: </span>
                                <span className="font-normal">{lp.mainPhase.problemSituation}</span>
                              </div>
                            )}

                            {/* Situation 1 */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                              <h5 className="font-extrabold text-blue-900 text-xs">{lp.mainPhase.learningSituation1.title}</h5>
                              <p className="text-slate-700 text-xs">{lp.mainPhase.learningSituation1.description}</p>
                              <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-bold text-slate-500">
                                <span>الجرعة البدنية: {lp.mainPhase.learningSituation1.dosing}</span>
                                <span>معايير النجاح: {lp.mainPhase.learningSituation1.criteria}</span>
                              </div>
                            </div>

                            {/* Situation 2 */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                              <h5 className="font-extrabold text-indigo-900 text-xs">{lp.mainPhase.learningSituation2.title}</h5>
                              <p className="text-slate-700 text-xs">{lp.mainPhase.learningSituation2.description}</p>
                              <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-bold text-slate-500">
                                <span>الجرعة البدنية: {lp.mainPhase.learningSituation2.dosing}</span>
                                <span>معايير النجاح: {lp.mainPhase.learningSituation2.criteria}</span>
                              </div>
                            </div>

                            {/* Guided Application */}
                            {lp.mainPhase.guidedApplication && (
                              <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200 text-teal-950">
                                <span className="font-bold">{lp.mainPhase.guidedApplication.title}: </span>
                                <span>{lp.mainPhase.guidedApplication.description}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Phase 3: Cool Down */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                          <div className="bg-slate-800 text-white p-2.5 font-bold flex items-center justify-between">
                            <span>3. المرحلة الختامية (التهدئة والحوار البيداغوجي واستخلاص النتائج)</span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded-lg text-[11px]">{lp.coolDownPhase.duration}</span>
                          </div>

                          <div className="p-4 bg-slate-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-bold text-slate-800 block">تمارين التهدئة والاسترخاء:</span>
                                <p className="text-slate-700">{lp.coolDownPhase.activities}</p>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block">التقييم الذاتي والحوار الهادف:</span>
                                <p className="text-slate-700">{lp.coolDownPhase.assessmentAndDialogue}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Daily Notebook Auto-Sync Execution Note Area */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="font-extrabold text-blue-950 flex items-center gap-1.5">
                            <BookMarked className="w-4 h-4 text-blue-600" />
                            <span>ملاحظات الأستاذ حول تنفيذ الحصة (تُسجَّل وتُحدَّث تلقائياً بالكراس اليومي):</span>
                          </label>
                          <span className="text-[10px] font-extrabold text-blue-800 bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                            ربط أوتوماتيكي مع الكراس اليومي ⚡
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="مثال: تم إنجاز الحصة في ظروف ممتازة، أو سبب تأجيل الحصة (أحوال جوية، انشغال آخر)..."
                          defaultValue={lp.executionNote || ''}
                          onBlur={(e) => {
                            if (lp.executionStatus) {
                              handleSetStatus(lp.id, lp.executionStatus, e.target.value);
                            }
                          }}
                          className="w-full p-3 rounded-xl bg-white border border-blue-200 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">لا توجد مذكرات مطابقة لخيارات التصفية المختارة.</p>
          </div>
        )}
      </div>

      {/* Modal: AI Generator Trigger linked to Annual Schedule & Segment Objectives */}
      {showAIGeneratorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">توليد مذكرة حصة مرتبطة بالتوزيع السنوي</h3>
                  <p className="text-[11px] text-slate-500">اختر حصة التوزيع السنوي ليتم ربط الهدف البيداغوجي للمقطع تلقائياً</p>
                </div>
              </div>
              <button onClick={() => setShowAIGeneratorModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleRunAIGenerator} className="space-y-4 text-xs">
              {/* Step 1: Grade Level Selection */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">1. المستوى الدراسي الرسمي:</label>
                <select
                  value={genLevel}
                  onChange={(e) => setGenLevel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="السنة الأولى ابتدائي">السنة الأولى ابتدائي</option>
                  <option value="السنة الثانية ابتدائي">السنة الثانية ابتدائي</option>
                  <option value="السنة الثالثة ابتدائي">السنة الثالثة ابتدائي</option>
                  <option value="السنة الرابعة ابتدائي">السنة الرابعة ابتدائي</option>
                  <option value="السنة الخامسة ابتدائي">السنة الخامسة ابتدائي</option>
                </select>
              </div>

              {/* Step 2: Annual Schedule Session Selector (1 of 30) */}
              <div>
                <label className="font-bold text-slate-800 block mb-1 flex items-center justify-between">
                  <span>2. اختر حصة التوزيع السنوي (من 30 حصة رسمية):</span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg font-extrabold">
                    {levelSessionsList.length} حصة متوفرة
                  </span>
                </label>
                <select
                  value={selectedSessionIndex}
                  onChange={(e) => handleSelectAnnualSession(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-blue-300 font-bold text-blue-950 bg-blue-50/50 outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed cursor-pointer"
                >
                  {levelSessionsList.map((item, idx) => (
                    <option key={idx} value={idx}>
                      [أسبوع {item.weekNumber < 10 ? '0' + item.weekNumber : item.weekNumber}] حصة {item.globalNumber}: {item.fieldName.split(':')[0]} ({item.typeLabel}) - {item.objective.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Linked Metadata Summary Cards */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-bold">
                  <span className="text-blue-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    مرجع التوزيع السنوي:
                  </span>
                  <span className="text-slate-900 font-extrabold bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {genAnnualSessionRef}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="font-extrabold text-emerald-900 block flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-600" />
                    الهدف التعلمي للمقطع البيداغوجي المربوط:
                  </span>
                  <textarea
                    rows={2}
                    value={genSegmentGoal}
                    onChange={(e) => setGenSegmentGoal(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white border border-emerald-200 font-medium text-slate-800 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Step 4: Editable Session Details */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الهدف العام الإجرائي للحصة المراد توليدها:</label>
                  <textarea
                    rows={2}
                    required
                    value={genSessionTitle}
                    onChange={(e) => setGenSessionTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-bold text-slate-900 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الوسائل والأدوات المستعملة بالحصة:</label>
                  <input
                    type="text"
                    value={genEquipment}
                    onChange={(e) => setGenEquipment(e.target.value)}
                    placeholder="ميقاتي، صفارة، أقماع شواخص"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAIGeneratorModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleAutoGenerateInstant}
                  className="px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold rounded-xl flex items-center gap-2 hover:bg-emerald-100 cursor-pointer"
                  title="توليد فوري من بيانات التوزيع السنوي مباشرة، دون انتظار الذكاء الاصطناعي"
                >
                  <Zap className="w-4 h-4" />
                  <span>توليد تلقائي فوري ⚡</span>
                </button>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التوليد من المخطط المنهاجي الرسمي...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span>توليد المذكرة المربوطة الآن ✨</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
