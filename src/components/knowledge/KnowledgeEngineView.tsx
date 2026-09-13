/**
 * SPEX - Educational Knowledge Engine View Component
 * محرك المعرفة التربوية: بنك الأهداف، الألعاب، الأنشطة العلاجية والمواقف التربوية
 */

import React, { useMemo, useState } from 'react';
import { BrainCircuit, Search, Plus, Target, Layers, Copy, Check, BookOpen } from 'lucide-react';
import { CommunityResource, KnowledgeItem } from '../../types/spex';
import { requestPedagogicalGameSuggestion } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { EducationalSituationsBankView } from '../educationalSituations/EducationalSituationsBankView';
import { User } from '../../types/spex';
import {
  buildKnowledgeCoverage,
  CoverageStatus,
  CurriculumObjectiveReference,
  canViewCoverageDiagnostics,
} from '../../services/knowledgeCoverage.service';
import {
  buildObjectiveBankReadModel,
  filterObjectiveBankReadModel,
  objectiveAdoptionLabel,
  ObjectiveBankReadModel,
} from '../../services/objectiveBankReadModel.service';
import { situationDomainLabel } from '../../services/pedagogicalSituationReadModel.service';

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
  'objective',
  'remedial',
  'educational_situation',
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
}) => {
  const [activeTab, setActiveTab] =
    useState<(typeof KNOWLEDGE_BANK_CATEGORIES)[number]>('educational_situation');
  const [searchVal, setSearchVal] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<
    KnowledgeItem | CurriculumObjectiveReference | null
  >(null);
  const [isSuggestingGames, setIsSuggestingGames] = useState(false);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionGrade, setSuggestionGrade] = useState(1);
  const [suggestionField, setSuggestionField] = useState('f_fundamentals');
  const [suggestionObjectiveId, setSuggestionObjectiveId] = useState('');
  const [suggestionObjectiveText, setSuggestionObjectiveText] = useState('');
  const [suggestionConstraints, setSuggestionConstraints] = useState({
    equipment: '',
    groupSize: '',
    environment: '',
    difficulty: '',
  });
  const [suggestionDraft, setSuggestionDraft] = useState<Partial<KnowledgeItem> | null>(null);
  const [suggestionError, setSuggestionError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [rejectionDraft, setRejectionDraft] = useState<Record<string, string>>({});
  const [showCoverage, setShowCoverage] = useState(false);
  const [objectiveGrade, setObjectiveGrade] = useState('all');
  const [objectiveField, setObjectiveField] = useState('all');
  const [objectiveFinalCompetency, setObjectiveFinalCompetency] = useState('all');
  const [objectiveLearningSection, setObjectiveLearningSection] = useState('all');
  const [objectiveAdoption, setObjectiveAdoption] = useState('all');
  // تأخير التصفية عن الطباعة المباشرة لتقليل عمليات إعادة الرسم على القوائم الكبيرة
  const debouncedSearchVal = useDebounce(searchVal, 300);

  const objectiveItems = buildObjectiveBankReadModel(knowledgeItems);
  const finalCompetencies = [
    ...new Set(objectiveItems.map((item) => item.finalCompetency).filter(Boolean)),
  ];
  const learningSections = [
    ...new Set(objectiveItems.map((item) => item.learningSection).filter(Boolean)),
  ];
  const suggestionObjectives = useMemo(
    () =>
      objectiveItems
        .filter(
          (item) =>
            item.levelId === `lvl_p${suggestionGrade}` ||
            item.levelIds?.includes(`lvl_p${suggestionGrade}`)
        )
        .filter((item) => item.fieldId === suggestionField),
    [objectiveItems, suggestionGrade, suggestionField]
  );
  const filteredItems =
    activeTab === 'objective'
      ? filterObjectiveBankReadModel(objectiveItems, {
          search: debouncedSearchVal,
          gradeId: objectiveGrade === 'all' ? undefined : objectiveGrade,
          domainId: objectiveField === 'all' ? undefined : objectiveField,
          finalCompetency:
            objectiveFinalCompetency === 'all' ? undefined : objectiveFinalCompetency,
          learningSection:
            objectiveLearningSection === 'all' ? undefined : objectiveLearningSection,
          adoptionStatus:
            objectiveAdoption === 'all' ? undefined : (objectiveAdoption as 'ADOPTED' | 'UNUSED'),
        })
      : knowledgeItems.filter((item) => {
          const matchesCategory = item.category === activeTab;
          const matchesSearch =
            item.title.includes(debouncedSearchVal) ||
            item.description.includes(debouncedSearchVal) ||
            item.tags.some((t) => t.includes(debouncedSearchVal));
          return item.approved && matchesCategory && matchesSearch;
        });
  const isCanonicalObjective = (
    item: KnowledgeItem | CurriculumObjectiveReference
  ): item is CurriculumObjectiveReference => 'canonicalObjectiveId' in item;
  const isObjectiveBankModel = (
    item: KnowledgeItem | CurriculumObjectiveReference
  ): item is ObjectiveBankReadModel => 'adoptionStatus' in item;
  const objectiveStatus = (item: KnowledgeItem | CurriculumObjectiveReference) => {
    if (isObjectiveBankModel(item)) return objectiveAdoptionLabel(item.adoptionStatus);
    if (isCanonicalObjective(item)) {
      return item.adoptedInCurrentSection ? 'معتمد في المقطع' : 'غير مستخدم في المقطع الحالي';
    }
    return item.approvalStatus === 'APPROVED' ? 'مرجع معتمد' : 'مقترح';
  };
  const objectiveAlternatives =
    selectedObjective && isObjectiveBankModel(selectedObjective)
      ? selectedObjective.alternativeObjectives
          .map((alternative) => objectiveItems.find((item) => item.id === alternative.objectiveId))
          .filter((item): item is ObjectiveBankReadModel => Boolean(item))
      : [];
  const coverage = buildKnowledgeCoverage({ knowledgeItems });
  const canViewCoverage = canViewCoverageDiagnostics(currentUser.role);
  const statusLabel: Record<CoverageStatus, string> = {
    EMPTY: 'فارغة',
    LOW: 'منخفضة',
    ADEQUATE: 'كافية',
  };
  const ownEditableGames = knowledgeItems.filter(
    (item) =>
      item.category === 'game' &&
      item.ownerId === currentUser.id &&
      (item.approvalStatus === 'DRAFT' || item.approvalStatus === 'REJECTED')
  );
  const pendingGames = knowledgeItems.filter(
    (item) =>
      item.category === 'game' &&
      (item.approvalStatus === 'PENDING_APPROVAL' || item.approvalStatus === 'PENDING_REVIEW') &&
      (currentUser.role === 'admin' || currentUser.role === 'inspector')
  );
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
        existingGames: knowledgeItems
          .filter(
            (item) =>
              item.category === 'game' &&
              item.approved &&
              item.fieldId === suggestionField &&
              (item.levelIds?.includes(`lvl_p${suggestionGrade}`) ||
                item.levelId === `lvl_p${suggestionGrade}`)
          )
          .map((item) => item.title),
        existingSituations: [],
        constraints: suggestionConstraints,
      });
      const draft: Partial<KnowledgeItem> = {
        category: 'game',
        title: textValue(candidate.title),
        description: textValue(candidate.description || candidate.pedagogicalPurpose),
        fieldId: suggestionField,
        fieldName: fieldLabel(suggestionField),
        levelIds: [`lvl_p${suggestionGrade}`],
        levelName: `السنة ${suggestionGrade} ابتدائي`,
        objectiveId: selected.id,
        objectiveText: selected.description,
        tags: ['اقتراح موقف تربوي', 'الحركات القاعدية'],
        equipment: stringList(candidate.equipment),
        rules: textValue(candidate.rules || candidate.organization),
        organization: textValue(candidate.organization),
        pedagogicalPurpose: textValue(candidate.pedagogicalPurpose || candidate.description),
        safetyGuidance: textValue(candidate.safety),
        progression: textValue(candidate.progression),
        approved: false,
        approvalStatus: 'DRAFT',
        origin: 'AI_GENERATED',
        createdBy: 'اقتراح',
        usageCount: 0,
        rating: 0,
      };
      if (!draft.title || !draft.description || !draft.rules) throw new Error('invalid_suggestion');
      const normalized = draft.title.trim().replace(/\s+/g, ' ');
      setDuplicateWarning(
        knowledgeItems.some(
          (item) =>
            item.category === 'game' &&
            item.approved &&
            item.fieldId === suggestionField &&
            item.levelIds?.includes(`lvl_p${suggestionGrade}`) &&
            item.title.trim().replace(/\s+/g, ' ') === normalized
        )
      );
      setSuggestionDraft(draft);
    } catch (error) {
      const message =
        error instanceof Error &&
        (error.message === 'خدمة اقتراح الألعاب غير مفعلة لحسابك.' ||
          error.message === 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.')
          ? error.message
          : 'تعذر إنشاء الاقتراح. يرجى المحاولة مرة أخرى.';
      setSuggestionError(message);
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

  const fieldLabel = (fieldId: string) =>
    ({
      f_locomotion: 'الوضعيات والتنقلات',
      f_fundamentals: 'الحركات القاعدية',
      f_structuring: 'الهيكلة والبناء',
    })[fieldId] || fieldId;
  const textValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const stringList = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === 'string' && !!item.trim())
          .map((item) => item.trim())
      : typeof value === 'string'
        ? value
            .split(/[،,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

  return (
    <div className="workspace-page workspace-page--knowledge space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="workspace-header bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            قاعدة المعرفة الوطنية
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <span>
              محرك المعرفة التربوية{' '}
              <small className="knowledge-engine-title-en">Educational Knowledge Engine</small>
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            مكتبة متكاملة للبحث والتنفيذ السريع للأهداف والمواقف التربوية والأنشطة العلاجية
          </p>
        </div>

        <button
          onClick={() => {
            setShowSuggestionForm(true);
            setActiveTab('educational_situation');
            setSuggestionError('');
          }}
          disabled={isSuggestingGames}
          className="workspace-button-primary flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>اقتراح موقف تربوي</span>
        </button>
      </div>

      {showSuggestionForm && (
        <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">اقتراح موقف تربوي</h3>
              <p className="text-xs text-slate-500">
                اختر السنة والميدان والهدف، ثم راجع الاقتراح قبل حفظه.
              </p>
            </div>
            <button
              onClick={() => setShowSuggestionForm(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              إغلاق
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs font-bold text-slate-700">
              السنة
              <select
                value={suggestionGrade}
                onChange={(e) => {
                  setSuggestionGrade(Number(e.target.value));
                  setSuggestionObjectiveId('');
                }}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-normal"
              >
                {[1, 2, 3, 4, 5].map((grade) => (
                  <option key={grade} value={grade}>
                    السنة {grade}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              الميدان
              <select
                value={suggestionField}
                onChange={(e) => {
                  setSuggestionField(e.target.value);
                  setSuggestionObjectiveId('');
                }}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-normal"
              >
                <option value="f_locomotion">الوضعيات والتنقلات</option>
                <option value="f_fundamentals">الحركات القاعدية</option>
                <option value="f_structuring">الهيكلة والبناء</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              الهدف / المهارة
              <select
                value={suggestionObjectiveId}
                onChange={(e) => {
                  setSuggestionObjectiveId(e.target.value);
                  setSuggestionObjectiveText(
                    suggestionObjectives.find((item) => item.id === e.target.value)?.description ||
                      ''
                  );
                }}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-normal"
              >
                <option value="">اختر من المراجع المنهجية</option>
                {suggestionObjectives.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={suggestionConstraints.equipment}
              onChange={(e) =>
                setSuggestionConstraints({ ...suggestionConstraints, equipment: e.target.value })
              }
              placeholder="الوسائل المتاحة (اختياري)"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
            <input
              value={suggestionConstraints.groupSize}
              onChange={(e) =>
                setSuggestionConstraints({ ...suggestionConstraints, groupSize: e.target.value })
              }
              placeholder="حجم الفوج (اختياري)"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
            <input
              value={suggestionConstraints.environment}
              onChange={(e) =>
                setSuggestionConstraints({ ...suggestionConstraints, environment: e.target.value })
              }
              placeholder="الفضاء (اختياري)"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
            <input
              value={suggestionConstraints.difficulty}
              onChange={(e) =>
                setSuggestionConstraints({ ...suggestionConstraints, difficulty: e.target.value })
              }
              placeholder="الصعوبة (اختياري)"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
          </div>
          {suggestionObjectiveText && (
            <p className="text-xs text-indigo-700 bg-indigo-50 rounded-xl p-3">
              الهدف المختار: {suggestionObjectiveText}
            </p>
          )}
          {suggestionError && (
            <p className="text-xs text-rose-600 bg-rose-50 rounded-xl p-3">{suggestionError}</p>
          )}
          {duplicateWarning && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
              يوجد في البنك محتوى مشابه لهذا الاقتراح. راجع المحتوى قبل الحفظ.
            </p>
          )}
          <button
            onClick={handleCreateSuggestion}
            disabled={isSuggestingGames}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs disabled:opacity-50"
          >
            {isSuggestingGames ? 'جاري إعداد الاقتراح...' : 'إنشاء اقتراح'}
          </button>
        </section>
      )}

      {suggestionDraft && (
        <section className="bg-white rounded-3xl p-6 border border-indigo-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">مراجعة الاقتراح قبل الحفظ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={suggestionDraft.title || ''}
              onChange={(e) => setSuggestionDraft({ ...suggestionDraft, title: e.target.value })}
              placeholder="اسم اللعبة"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
            <input
              value={suggestionDraft.pedagogicalPurpose || ''}
              onChange={(e) =>
                setSuggestionDraft({
                  ...suggestionDraft,
                  pedagogicalPurpose: e.target.value,
                  description: e.target.value,
                })
              }
              placeholder="الهدف التربوي المختصر"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
            <textarea
              value={suggestionDraft.organization || ''}
              onChange={(e) =>
                setSuggestionDraft({ ...suggestionDraft, organization: e.target.value })
              }
              placeholder="التنظيم"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-20"
            />
            <textarea
              value={suggestionDraft.rules || ''}
              onChange={(e) => setSuggestionDraft({ ...suggestionDraft, rules: e.target.value })}
              placeholder="سير اللعبة والقواعد"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-20"
            />
            <textarea
              value={suggestionDraft.safetyGuidance || ''}
              onChange={(e) =>
                setSuggestionDraft({ ...suggestionDraft, safetyGuidance: e.target.value })
              }
              placeholder="توجيهات السلامة"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-20"
            />
            <textarea
              value={suggestionDraft.progression || ''}
              onChange={(e) =>
                setSuggestionDraft({ ...suggestionDraft, progression: e.target.value })
              }
              placeholder="التبسيط والتدرج"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-20"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveSuggestionDraft}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              حفظ كمسودة
            </button>
            <button
              onClick={() => setSuggestionDraft(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
          </div>
        </section>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="workspace-tabs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('objective')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'objective'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>بنك الأهداف</span>
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
              <h3 className="text-sm font-bold text-slate-900">تغطية بنك المعرفة</h3>
              <p className="text-xs text-slate-500">
                مؤشر تشخيصي داخلي: فارغة = 0، منخفضة = 1–2، كافية = 3 فأكثر.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              15 خلية · الموارد المشتركة متاحة من المجتمع المهني
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
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
      {activeTab === 'objective' && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
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
          <select
            value={objectiveFinalCompetency}
            onChange={(e) => setObjectiveFinalCompetency(e.target.value)}
            className="max-w-xs bg-white border border-slate-200 rounded-xl px-3 py-2"
          >
            <option value="all">كل الكفاءات الختامية</option>
            {finalCompetencies.map((competency) => (
              <option key={competency} value={competency}>
                {competency}
              </option>
            ))}
          </select>
          <select
            value={objectiveLearningSection}
            onChange={(e) => setObjectiveLearningSection(e.target.value)}
            className="max-w-xs bg-white border border-slate-200 rounded-xl px-3 py-2"
          >
            <option value="all">كل المقاطع والحصص</option>
            {learningSections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
          <select
            value={objectiveAdoption}
            onChange={(e) => setObjectiveAdoption(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2"
          >
            <option value="all">كل حالات الاستخدام</option>
            <option value="ADOPTED">معتمد في المقطع</option>
            <option value="UNUSED">غير مستخدم في المقطع الحالي</option>
          </select>
        </div>
      )}

      {activeTab === 'educational_situation' && ownEditableGames.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-200/80 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">مواقفي المقترحة الخاصة</h3>
          {ownEditableGames.map((item) => (
            <div key={item.id} className="border border-slate-100 rounded-2xl p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs font-bold">{item.title}</span>
                <span className="text-xs text-amber-700">
                  {item.approvalStatus === 'REJECTED' ? 'مرفوض' : 'مسودة'}
                </span>
              </div>
              {item.rejectionReason && (
                <p className="text-xs text-rose-700 bg-rose-50 rounded-xl p-2">
                  سبب الرفض: {item.rejectionReason}
                </p>
              )}
              <textarea
                value={item.rules || ''}
                onChange={(e) => onUpdateKnowledgeItem?.(item.id, { rules: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-16"
                placeholder="القواعد والتوجيهات"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onSubmitKnowledgeItem?.(item.id)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  إرسال للاعتماد
                </button>
                <button
                  onClick={() => onDeleteKnowledgeItem?.(item.id)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'educational_situation' && pendingGames.length > 0 && (
        <section className="bg-white rounded-3xl border border-amber-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">مواقف بانتظار الاعتماد</h3>
          {pendingGames.map((item) => (
            <div key={item.id} className="border border-slate-100 rounded-2xl p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs font-bold">{item.title}</span>
                <span className="text-xs text-amber-700">بانتظار الاعتماد</span>
              </div>
              <p className="text-xs text-slate-600">
                السنة {item.levelIds?.[0]?.replace('lvl_p', '')} ·{' '}
                {situationDomainLabel(item.fieldId, item.fieldName) || 'الميدان العام'} ·{' '}
                {item.description}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onApproveKnowledgeItem?.(item.id)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                >
                  اعتماد
                </button>
                <input
                  value={rejectionDraft[item.id] || ''}
                  onChange={(e) =>
                    setRejectionDraft({ ...rejectionDraft, [item.id]: e.target.value })
                  }
                  placeholder="سبب الرفض"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                />
                <button
                  disabled={!rejectionDraft[item.id]?.trim()}
                  onClick={() => onRejectKnowledgeItem?.(item.id, rejectionDraft[item.id])}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40"
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'educational_situation' ? (
        <EducationalSituationsBankView
          currentUser={currentUser}
          embedded
          legacyGames={knowledgeItems.filter((item) => item.category === 'game')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {item.fieldName || 'الميدان العام'}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  {objectiveStatus(item)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedObjective(item)}
                className="w-full text-right text-sm font-bold text-slate-900 leading-snug hover:text-indigo-700"
              >
                {item.title}
              </button>
              <p className="text-xs text-slate-500">{item.levelName || 'مرجع متعدد السنوات'}</p>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                {item.description}
              </p>

              {isCanonicalObjective(item) && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">ما يخدمه:</span> {item.learningContent}
                </p>
              )}

              {isObjectiveBankModel(item) && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">ماذا يكتسب المتعلم؟</span>{' '}
                  {item.learnerAcquisition}
                </p>
              )}

              {item.rules && (
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-800 block">طريقة التنفيذ والقوانين:</span>
                  <p className="text-slate-600 text-xs">{item.rules}</p>
                </div>
              )}

              {item.equipment && item.equipment.length > 0 && (
                <div className="text-xs text-slate-500 font-medium">
                  <span className="font-bold text-slate-700">الأدوات المستعملة:</span>{' '}
                  {item.equipment.join('، ')}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  المصدر: {item.approvalStatus === 'APPROVED' ? 'معتمد' : 'اقتراح'}
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
              <button
                type="button"
                onClick={() => setSelectedObjective(item)}
                className="w-full rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                فتح تفاصيل الهدف
              </button>
            </article>
          ))}
        </div>
      )}
      {selectedObjective && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onClick={() => setSelectedObjective(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="objective-details-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 text-right shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-700">تفاصيل الهدف البيداغوجية</span>
                <h3 id="objective-details-title" className="mt-1 text-lg font-black text-slate-900">
                  {selectedObjective.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedObjective.levelName || 'مرجع متعدد السنوات'} —{' '}
                  {selectedObjective.fieldName || 'الميدان العام'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedObjective(null)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
              >
                إغلاق
              </button>
            </div>

            {isCanonicalObjective(selectedObjective) ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <DetailBlock label="الكفاءة الختامية" value={selectedObjective.finalCompetency} />
                {selectedObjective.learningSection && (
                  <DetailBlock label="المقطع المرتبط" value={selectedObjective.learningSection} />
                )}
                <DetailBlock
                  label="ماذا يكتسب المتعلم؟"
                  value={selectedObjective.learningContent}
                />
                <DetailBlock label="المعارف المجندة" value={selectedObjective.mobilizedKnowledge} />
                <DetailBlock label="محتوى التنفيذ" value={selectedObjective.executionContent} />
                <DetailBlock label="التوجيهات" value={selectedObjective.guidance} />
                {isObjectiveBankModel(selectedObjective) && (
                  <>
                    <DetailBlock
                      label="المتطلبات"
                      value={selectedObjective.requirements.join('، ')}
                    />
                    <DetailBlock
                      label="المهارات والمكونات"
                      value={selectedObjective.skills.join('، ')}
                    />
                    {selectedObjective.progression && (
                      <DetailBlock label="موقعه في التدرج" value={selectedObjective.progression} />
                    )}
                    <DetailBlock
                      label="لماذا هذا الهدف؟"
                      value={selectedObjective.whyThisObjective}
                    />
                    <DetailBlock
                      label="ماذا يكتسب المتعلم؟"
                      value={selectedObjective.learnerAcquisition}
                    />
                  </>
                )}
                <DetailBlock label="وزن الترتيب" value={String(selectedObjective.sequenceWeight)} />
                {selectedObjective.resourceLabels.length > 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black text-slate-700">الموارد المرتبطة</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {selectedObjective.resourceLabels.join('، ')}
                    </p>
                    {selectedObjective.resourceFamilies.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        العائلات: {selectedObjective.resourceFamilies.join('، ')}
                      </p>
                    )}
                  </div>
                )}
                {selectedObjective.transversalResources.length > 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black text-slate-700">المكونات العرضية</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {selectedObjective.transversalResources.join('، ')}
                    </p>
                  </div>
                )}
                {isObjectiveBankModel(selectedObjective) && (
                  <>
                    {selectedObjective.criteria.length > 0 && (
                      <DetailBlock
                        label="المعايير المرتبطة بالميدان"
                        value={selectedObjective.criteria.join('، ')}
                      />
                    )}
                    {selectedObjective.indicators.length > 0 && (
                      <DetailBlock
                        label="المؤشرات المرتبطة بالميدان"
                        value={selectedObjective.indicators.join('، ')}
                      />
                    )}
                  </>
                )}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 md:col-span-2">
                  <p className="text-xs font-black text-indigo-800">سبب الظهور في المقطع</p>
                  <p className="mt-2 text-xs text-indigo-900">
                    {isObjectiveBankModel(selectedObjective)
                      ? selectedObjective.whyThisObjective
                      : selectedObjective.adoptedInCurrentSection
                        ? 'هذا الهدف موجود ضمن تسلسل المقطع الحالي في المرجع المنهجي.'
                        : 'هذا الهدف موجود في البنك canonical، لكنه غير ظاهر ضمن تسلسل المقطع الحالي وفق البيانات المتاحة.'}
                  </p>
                </div>
                {isObjectiveBankModel(selectedObjective) &&
                  selectedObjective.alternativeWording.length > 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                      <p className="text-xs font-black text-slate-700">صياغات بديلة</p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        {selectedObjective.alternativeWording.map((alternative) => (
                          <li key={`${alternative.objectiveId}-${alternative.wording}`}>
                            {alternative.wording}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            ) : (
              <div className="mt-5">
                <DetailBlock label="الوصف" value={selectedObjective.description} />
                <DetailBlock label="الوسائل" value={selectedObjective.equipment?.join('، ')} />
                <DetailBlock label="التوجيهات" value={selectedObjective.rules} />
              </div>
            )}

            {objectiveAlternatives.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-black text-slate-800">أهداف أخرى تخدم الكفاءة</h4>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {objectiveAlternatives.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedObjective(item)}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-right text-xs font-bold text-slate-700 hover:border-indigo-300"
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const DetailBlock: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-xs font-black text-slate-700">{label}</p>
    <p className="mt-2 text-xs leading-relaxed text-slate-600">{value || 'لا توجد بيانات متاحة'}</p>
  </div>
);
