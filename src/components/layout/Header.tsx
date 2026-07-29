/**
 * SPEX - Header Component
 * الشريط العلوي للمنصة مع مبدل الأدوار، البحث، ومختصر المساعد الذكي
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Bell,
  Search,
  User as UserIcon,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Building2,
  ShieldCheck,
  GraduationCap,
  LogOut,
  Menu,
  X,
  Timer
} from 'lucide-react';
import { User, UserRole, DailyNotebookEntry, LessonSession, Student, LessonPlan, KnowledgeItem } from '../../types/spex';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onLogout: () => void;
  onOpenAIAssistant: () => void;
  onSearchQuery: (query: string) => void;
  notificationsCount: number;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  dailyNotebookEntries?: DailyNotebookEntry[];
  onUpdateNotebookStatus?: (entryId: string, status: 'منجزة' | 'مؤجلة' | 'غير منجزة') => void;
  activeLessonSession?: LessonSession | null;
  onOpenCommandCenter?: () => void;
  searchStudents?: Student[];
  searchLessonPlans?: LessonPlan[];
  searchKnowledgeItems?: KnowledgeItem[];
  onNavigateToTab?: (tab: string) => void;
}

type SearchResultItem = {
  id: string;
  category: 'student' | 'lesson_plan' | 'knowledge' | 'colleague';
  label: string;
  sublabel: string;
  targetTab: string;
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onLogout,
  onOpenAIAssistant,
  onSearchQuery,
  notificationsCount,
  isMobileMenuOpen,
  onToggleMobileMenu,
  dailyNotebookEntries = [],
  onUpdateNotebookStatus,
  activeLessonSession,
  onOpenCommandCenter,
  searchStudents = [],
  searchLessonPlans = [],
  searchKnowledgeItems = [],
  onNavigateToTab
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchBoxRef = React.useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    setShowSearchResults(true);
    onSearchQuery(e.target.value);
  };

  // Real global search across students, lesson plans, knowledge bank, and colleagues
  const searchResults: SearchResultItem[] = React.useMemo(() => {
    const q = searchVal.trim().toLowerCase();
    if (!q) return [];
    const results: SearchResultItem[] = [];

    searchStudents.forEach((s) => {
      const fullName = `${s.firstName} ${s.lastName}`;
      if (fullName.toLowerCase().includes(q) || (s.registrationNumber || '').toLowerCase().includes(q)) {
        results.push({
          id: `std_${s.id}`,
          category: 'student',
          label: fullName,
          sublabel: `تلميذ(ة) - رقم التسجيل: ${s.registrationNumber || '—'}`,
          targetTab: 'gradebook'
        });
      }
    });

    searchLessonPlans.forEach((lp) => {
      if (lp.sessionTitle?.toLowerCase().includes(q) || lp.fieldName?.toLowerCase().includes(q)) {
        results.push({
          id: `lp_${lp.id}`,
          category: 'lesson_plan',
          label: lp.sessionTitle,
          sublabel: `مذكرة - ${lp.fieldName} - ${lp.className}`,
          targetTab: 'lesson_plans'
        });
      }
    });

    searchKnowledgeItems.forEach((ki) => {
      if (ki.title?.toLowerCase().includes(q)) {
        results.push({
          id: `ki_${ki.id}`,
          category: 'knowledge',
          label: ki.title,
          sublabel: `بنك المعرفة - ${ki.category}`,
          targetTab: 'knowledge_engine'
        });
      }
    });

    allUsers.forEach((u) => {
      if (u.id === currentUser.id) return;
      const fullName = `${u.firstName} ${u.lastName}`;
      if (fullName.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q)) {
        results.push({
          id: `usr_${u.id}`,
          category: 'colleague',
          label: fullName,
          sublabel: u.role === 'inspector' ? 'مفتش بيداغوجي' : u.role === 'admin' ? 'مشرف المنظومة' : 'أستاذ زميل',
          targetTab: 'professional_community'
        });
      }
    });

    return results.slice(0, 8);
  }, [searchVal, searchStudents, searchLessonPlans, searchKnowledgeItems, allUsers, currentUser.id]);

  // Close the results dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSearchResult = (item: SearchResultItem) => {
    setShowSearchResults(false);
    setSearchVal('');
    if (onNavigateToTab) {
      onNavigateToTab(item.targetTab);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'teacher':
        return { label: 'أستاذ المادة', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: GraduationCap };
      case 'inspector':
        return { label: 'مفتش بيداغوجي', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: ShieldCheck };
      case 'admin':
        return { label: 'مدير النظام', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Building2 };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);
  const RoleIcon = roleInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between transition-all">
      {/* Brand & Identity */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Menu Hamburger Toggle */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            title="القائمة الرئيسية"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-rose-600" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-teal-500 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shadow-blue-500/20 tracking-wider">
            SPEX
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
              <span>منصة SPEX</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold border border-blue-100">
                إصدار 1.0
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">التربية البدنية والرياضية - الطور الابتدائي</p>
          </div>
        </div>

        {/* Official Role Badge - Final Production Version */}
        <div className="mr-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${roleInfo.bg}`}
            title={`الحساب الحالي: ${roleInfo.label}`}
          >
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{roleInfo.label}</span>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div ref={searchBoxRef} className="hidden md:flex items-center flex-1 max-w-md mx-6 relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
        <input
          type="text"
          value={searchVal}
          onChange={handleSearchChange}
          onFocus={() => setShowSearchResults(true)}
          placeholder="ابحث في المذكرات، بنك المعرفة، التلاميذ، أو الزملاء..."
          className="w-full pl-4 pr-9 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
        />

        {showSearchResults && searchVal.trim() && (
          <div className="absolute top-full mt-1.5 right-0 w-full bg-white rounded-2xl border border-slate-200 shadow-xl z-40 overflow-hidden max-h-80 overflow-y-auto" dir="rtl">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-bold">
                لا توجد نتائج مطابقة لـ "{searchVal}"
              </div>
            ) : (
              searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-right px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between gap-2 cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.sublabel}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Action Triggers & User Profile */}
      <div className="flex items-center gap-2">
        {/* Active Lesson Live Command Badge */}
        {activeLessonSession && (activeLessonSession.status === 'in_progress' || activeLessonSession.status === 'paused') && onOpenCommandCenter && (
          <button
            onClick={onOpenCommandCenter}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold border border-blue-500/40 shadow-md animate-pulse cursor-pointer"
            title="الانتقال المباشر لمركز قيادة الحصة"
          >
            <Timer className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">حصة جارية: {activeLessonSession.className}</span>
            <span className="sm:hidden font-mono text-blue-300">مباشر</span>
          </button>
        )}

        {/* Quick AI Assistant Trigger */}
        <button
          onClick={onOpenAIAssistant}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
          <span className="hidden sm:inline">المستشار البيداغوجي 📚</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all relative cursor-pointer"
            title="الإشعارات"
          >
            <Bell className="w-5 h-5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
            )}
            {notificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">تنبيهات إنجاز الحصص والإشعارات</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                  تأشير إنجاز الكراس اليومي
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {/* Pending & Today's PE Sessions Alerts */}
                {dailyNotebookEntries.length > 0 && (
                  <div className="p-3 bg-blue-50/40">
                    <div className="text-[11px] font-extrabold text-blue-900 mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>حصص الكراس اليومي المستهدفة بالتأشير:</span>
                    </div>

                    <div className="space-y-2">
                      {dailyNotebookEntries.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">{entry.className}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              entry.status === 'منجزة'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.status === 'مؤجلة'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {entry.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 font-medium">
                            تاريخ الحصة: {entry.executionDate} ({entry.timeSlot})
                          </div>

                          {/* Quick Action Buttons */}
                          {onUpdateNotebookStatus && (
                            <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                              <button
                                onClick={() => onUpdateNotebookStatus(entry.id, 'منجزة')}
                                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                  entry.status === 'منجزة'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                ✓ منجزة
                              </button>
                              <button
                                onClick={() => onUpdateNotebookStatus(entry.id, 'غير منجزة')}
                                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                  entry.status === 'غير منجزة'
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                ✕ غير منجزة
                              </button>
                              <button
                                onClick={() => onUpdateNotebookStatus(entry.id, 'مؤجلة')}
                                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                  entry.status === 'مؤجلة'
                                    ? 'bg-amber-600 text-white shadow-2xs'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                }`}
                              >
                                ⏰ مؤجلة
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3">
                  <div className="flex gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 h-fit">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">تم اعتماد التوزيع والبرنامج البيداغوجي</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">قام المفتش عبد الرحمن سطيفي بمراجعة المخطط والتوزيع السنوي.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">تنبيه آلي بالنظام</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-slate-200 overflow-hidden border border-slate-300 shadow-xs flex items-center justify-center font-bold text-slate-700 text-xs">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{currentUser.firstName[0]}</span>
            )}
          </div>
          <div className="hidden lg:block text-right">
            <div className="text-xs font-bold text-slate-900 leading-tight">
              {currentUser.firstName} {currentUser.lastName}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">{currentUser.email}</div>
          </div>
          
          <button
            onClick={onLogout}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
            title="تسجيل الخروج والعودة لشاشة تحديد الهوية"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden xl:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
