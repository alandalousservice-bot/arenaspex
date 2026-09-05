import React from 'react';
import { MessageSquare, BrainCircuit, Target, ArrowUpRight } from 'lucide-react';
import { NavTab } from '../../layout/Sidebar';

interface QuickAccessPanelProps {
  onNavigateTab: (tab: NavTab) => void;
}

interface QuickAccessTile {
  tab: NavTab;
  icon: React.ReactNode;
  iconWrapperClassName: string;
  title: string;
  subtitle: string;
  badge?: string;
  highlighted?: boolean;
}

const TILES: QuickAccessTile[] = [
  {
    tab: 'professional_hub',
    icon: <MessageSquare className="w-4 h-4" />,
    iconWrapperClassName: 'bg-blue-600 text-white shadow-xs',
    title: 'فضاء التواصل المهني',
    subtitle: 'دردشة المقاطعة والرسائل المباشرة والمجتمع في ميزة واحدة',
    badge: 'جديد',
    highlighted: true,
  },
  {
    tab: 'knowledge_engine',
    icon: <BrainCircuit className="w-4 h-4" />,
    iconWrapperClassName: 'bg-indigo-100 text-indigo-700',
    title: 'بنك الألعاب والوضعيات',
    subtitle: 'مكتبة شاملة للأهداف والألعاب الرياضية',
  },
  {
    tab: 'gradebook',
    icon: <Target className="w-4 h-4" />,
    iconWrapperClassName: 'bg-teal-100 text-teal-700',
    title: 'دفتر التقويم',
    subtitle: 'تقويم الكفاءات والعلامات ونتائج القسم',
  },
];

export const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ onNavigateTab }) => {
  return (
    <div className="workspace-card workspace-quick-access bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
        الوصول السريع للوحدات
      </h3>

      {TILES.map((tile) =>
        tile.highlighted ? (
          <button
            key={tile.tab}
            onClick={() => onNavigateTab(tile.tab)}
            className="w-full text-right p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 transition-all flex items-center justify-between group cursor-pointer border border-blue-200/80 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${tile.iconWrapperClassName}`}>{tile.icon}</div>
              <div>
                <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <span>{tile.title}</span>
                  {tile.badge && (
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                      {tile.badge}
                    </span>
                  )}
                </div>
                <div className="text-xs text-blue-700/90 font-medium">{tile.subtitle}</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <button
            key={tile.tab}
            onClick={() => onNavigateTab(tile.tab)}
            className="w-full text-right p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 hover:text-blue-700 transition-all flex items-center justify-between group cursor-pointer border border-slate-100"
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${tile.iconWrapperClassName}`}>{tile.icon}</div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                  {tile.title}
                </div>
                <div className="text-xs text-slate-500">{tile.subtitle}</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
          </button>
        )
      )}
    </div>
  );
};
