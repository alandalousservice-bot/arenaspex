/**
 * SPEX - Sidebar Component
 * القائمة الجانبية الموحدة لجميع وحدات النظام مع تمييز الدور والوظائف
 */

import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Layers,
  BookMarked,
  FileText,
  BrainCircuit,
  Target,
  GraduationCap,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  Sparkles,
  X,
  Menu,
  Clock,
  MessageSquare,
  Timer,
  Users
} from 'lucide-react';
import { UserRole } from '../../types/spex';

export type NavTab =
  | 'dashboard'
  | 'annual_plan'
  | 'annual_schedule'
  | 'weekly_schedule'
  | 'learning_segments'
  | 'daily_notebook'
  | 'lesson_plans'
  | 'lesson_command_center'
  | 'knowledge_engine'
  | 'competency_assessment'
  | 'gradebook'
  | 'district_chat'
  | 'professional_community'
  | 'inspector_portal'
  | 'director_portal'
  | 'admin_portal'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadInspectorNotesCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  collapsed,
  onToggleCollapse,
  unreadInspectorNotesCount = 1,
  isMobileOpen = false,
  onCloseMobile,
  onOpenMobile
}) => {
  const handleItemClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };
  // Navigation config according to userRole
  const getNavSections = () => {
    if (userRole === 'teacher') {
      return {
        title: 'الوحدات البيداغوجية للأستاذ',
        items: [
          { id: 'dashboard' as NavTab, label: 'لوحة القيادة', icon: LayoutDashboard },
          { id: 'professional_community' as NavTab, label: 'المجتمع المهني', icon: Users, badge: 'مجتمع SPEX', highlight: true },
          { id: 'annual_plan' as NavTab, label: 'المخطط السنوي للمناهج', icon: Calendar },
          { id: 'annual_schedule' as NavTab, label: 'التوزيع السنوي للحصص', icon: CalendarCheck },
          { id: 'weekly_schedule' as NavTab, label: 'التوزيع الأسبوعي للحصص', icon: Clock },
          { id: 'learning_segments' as NavTab, label: 'المقاطع التعليمية', icon: Layers },
          { id: 'daily_notebook' as NavTab, label: 'الكراس اليومي', icon: BookMarked, badge: 'اليوم' },
          { id: 'lesson_plans' as NavTab, label: 'مذكرات الحصص', icon: FileText },
          { id: 'lesson_command_center' as NavTab, label: 'مركز قيادة الحصة', icon: Timer, badge: 'مباشر', highlight: true },
          { id: 'knowledge_engine' as NavTab, label: 'بنك المعرفة التربوية', icon: BrainCircuit },
          { id: 'competency_assessment' as NavTab, label: 'تقويم الكفاءة الختامية', icon: Target },
          { id: 'gradebook' as NavTab, label: 'دفتر التنقيط والأقسام', icon: GraduationCap },
          { id: 'district_chat' as NavTab, label: 'دردشة ومتابعة المقاطعة', icon: MessageSquare },
        ]
      };
    }

    if (userRole === 'inspector') {
      return {
        title: 'بوابة الإشراف البيداغوجي',
        items: [
          { id: 'inspector_portal' as NavTab, label: 'بوابة المفتش البيداغوجي', icon: ShieldCheck, badge: unreadInspectorNotesCount > 0 ? `${unreadInspectorNotesCount} ملاحظة` : undefined },
          { id: 'professional_community' as NavTab, label: 'المجتمع المهني', icon: Users, badge: 'مجتمع SPEX', highlight: true },
          { id: 'district_chat' as NavTab, label: 'الدردشة الجماعية للمقاطعة', icon: MessageSquare },
          { id: 'knowledge_engine' as NavTab, label: 'بنك المعرفة والاعتماد', icon: BrainCircuit },
        ]
      };
    }

    if (userRole === 'director') {
      return {
        title: 'بوابة مدير المدرسة الابتدائية',
        items: [
          { id: 'director_portal' as NavTab, label: 'لوحة مدير المدرسة', icon: ShieldCheck },
          { id: 'professional_community' as NavTab, label: 'المجتمع المهني', icon: Users, badge: 'مجتمع SPEX', highlight: true },
          { id: 'knowledge_engine' as NavTab, label: 'بنك المعرفة التربوية', icon: BrainCircuit },
        ]
      };
    }

    // admin
    return {
      title: 'إدارة النظام وقواعد البيانات',
      items: [
        { id: 'admin_portal' as NavTab, label: 'لوحة التحكم والاشتراكات', icon: Building2 },
        { id: 'professional_community' as NavTab, label: 'المجتمع المهني', icon: Users, badge: 'مجتمع SPEX' },
        { id: 'knowledge_engine' as NavTab, label: 'إدارة بنك المعرفة', icon: BrainCircuit },
      ]
    };
  };

  const currentSection = getNavSections();

  const secondaryNavItems = [
    { id: 'reports' as NavTab, label: 'التقارير والتصدير', icon: FileSpreadsheet },
    { id: 'settings' as NavTab, label: 'الإعدادات والملف', icon: Settings }
  ];

  return (
    <>
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside
        className={`hidden md:flex bg-white border-l border-slate-200/80 flex-col justify-between transition-all duration-300 z-20 shrink-0 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          {/* Toggle Collapse Button */}
          <div className="flex items-center justify-between px-2">
            {!collapsed && (
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {currentSection.title}
              </span>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all mr-auto cursor-pointer"
              title={collapsed ? 'توسيع القائمة' : 'طّي القائمة'}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Primary Role Links */}
          <nav className="space-y-1">
            {currentSection.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative group ${
                    isActive
                      ? userRole === 'inspector'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                        : userRole === 'director'
                        ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                        : userRole === 'admin'
                        ? 'bg-purple-700 text-white shadow-md shadow-purple-700/25'
                        : 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-blue-600'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className={`mr-auto text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {!collapsed && item.highlight && !isActive && (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-auto animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Reports & Settings */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {!collapsed && (
              <div className="px-2 mb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                النظام والتصدير
              </div>
            )}
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Curriculum Banner */}
        {!collapsed && (
          <div className="m-3 p-3 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl shadow-md border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold text-emerald-300">المنهاج الرسمي معتمد</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              متوافق 100% مع التوجيهات البيداغوجية لوزارة التربية الوطنية الجزائرية.
            </p>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Slide-over Backdrop (For Smartphones) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          <div className="relative flex-1 max-w-xs w-full bg-white shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  SPEX
                </div>
                <span className="font-extrabold text-sm">القائمة الرئيسية للهاتف</span>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {currentSection.title}
              </div>

              <nav className="space-y-1.5">
                {currentSection.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-extrabold transition-all min-h-[44px] ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className={`mr-auto text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  النظام والتصدير
                </div>
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-extrabold transition-all min-h-[44px] ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-bold">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Fixed Quick Navigation Bar (For Smartphones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {userRole === 'teacher' ? (
          <>
            <button
              onClick={() => handleItemClick('dashboard')}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl min-w-[56px] min-h-[44px] justify-center transition-all ${
                currentTab === 'dashboard' ? 'text-blue-600 font-black' : 'text-slate-500 font-medium'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px]">الرئيسية</span>
            </button>

            <button
              onClick={() => handleItemClick('daily_notebook')}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl min-w-[56px] min-h-[44px] justify-center transition-all ${
                currentTab === 'daily_notebook' ? 'text-blue-600 font-black' : 'text-slate-500 font-medium'
              }`}
            >
              <BookMarked className="w-5 h-5" />
              <span className="text-[10px]">الكراس</span>
            </button>

            <button
              onClick={() => handleItemClick('lesson_plans')}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl min-w-[56px] min-h-[44px] justify-center transition-all relative ${
                currentTab === 'lesson_plans' ? 'text-blue-600 font-black' : 'text-slate-500 font-medium'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px]">المذكرات</span>
            </button>

            <button
              onClick={() => handleItemClick('competency_assessment')}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl min-w-[56px] min-h-[44px] justify-center transition-all ${
                currentTab === 'competency_assessment' ? 'text-blue-600 font-black' : 'text-slate-500 font-medium'
              }`}
            >
              <Target className="w-5 h-5" />
              <span className="text-[10px]">التقويم</span>
            </button>

            <button
              onClick={() => {
                if (isMobileOpen && onCloseMobile) {
                  onCloseMobile();
                } else if (onOpenMobile) {
                  onOpenMobile();
                }
              }}
              className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl min-w-[56px] min-h-[44px] justify-center text-slate-700 font-extrabold cursor-pointer"
            >
              <Menu className="w-5 h-5 text-blue-600" />
              <span className="text-[10px]">المزيد</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleItemClick(userRole === 'inspector' ? 'inspector_portal' : userRole === 'director' ? 'director_portal' : 'admin_portal')}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl min-w-[56px] min-h-[44px] justify-center transition-all ${
                currentTab === 'inspector_portal' || currentTab === 'director_portal' || currentTab === 'admin_portal' ? 'text-emerald-600 font-black' : 'text-slate-500 font-medium'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px]">البوابة</span>
            </button>

            <button
              onClick={() => handleItemClick('knowledge_engine')}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl min-w-[56px] min-h-[44px] justify-center transition-all ${
                currentTab === 'knowledge_engine' ? 'text-emerald-600 font-black' : 'text-slate-500 font-medium'
              }`}
            >
              <BrainCircuit className="w-5 h-5" />
              <span className="text-[10px]">المعرفة</span>
            </button>

            <button
              onClick={() => {
                if (isMobileOpen && onCloseMobile) {
                  onCloseMobile();
                } else if (onOpenMobile) {
                  onOpenMobile();
                }
              }}
              className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl min-w-[56px] min-h-[44px] justify-center text-slate-700 font-extrabold cursor-pointer"
            >
              <Menu className="w-5 h-5 text-emerald-600" />
              <span className="text-[10px]">المزيد</span>
            </button>
          </>
        )}
      </div>
    </>
  );
};
