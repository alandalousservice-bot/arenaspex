/**
 * SPEX - Educational Knowledge Engine View Component
 * محرك المعرفة التربوية: بنك الأهداف، الألعاب، الأنشطة العلاجية والمواقف التربوية
 */

import React, { useMemo, useState } from 'react';
import {
  BrainCircuit,
  Search,
  Plus,
  Gamepad2,
  Target,
  Layers,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import { CommunityResource, KnowledgeItem, KnowledgeCategory } from '../../types/spex';
import { requestPedagogicalGameSuggestion } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { EducationalSituationsBankView } from '../educationalSituations/EducationalSituationsBankView';
import { User } from '../../types/spex';
import {
  buildKnowledgeCoverage,
  buildObjectiveReadModel,
  CoverageStatus,
  CurriculumObjectiveReference,
  canViewCoverageDiagnostics,
} from '../../services/knowledgeCoverage.service';

interface KnowledgeEngineViewProps {
  knowledgeItems: KnowledgeItem[];
  onAddKnowledgeItem: (item: Partial<KnowledgeItem>) => void;
  onUpdateKnowledgeItem?: (id: string, patch: Partial<KnowledgeItem>) => void;
  onSubmitKnowledgeItem?: (id: string) => void;
  onDeleteKnowledgeItem?: (id: string) => void;
  onApproveKnowledgeItem?: (id: string) => void;
  onRejectKnowledgeItem?: (id: string, reason: string) => void;
  currentUser: User;
  communityResources?: CommunityResource[];
}

export function selectApprovedCommunityResources(
  resources: CommunityResource[]
): CommunityResource[] {
  return resources.filter(
    (resource) =>
      resource.isApprovedByInspector ||
      resource.authorRole === 'inspector' ||
      resource.authorRole === 'admin'
  );
}

export const KNOWLEDGE_BANK_CATEGORIES = [
  'game',
  'objective',
  'remedial',
  'educational_situation',
  'community_resource',
] as const;

export const KnowledgeEngineView: React.FC<KnowledgeEngineViewProps> = ({
  knowledgeItems,
  onAddKnowledgeItem,
  onUpdateKnowledgeItem,
  onSubmitKnowledgeItem,
  onDeleteKnowledgeItem,
  onApproveKnowledgeItem,
  onRejectKnowledgeItem,
  currentUser,
  communityResources = [],
}) => {
  const [activeTab, setActiveTab] = useState<
    KnowledgeCategory | 'educational_situation' | 'community_resource'
  >('game');
  const [searchVal, setSearchVal] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSuggestingGames, setIsSuggestingGames] = useState(false);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionGrade, setSuggestionGrade] = useState(1);
  const [suggestionField, setSuggestionField] = useState('f_fundamentals');
  const [suggestionObjectiveId, setSuggestionObjectiveId] = useState('');
  const [suggestionObjectiveText, setSuggestionObjectiveText] = useState('');
  const [suggestionConstraints, setSuggestionConstraints] = useState({ equipment: '', groupSize: '', environment: '', difficulty: '' });
  const [suggestionDraft, setSuggestionDraft] = useState<Partial<KnowledgeItem> | null>(null);
  const [suggestionError, setSuggestionError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [rejectionDraft, setRejectionDraft] = useState<Record<string, string>>({});
  const [showCoverage, setShowCoverage] = useState(false);
  const [objectiveGrade, setObjectiveGrade] = useState('all');
  const [objectiveField, setObjectiveField] = useState('all');
  // تأخير التصفية عن الطباعة المباشرة لتقليل عمليات إعادة الرسم على القوائم الكبيرة
  const debouncedSearchVal = useDebounce(searchVal, 300);

  const objectiveItems = buildObjectiveReadModel(knowledgeItems);
  const suggestionObjectives = useMemo(
    () => objectiveItems.filter((item) => item.levelId === `lvl_p${suggestionGrade}` || item.levelIds?.includes(`lvl_p${suggestionGrade}`)).filter((item) => item.fieldId === suggestionField),
    [objectiveItems, suggestionGrade, suggestionField]
  );
  const filteredItems = (activeTab === 'objective' ? objectiveItems : knowledgeItems).filter(
    (item) => {
      const matchesCategory = item.category === activeTab;
      const matchesSearch =
        item.title.includes(debouncedSearchVal) ||
        item.description.includes(debouncedSearchVal) ||
        item.tags.some((t) => t.includes(debouncedSearchVal));
      const matchesGrade =
        !['game', 'objective'].includes(activeTab) ||
        objectiveGrade === 'all' ||
        item.levelId === objectiveGrade ||
        item.levelIds?.includes(objectiveGrade);
      const matchesField =
        !['game', 'objective'].includes(activeTab) ||
        objectiveField === 'all' ||
        item.fieldId === objectiveField;
      return item.approved && matchesCategory && matchesSearch && matchesGrade && matchesField;
    }
  );
  const coverage = buildKnowledgeCoverage({ knowledgeItems });
  const canViewCoverage = canViewCoverageDiagnostics(currentUser.role);
  const statusLabel: Record<CoverageStatus, string> = {
    EMPTY: 'فارغة',
    LOW: 'منخفضة',
    ADEQUATE: 'كافية',
  };
  const approvedCommunityResources = selectApprovedCommunityResources(communityResources);
  const ownEditableGames = knowledgeItems.filter((item) => item.category === 'game' && item.ownerId === currentUser.id && (item.approvalStatus === 'DRAFT' || item.approvalStatus === 'REJECTED'));
  const pendingGames = knowledgeItems.filter((item) => item.category === 'game' && (item.approvalStatus === 'PENDING_APPROVAL' || item.approvalStatus === 'PENDING_REVIEW') && (currentUser.role === 'admin' || currentUser.role === 'inspector'));
  const filteredCommunityResources = approvedCommunityResources.filter((resource) => {
    const query = debouncedSearchVal.trim();
    return (
      !query ||
      resource.title.includes(query) ||
      resource.description.includes(query) ||
      resource.authorName.includes(query)
    );
  });

  const handleCopyText = (item: KnowledgeItem | CurriculumObjectiveReference) => {
    const textToCopy = `${item.title}\n\n${item.description}\n\nالأدوات: ${item.equipment?.join('، ')}\nالقوانين: ${item.rules}`;
    // clipboard API غير متوفرة في السياقات غير الآمنة (http) أو بعض المتصفحات — بديل آمن
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).catch(() => fallbackCopyText(textToCopy));
      } else {
        fallbackCopyText(textToCopy);
      }
    } catch {
      fallbackCopyText(textToCopy);
    }
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (e) {
      console.warn('Copy to clipboard failed:', e);
    }
  };

  const handleCreateSuggestion = async () => {
    const selected = suggestionObjectives.find((item) => item.id === suggestionObjectiveId);
    if (!selected) {
      setSuggestionError('يرجى اختيار الهدف أو المهارة المستهدفة.');
      return;
    }
    setIsSuggestingGames(true);
    setSuggestionError('');
    setDuplicateWarning(false);
    try {
      const candidate = await requestPedagogicalGameSuggestion({
        grade: suggestionGrade,
        fieldId: suggestionField,
        fieldName: fieldLabel(suggestionField),
        objectiveId: selected.id,
        objectiveText: selected.description,
        existingGames: knowledgeItems.filter((item) => item.category === 'game' && item.approved && item.fieldId === suggestionField && (item.levelIds?.includes(`lvl_p${suggestionGrade}`) || item.levelId === `lvl_p${suggestionGrade}`)).map((item) => item.title),
        existingSituations: [],
        constraints: suggestionConstraints,
      });
      const draft: Partial<KnowledgeItem> = {
        category: 'game', title: textValue(candidate.title), description: textValue(candidate.description || candidate.pedagogicalPurpose),
        fieldId: suggestionField, fieldName: fieldLabel(suggestionField), levelIds: [`lvl_p${suggestionGrade}`], levelName: `السنة ${suggestionGrade} ابتدائي`,
        objectiveId: selected.id, objectiveText: selected.description,
        tags: ['اقتراح لعبة تربوية', 'الحركات القاعدية'], equipment: stringList(candidate.equipment), rules: textValue(candidate.rules || candidate.organization),
        organization: textValue(candidate.organization), pedagogicalPurpose: textValue(candidate.pedagogicalPurpose || candidate.description), safetyGuidance: textValue(candidate.safety), progression: textValue(candidate.progression),
        approved: false, approvalStatus: 'DRAFT', origin: 'AI_GENERATED', createdBy: 'اقتراح', usageCount: 0, rating: 0,
      };
      if (!draft.title || !draft.description || !draft.rules) throw new Error('invalid_suggestion');
      const normalized = draft.title.trim().replace(/\s+/g, ' ');
      setDuplicateWarning(knowledgeItems.some((item) => item.category === 'game' && item.approved && item.fieldId === suggestionField && item.levelIds?.includes(`lvl_p${suggestionGrade}`) && item.title.trim().replace(/\s+/g, ' ') === normalized));
      setSuggestionDraft(draft);
    } catch {
      setSuggestionError('تعذر إنشاء الاقتراح. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSuggestingGames(false);
    }
  };

  const saveSuggestionDraft = () => {
    if (!suggestionDraft?.title || !suggestionDraft.description || !suggestionDraft.rules) return;
    onAddKnowledgeItem(suggestionDraft);
    setSuggestionDraft(null);
    setShowSuggestionForm(false);
  };

  const fieldLabel = (fieldId: string) => ({ f_locomotion: 'الوضعيات والتنقلات', f_fundamentals: 'الحركات القاعدية', f_structuring: 'الهيكلة والبناء' }[fieldId] || fieldId);
  const textValue = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const stringList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && !!item.trim()).map((item) => item.trim()) : typeof value === 'string' ? value.split(/[،,]/).map((item) => item.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            قاعدة المعرفة الوطنية
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <span>محرك المعرفة التربوية (Educational Knowledge Engine)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            مكتبة متكاملة للبحث والتنفيذ السريع للأهداف الألعاب التربوية، الوضعيات والأنشطة العلاجية
          </p>
        </div>

        <button
          onClick={() => { setShowSuggestionForm(true); setActiveTab('game'); setSuggestionError(''); }}
          disabled={isSuggestingGames}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>اقتراح لعبة تربوية</span>
        </button>
      </div>

      {showSuggestionForm && (
        <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-extrabold text-slate-900">اقتراح لعبة تربوية</h3><p className="text-xs text-slate-500">اختر السنة والميدان والهدف، ثم راجع الاقتراح قبل حفظه.</p></div><button onClick={() => setShowSuggestionForm(false)} className="text-xs text-slate-500 hover:text-slate-900">إغلاق</button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs font-bold text-slate-700">السنة<select value={suggestionGrade} onChange={(e) => { setSuggestionGrade(Number(e.target.value)); setSuggestionObjectiveId(''); }} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-normal">{[1,2,3,4,5].map((grade) => <option key={grade} value={grade}>السنة {grade}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-700">الميدان<select value={suggestionField} onChange={(e) => { setSuggestionField(e.target.value); setSuggestionObjectiveId(''); }} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-normal"><option value="f_locomotion">الوضعيات والتنقلات</option><option value="f_fundamentals">الحركات القاعدية</option><option value="f_structuring">الهيكلة والبناء</option></select></label>
            <label className="text-xs font-bold text-slate-700">الهدف / المهارة<select value={suggestionObjectiveId} onChange={(e) => { setSuggestionObjectiveId(e.target.value); setSuggestionObjectiveText(suggestionObjectives.find((item) => item.id === e.target.value)?.description || ''); }} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-normal"><option value="">اختر من المراجع المنهجية</option>{suggestionObjectives.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3"><input value={suggestionConstraints.equipment} onChange={(e) => setSuggestionConstraints({ ...suggestionConstraints, equipment: e.target.value })} placeholder="الوسائل المتاحة (اختياري)" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" /><input value={suggestionConstraints.groupSize} onChange={(e) => setSuggestionConstraints({ ...suggestionConstraints, groupSize: e.target.value })} placeholder="حجم الفوج (اختياري)" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" /><input value={suggestionConstraints.environment} onChange={(e) => setSuggestionConstraints({ ...suggestionConstraints, environment: e.target.value })} placeholder="الفضاء (اختياري)" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" /><input value={suggestionConstraints.difficulty} onChange={(e) => setSuggestionConstraints({ ...suggestionConstraints, difficulty: e.target.value })} placeholder="الصعوبة (اختياري)" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" /></div>
          {suggestionObjectiveText && <p className="text-xs text-indigo-700 bg-indigo-50 rounded-xl p-3">الهدف المختار: {suggestionObjectiveText}</p>}
          {suggestionError && <p className="text-xs text-rose-600 bg-rose-50 rounded-xl p-3">{suggestionError}</p>}
          {duplicateWarning && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">يوجد في البنك محتوى مشابه لهذا الاقتراح. راجع المحتوى قبل الحفظ.</p>}
          <button onClick={handleCreateSuggestion} disabled={isSuggestingGames} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs disabled:opacity-50">{isSuggestingGames ? 'جاري إعداد الاقتراح...' : 'إنشاء اقتراح'}</button>
        </section>
      )}

      {suggestionDraft && (
        <section className="bg-white rounded-3xl p-6 border border-indigo-200 shadow-xs space-y-3"><h3 className="text-sm font-extrabold text-slate-900">مراجعة الاقتراح قبل الحفظ</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input value={suggestionDraft.title || ''} onChange={(e) => setSuggestionDraft({ ...suggestionDraft, title: e.target.value })} placeholder="اسم اللعبة" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" /><input value={suggestionDraft.pedagogicalPurpose || ''} onChange={(e) => setSuggestionDraft({ ...suggestionDraft, pedagogicalPurpose: e.target.value, description: e.target.value })} placeholder="الهدف التربوي المختصر" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" /><textarea value={suggestionDraft.organization || ''} onChange={(e) => setSuggestionDraft({ ...suggestionDraft, organization: e.target.value })} placeholder="التنظيم" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-20" /><textarea value={suggestionDraft.rules || ''} onChange={(e) => setSuggestionDraft({ ...suggestionDraft, rules: e.target.value })} placeholder="سير اللعبة والقواعد" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-20" /><textarea value={suggestionDraft.safetyGuidance || ''} onChange={(e) => setSuggestionDraft({ ...suggestionDraft, safetyGuidance: e.target.value })} placeholder="توجيهات السلامة" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-20" /><textarea value={suggestionDraft.progression || ''} onChange={(e) => setSuggestionDraft({ ...suggestionDraft, progression: e.target.value })} placeholder="التبسيط والتدرج" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-20" /></div><div className="flex gap-2"><button onClick={saveSuggestionDraft} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">حفظ كمسودة</button><button onClick={() => setSuggestionDraft(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">إلغاء</button></div></section>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('game')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'game'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>بنك الألعاب التربوية</span>
          </button>

          <button
            onClick={() => setActiveTab('objective')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'objective'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>بنك الأهداف الإجرائية</span>
          </button>

          <button
            onClick={() => setActiveTab('remedial')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'remedial'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>الأنشطة العلاجية</span>
          </button>

          <button
            onClick={() => setActiveTab('educational_situation')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'educational_situation'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>المواقف التربوية</span>
          </button>

          {approvedCommunityResources.length > 0 && (
            <button
              onClick={() => setActiveTab('community_resource')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'community_resource'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>الموارد التعليمية المشتركة</span>
            </button>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="ابحث بالاسم، الميدان، أو الكلمة..."
            className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 outline-none"
          />
        </div>
      </div>

      {canViewCoverage && (
        <button
          onClick={() => setShowCoverage((value) => !value)}
          className={`self-start px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${showCoverage ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
        >
          <Layers className="w-4 h-4" />
          <span>تغطية بنك المعرفة</span>
        </button>
      )}
      {showCoverage && canViewCoverage && (
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">تغطية بنك المعرفة</h3>
              <p className="text-[11px] text-slate-500">
                مؤشر تشخيصي داخلي: فارغة = 0، منخفضة = 1–2، كافية = 3 فأكثر.
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              15 خلية · موارد مشتركة معتمدة: {approvedCommunityResources.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-right">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="p-2">السنة</th>
                  <th className="p-2">الميدان</th>
                  <th className="p-2">الألعاب</th>
                  <th className="p-2">الأهداف</th>
                  <th className="p-2">العلاجية</th>
                  <th className="p-2">المواقف</th>
                </tr>
              </thead>
              <tbody>
                {coverage.map((cell) => (
                  <tr key={`${cell.levelId}-${cell.fieldId}`} className="border-b border-slate-50">
                    <td className="p-2">{cell.grade}</td>
                    <td className="p-2">{cell.fieldName}</td>
                    {(['games', 'objectives', 'remedial', 'situations'] as const).map((type) => {
                      const countKey = `${type}Count` as
                        'gamesCount' | 'objectivesCount' | 'remedialCount' | 'situationsCount';
                      return (
                        <td className="p-2" key={type}>
                          <span
                            className={`font-bold ${cell.statuses[type] === 'EMPTY' ? 'text-rose-600' : cell.statuses[type] === 'LOW' ? 'text-amber-600' : 'text-emerald-600'}`}
                          >
                            {cell[countKey]} · {statusLabel[cell.statuses[type]]}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {['game', 'objective'].includes(activeTab) && (
        <div className="flex items-center gap-2 text-xs">
          <select
            value={objectiveGrade}
            onChange={(e) => setObjectiveGrade(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2"
          >
            <option value="all">كل السنوات</option>
            {[1, 2, 3, 4, 5].map((grade) => (
              <option key={grade} value={`lvl_p${grade}`}>
                السنة {grade}
              </option>
            ))}
          </select>
          <select
            value={objectiveField}
            onChange={(e) => setObjectiveField(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2"
          >
            <option value="all">كل الميادين</option>
            <option value="f_locomotion">الوضعيات والتنقلات</option>
            <option value="f_fundamentals">الحركات القاعدية</option>
            <option value="f_structuring">الهيكلة والبناء</option>
          </select>
        </div>
      )}

      {activeTab === 'game' && ownEditableGames.length > 0 && <section className="bg-white rounded-3xl border border-slate-200/80 p-4 space-y-3"><h3 className="text-sm font-extrabold text-slate-900">اقتراحاتي الخاصة</h3>{ownEditableGames.map((item) => <div key={item.id} className="border border-slate-100 rounded-2xl p-3 space-y-2"><div className="flex justify-between"><span className="text-xs font-bold">{item.title}</span><span className="text-[11px] text-amber-700">{item.approvalStatus === 'REJECTED' ? 'مرفوض' : 'مسودة'}</span></div>{item.rejectionReason && <p className="text-xs text-rose-700 bg-rose-50 rounded-xl p-2">سبب الرفض: {item.rejectionReason}</p>}<textarea value={item.rules || ''} onChange={(e) => onUpdateKnowledgeItem?.(item.id, { rules: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-16" placeholder="القواعد والتوجيهات" /><div className="flex gap-2"><button onClick={() => onSubmitKnowledgeItem?.(item.id)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[11px] font-bold">إرسال للاعتماد</button><button onClick={() => onDeleteKnowledgeItem?.(item.id)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold">حذف</button></div></div>)}</section>}

      {activeTab === 'game' && pendingGames.length > 0 && <section className="bg-white rounded-3xl border border-amber-200 p-4 space-y-3"><h3 className="text-sm font-extrabold text-slate-900">ألعاب بانتظار الاعتماد</h3>{pendingGames.map((item) => <div key={item.id} className="border border-slate-100 rounded-2xl p-3 space-y-2"><div className="flex justify-between"><span className="text-xs font-bold">{item.title}</span><span className="text-[11px] text-amber-700">بانتظار الاعتماد</span></div><p className="text-xs text-slate-600">السنة {item.levelIds?.[0]?.replace('lvl_p', '')} · {item.fieldName} · {item.description}</p><div className="flex gap-2"><button onClick={() => onApproveKnowledgeItem?.(item.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[11px] font-bold">اعتماد</button><input value={rejectionDraft[item.id] || ''} onChange={(e) => setRejectionDraft({ ...rejectionDraft, [item.id]: e.target.value })} placeholder="سبب الرفض" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px]" /><button disabled={!rejectionDraft[item.id]?.trim()} onClick={() => onRejectKnowledgeItem?.(item.id, rejectionDraft[item.id])} className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-[11px] font-bold disabled:opacity-40">رفض</button></div></div>)}</section>}

      {activeTab === 'educational_situation' ? (
        <EducationalSituationsBankView currentUser={currentUser} embedded />
      ) : activeTab === 'community_resource' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCommunityResources.map((resource) => (
            <article
              key={resource.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  مورد تعليمي مشترك
                </span>
                <span className="text-[10px] text-slate-500">{resource.authorName}</span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">{resource.title}</h3>
              <p className="text-xs leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-2xl">
                {resource.description}
              </p>
              <p className="text-[11px] text-slate-500">النوع: {resource.type}</p>
            </article>
          ))}
          {!filteredCommunityResources.length && (
            <p className="md:col-span-2 rounded-2xl border bg-white p-6 text-center text-sm text-slate-500">
              لا توجد موارد تعليمية مشتركة مطابقة.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {item.fieldName || 'الميدان العام'}
                </span>
              </div>

              <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                {item.description}
              </p>

              {item.rules && (
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-800 block">طريقة التنفيذ والقوانين:</span>
                  <p className="text-slate-600 text-[11px]">{item.rules}</p>
                </div>
              )}

              {item.equipment && item.equipment.length > 0 && (
                <div className="text-[11px] text-slate-500 font-medium">
                  <span className="font-bold text-slate-700">الأدوات المستعملة:</span>{' '}
                  {item.equipment.join('، ')}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  المصدر:{' '}
                  {item.approvalStatus === 'APPROVED' ? 'معتمد' : 'اقتراح'}
                </span>

                <button
                  onClick={() => handleCopyText(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ النص</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
