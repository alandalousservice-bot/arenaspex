import React from 'react';
import {
  ShieldCheck,
  Megaphone,
  MessageSquare,
  Plus,
  Users,
  Award,
  BarChart3,
} from 'lucide-react';
import { User } from '../../../types/spex';

export type InspectorMainTab =
  | 'overview'
  | 'resource_validation'
  | 'inspection_reports'
  | 'curriculum_audit'
  | 'district_broadcasts'
  | 'chat';

interface InspectorHeroHeaderProps {
  inspector: User;
  activeTab: InspectorMainTab;
  onSelectTab: (tab: InspectorMainTab) => void;
  pendingResourcesCount?: number;
  onOpenBroadcastModal: () => void;
  onOpenVisitModal: () => void;
}

export const InspectorHeroHeader: React.FC<InspectorHeroHeaderProps> = ({
  inspector,
  activeTab,
  onSelectTab,
  pendingResourcesCount = 0,
  onOpenBroadcastModal,
  onOpenVisitModal,
}) => {
  const directorateText =
    inspector.directorateId === 'setif_de'
      ? 'مديرية التربية لولاية سطيف'
      : inspector.directorateId || 'مديرية التربية والتعليم';

  const districtText =
    inspector.districtId === 'dist_setif_7'
      ? 'المقاطعة 07 (عين أزال)'
      : inspector.districtId || 'المقاطعة التفتيشية';

  return (
    <div className="space-y-4 dir-rtl">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-900/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-emerald-100 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {directorateText} - {districtText} (المفتش: {inspector.firstName} {inspector.lastName})
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              بوابة المفتش البيداغوجي: {inspector.firstName} {inspector.lastName}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              الإشراف والتأطير البيداغوجي المكتمل: متابعة ملفات الأساتذة، المصادقة والاعتماد البيداغوجي للموارد، سجل التقارير والزيارات التفتيشية الرسمية، وتدقيق التوزيع السنوي.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenBroadcastModal}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-slate-950" />
              <span>📢 بث تعليمة للمقاطعة</span>
            </button>
            <button
              onClick={onOpenVisitModal}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل زيارة تفتيشية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => onSelectTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>📊 متابعة الأساتذة بالمقاطعة</span>
        </button>

        <button
          onClick={() => onSelectTab('resource_validation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap relative ${
            activeTab === 'resource_validation'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>🛡️ مركز اعتمادات الموارد</span>
          {pendingResourcesCount > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingResourcesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('inspection_reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inspection_reports'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>📋 تقارير وتوجيهات المعاينات</span>
        </button>

        <button
          onClick={() => onSelectTab('curriculum_audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'curriculum_audit'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span>📈 التدقيق البيداغوجي للمنهاج</span>
        </button>

        <button
          onClick={() => onSelectTab('district_broadcasts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'district_broadcasts'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-700" />
          <span>📢 التوجيهات والندوات التربوية</span>
        </button>

        <button
          onClick={() => onSelectTab('chat')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'chat'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-200" />
          <span>💬 التواصل المباشر مع الأستاذ</span>
        </button>
      </div>
    </div>
  );
};
