/**
 * SPEX - Educational Knowledge Engine View Component
 * محرك المعرفة التربوية: بنك الأهداف، الألعاب، الوضعيات التعلمية والأنشطة العلاجية
 */

import React, { useState } from 'react';
import {
  BrainCircuit,
  Search,
  Plus,
  Gamepad2,
  Target,
  Layers,
  Sparkles,
  Copy,
  Check,
  Star,
  BookOpen
} from 'lucide-react';
import { CommunityResource, KnowledgeItem, KnowledgeCategory } from '../../types/spex';
import { requestAIGames } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { EducationalSituationsBankView } from '../educationalSituations/EducationalSituationsBankView';
import { User } from '../../types/spex';

interface KnowledgeEngineViewProps {
  knowledgeItems: KnowledgeItem[];
  onAddKnowledgeItem: (item: Partial<KnowledgeItem>) => void;
  currentUser: User;
  communityResources?: CommunityResource[];
}

export function selectApprovedCommunityResources(resources: CommunityResource[]): CommunityResource[] {
  return resources.filter(
    (resource) => resource.isApprovedByInspector || resource.authorRole === 'inspector' || resource.authorRole === 'admin'
  );
}

export const KnowledgeEngineView: React.FC<KnowledgeEngineViewProps> = ({
  knowledgeItems,
  onAddKnowledgeItem,
  currentUser,
  communityResources = []
}) => {
  const [activeTab, setActiveTab] = useState<KnowledgeCategory | 'educational_situation' | 'community_resource'>('game');
  const [searchVal, setSearchVal] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSuggestingGames, setIsSuggestingGames] = useState(false);
  // تأخير التصفية عن الطباعة المباشرة لتقليل عمليات إعادة الرسم على القوائم الكبيرة
  const debouncedSearchVal = useDebounce(searchVal, 300);

  const filteredItems = knowledgeItems.filter((item) => {
    const matchesCategory = item.category === activeTab;
    const matchesSearch =
      item.title.includes(debouncedSearchVal) ||
      item.description.includes(debouncedSearchVal) ||
      item.tags.some((t) => t.includes(debouncedSearchVal));
    return matchesCategory && matchesSearch;
  });
  const approvedCommunityResources = selectApprovedCommunityResources(communityResources);
  const filteredCommunityResources = approvedCommunityResources.filter((resource) => {
    const query = debouncedSearchVal.trim();
    return !query || resource.title.includes(query) || resource.description.includes(query) || resource.authorName.includes(query);
  });

  const handleCopyText = (item: KnowledgeItem) => {
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

  const handleRequestAIGames = async () => {
    setIsSuggestingGames(true);
    try {
      const suggestedGames = await requestAIGames('الميدان العام والألعاب الجماعية', 'الطور الابتدائي');
      suggestedGames.forEach((g: any, i: number) => {
        onAddKnowledgeItem({
          category: 'game',
          title: g.title,
          description: g.description,
          fieldName: 'الميدان الجماعي',
          levelName: 'جميع المستويات',
          tags: ['مقترح بيداغوجي', 'لعبة رياضية'],
          equipment: g.equipment || ['أقماع', 'كرات'],
          rules: g.rules,
          duration: g.duration || '10 دقائق',
          approved: true,
          createdBy: 'بنك المعرفة البيداغوجية SPEX',
          usageCount: 1,
          rating: 4.8
        });
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggestingGames(false);
    }
  };

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
          onClick={handleRequestAIGames}
          disabled={isSuggestingGames}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
          <span>{isSuggestingGames ? 'جاري الاستخراج من بنك المعرفة...' : 'استخراج ألعاب بيداغوجية موصى بها'}</span>
        </button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('game')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'game' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>بنك الألعاب التربوية</span>
          </button>

          <button
            onClick={() => setActiveTab('objective')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'objective' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>بنك الأهداف الإجرائية</span>
          </button>

          <button
            onClick={() => setActiveTab('situation')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'situation' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>الوضعيات التعلمية</span>
          </button>

          <button
            onClick={() => setActiveTab('remedial')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'remedial' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>الأنشطة العلاجية</span>
          </button>

          <button
            onClick={() => setActiveTab('educational_situation')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'educational_situation' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>المواقف التربوية</span>
          </button>

          {approvedCommunityResources.length > 0 && (
            <button
              onClick={() => setActiveTab('community_resource')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'community_resource' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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

      {activeTab === 'educational_situation' ? (
        <EducationalSituationsBankView currentUser={currentUser} embedded />
      ) : activeTab === 'community_resource' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCommunityResources.map((resource) => (
            <article key={resource.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">مورد تعليمي مشترك</span>
                <span className="text-[10px] text-slate-500">{resource.authorName}</span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">{resource.title}</h3>
              <p className="text-xs leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-2xl">{resource.description}</p>
              <p className="text-[11px] text-slate-500">النوع: {resource.type}</p>
            </article>
          ))}
          {!filteredCommunityResources.length && <p className="md:col-span-2 rounded-2xl border bg-white p-6 text-center text-sm text-slate-500">لا توجد موارد تعليمية مشتركة مطابقة.</p>}
        </div>
      ) : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {item.fieldName || 'الميدان العام'}
              </span>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{item.rating}</span>
                </div>
                <span>({item.usageCount} استخدام)</span>
              </div>
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
                <span className="font-bold text-slate-700">الأدوات المستعملة:</span> {item.equipment.join('، ')}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">بواسطة: {item.createdBy}</span>

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
      </div>}
    </div>
  );
};
