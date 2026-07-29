/**
 * SPEX - Admin Module & AI Engine Control Panel
 * لوحة التحكم المركزية: إعدادات الذكاء الاصطناعي، المزودات، السجلات والتصريحات
 */

import React, { useState } from 'react';
import {
  Building2,
  Cpu,
  Key,
  Activity,
  Users,
  BrainCircuit,
  CheckCircle2,
  Server,
  Layers,
  UserPlus,
  Trash2,
  Edit,
  Search,
  Shield,
  School,
  Sparkles,
  UserCheck,
  X,
  Plus,
  Zap,
  Bot,
  RefreshCw,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { AISetting, AILog, KnowledgeItem, User } from '../../types/spex';
import { INITIAL_DIRECTORATES } from '../../data/initialState';
import { testApiKeyOnServer } from '../../services/api';

interface AdminDashboardProps {
  aiSettings: AISetting;
  onUpdateAISettings: (settings: AISetting) => void;
  aiLogs: AILog[];
  knowledgeItems: KnowledgeItem[];
  onApproveKnowledgeItem: (id: string) => void;
  users?: User[];
  onAddUser?: (user: Partial<User>) => void;
  onUpdateUser?: (user: User) => void;
  onDeleteUser?: (userId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  aiSettings,
  onUpdateAISettings,
  aiLogs,
  knowledgeItems,
  onApproveKnowledgeItem,
  users = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'account_api_keys' | 'ai_engine' | 'audit_logs' | 'directorates'>('users');

  // AI settings state
  const [provider, setProvider] = useState<AISetting['provider']>(aiSettings.provider);
  const [activeModel, setActiveModel] = useState(aiSettings.activeModel);
  const [temperature, setTemperature] = useState(aiSettings.temperature);
  const [maxTokens, setMaxTokens] = useState(aiSettings.maxTokens);
  const [dailyLimit, setDailyLimit] = useState(aiSettings.dailyQuotaLimit);

  // User Management state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'inspector' | 'director' | 'admin'>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Per-account API Key Management (Supervisor Dashboard Only)
  const [editingApiKeyUser, setEditingApiKeyUser] = useState<User | null>(null);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');
  const [testingUserId, setTestingUserId] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Record<string, { valid: boolean; message: string; quotaExhausted?: boolean }>>({});

  // Form state for new user
  const [newUserRole, setNewUserRole] = useState<'teacher' | 'inspector' | 'director' | 'admin'>('teacher');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('0661234567');
  const [newUserSchoolName, setNewUserSchoolName] = useState('مدرسة الشهيد بالخيري عبد القادر');
  const [newUserMunicipality, setNewUserMunicipality] = useState('عين أزال - سطيف');
  const [newUserDirectorate, setNewUserDirectorate] = useState('setif_de');
  const [newUserDistrict, setNewUserDistrict] = useState('dist_setif_7');
  const [newUserStatus, setNewUserStatus] = useState<'active' | 'inactive'>('active');
  const [newUserApiKey, setNewUserApiKey] = useState('');

  const handleTestUserApiKey = async (userId: string, apiKey: string) => {
    if (!apiKey || !apiKey.trim()) return;
    setTestingUserId(userId);
    const res = await testApiKeyOnServer(apiKey.trim());
    setTestingUserId(null);
    setKeyTestResults((prev) => ({
      ...prev,
      [userId]: res
    }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAISettings({
      ...aiSettings,
      provider,
      activeModel,
      temperature,
      maxTokens,
      dailyQuotaLimit: dailyLimit
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserFirstName || !newUserLastName || !newUserEmail) return;

    if (onAddUser) {
      const trimmedKey = newUserApiKey.trim();
      onAddUser({
        role: newUserRole,
        firstName: newUserFirstName,
        lastName: newUserLastName,
        email: newUserEmail,
        phone: newUserPhone,
        schoolName: newUserSchoolName,
        municipality: newUserMunicipality,
        directorateId: newUserDirectorate,
        districtId: newUserDistrict,
        status: newUserStatus,
        customApiKey: trimmedKey,
        apiKeyStatus: trimmedKey ? 'active' : 'not_set',
        isApprovedByAdmin: true
      });
    }

    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserEmail('');
    setNewUserApiKey('');
    setShowAddUserModal(false);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !onUpdateUser) return;
    onUpdateUser(editingUser);
    setEditingUser(null);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const providerModelsMap: Record<AISetting['provider'], string[]> = {
    gemini: ['gemini-3.6-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    claude: ['claude-3-5-sonnet', 'claude-3-haiku'],
    deepseek: ['deepseek-chat', 'deepseek-coder'],
    groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    ollama: ['llama3:8b', 'mistral:7b']
  };

  const teachersCount = users.filter((u) => u.role === 'teacher').length;
  const inspectorsCount = users.filter((u) => u.role === 'inspector').length;
  const directorsCount = users.filter((u) => u.role === 'director').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Admin Hero */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-purple-900/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-purple-200 border border-white/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>لوحة التحكم المركزية والإدارة العليا - SPEX Command Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              إدارة المنصة، الحسابات ومحرك توليد قاعدة البيانات
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl leading-relaxed">
              تحكم كامل في إضافة وإزالة وتعديل حسابات الأطراف (أستاذ، مفتش، مدير مدرسة)، بالإضافة إلى ضبط قواعد البيانات وسجلات التوليد.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة حساب جديد</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveAdminTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === 'users'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة الحسابات والمستخدمين ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('account_api_keys')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === 'account_api_keys'
                ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-purple-950 shadow-md font-black ring-2 ring-amber-300/50'
                : 'bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 border border-amber-400/30'
            }`}
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>🔑 مفاتيح الـ API لكل حساب (خاص بالمشرف)</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('ai_engine')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === 'ai_engine'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>إدارة المحرك البيداغوجي المعتمد</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('audit_logs')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === 'audit_logs'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>سجل العمليات وبنك المعرفة</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('directorates')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === 'directorates'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>مديريات التربية والمقاطعات (سطيف)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: USER ACCOUNTS MANAGEMENT */}
      {activeAdminTab === 'users' && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي الحسابات</span>
              <div className="text-2xl font-extrabold text-slate-900">{users.length}</div>
              <span className="text-[10px] text-emerald-600 font-bold">جميع الأدوار</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">أساتذة التربية البدنية</span>
              <div className="text-2xl font-extrabold text-emerald-600">{teachersCount}</div>
              <span className="text-[10px] text-slate-400">حسابات نشطة</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">المفتشون البيداغوجيون</span>
              <div className="text-2xl font-extrabold text-blue-600">{inspectorsCount}</div>
              <span className="text-[10px] text-slate-400">المقاطعة 01</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">مدراء المدارس الابتدائية</span>
              <div className="text-2xl font-extrabold text-purple-600">{directorsCount}</div>
              <span className="text-[10px] text-slate-400">إدارة المؤسسات</span>
            </div>
          </div>

          {/* User Management Panel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-extrabold text-slate-900">سجل وحسابات مستخدمي المنصة</h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو البريد..."
                    className="pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 w-48 sm:w-64"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e: any) => setRoleFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                >
                  <option value="all">جميع الأدوار</option>
                  <option value="teacher">أستاذ تربية بدنية</option>
                  <option value="inspector">مفتش بيداغوجي</option>
                  <option value="director">مدير مدرسة ابتدائية</option>
                  <option value="admin">مشرف النظام (أدمن)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200/80">
                    <th className="p-3">المستخدم / الاسم</th>
                    <th className="p-3">الصفة / الدور</th>
                    <th className="p-3">التواصل والبريد</th>
                    <th className="p-3">المؤسسة / المقاطعة</th>
                    <th className="p-3">حالة الحساب</th>
                    <th className="p-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                        لا يوجد حساب يطابق معايير البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isTeacher = u.role === 'teacher';
                      const isInspector = u.role === 'inspector';
                      const isDirector = u.role === 'director';
                      const isAdmin = u.role === 'admin';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 font-extrabold text-slate-800 flex items-center justify-center text-xs shadow-xs border border-slate-200">
                                {u.firstName[0]}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-900">
                                  {u.firstName} {u.lastName}
                                </h4>
                                <span className="text-[10px] text-slate-400">معرف: {u.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 ${
                                isTeacher
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isInspector
                                  ? 'bg-blue-100 text-blue-800'
                                  : isDirector
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isTeacher && '⚽ أستاذ تربية بدنية'}
                              {isInspector && '🛡️ مفتش بيداغوجي'}
                              {isDirector && '🏫 مدير مدرسة ابتدائية'}
                              {isAdmin && '🔑 مشرف النظام (أدمن)'}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-700 dir-ltr">{u.email}</div>
                            <div className="text-[10px] font-bold text-purple-700 dir-ltr mt-0.5">🔑 {u.password || '12345678'}</div>
                            <div className="text-[10px] text-slate-400">{u.phone || '0661234567'}</div>
                          </td>

                          <td className="p-3 font-medium text-slate-700">
                            {u.schoolName || u.municipality || 'عين أزال (سطيف)'}
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {u.status === 'active' ? 'نشط' : 'معطل'}
                            </span>
                          </td>

                          <td className="p-3 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingUser(u)}
                                className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="تعديل بيانات الحساب"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {onDeleteUser && (
                                <button
                                  onClick={() => {
                                    if (confirm(`هل أنت تأكد من إزالة حساب (${u.firstName} ${u.lastName}) نهائياً؟`)) {
                                      onDeleteUser(u.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="إزالة الحساب"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1.5: PER-ACCOUNT API KEYS MANAGEMENT (SUPERVISOR ONLY) */}
      {activeAdminTab === 'account_api_keys' && (
        <div className="space-y-6">
          {/* Top Banner Explaining Supervisor Control */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 rounded-3xl text-white shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-400/20 border border-amber-400/30 text-amber-300 rounded-2xl shrink-0">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <span>تحكم المشرف الحصري: ربط وتفعيل مفاتيح الـ API لكل حساب</span>
                    <span className="text-[10px] bg-amber-400/30 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-md">
                      صلاحية المشرف فقط
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    تستهدف إمكانية تخصيص مفتاح <strong>Gemini API Key</strong> لكل حساب إلى <strong>اقتصاد استهلاك التوكنز وإدارة الحصص اليومية للمنصة</strong> بمرونة عالية. مع التأكيد على أن <strong>جميع الحسابات وعملاء الذكاء الاصطناعي تعمل بشكل موحد ومطابق تماماً لمنهجية منصة SPEX الرسمية</strong> والمنهاج الوزاري للتربية البدنية بالطور الابتدائي.
                  </p>
                </div>
              </div>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all border border-purple-400/30 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>إنشاء مفتاح مجاني جديد (Google AI Studio)</span>
              </a>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="text-slate-300 font-medium">إجمالي حسابات المنصة:</span>
                <span className="font-extrabold text-white text-sm">{users.length}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="text-slate-300 font-medium">مفاتيح مخصصة نشطة (🟢):</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {users.filter((u) => u.customApiKey && u.customApiKey.trim().length > 5).length}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="text-slate-300 font-medium">حسابات بالبنك المدمج (⚪):</span>
                <span className="font-extrabold text-amber-300 text-sm">
                  {users.filter((u) => !u.customApiKey || u.customApiKey.trim().length <= 5).length}
                </span>
              </div>
            </div>
          </div>

          {/* Accounts List & API Key Binding Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-extrabold text-slate-900">سجل تفعيل وربط المفاتيح الخاصة بالمستخدمين</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالأستاذ أو المدرسة..."
                    className="pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 w-48 sm:w-64"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200/80">
                    <th className="p-3">صاحب الحساب / الدور</th>
                    <th className="p-3">المؤسسة / المقاطعة</th>
                    <th className="p-3">مفتاح API Key المخصص بالحساب</th>
                    <th className="p-3">حالة المفتاح</th>
                    <th className="p-3 text-left">إجراءات المشرف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const hasKey = Boolean(u.customApiKey && u.customApiKey.trim().length > 5);
                    const isTesting = testingUserId === u.id;
                    const testResult = keyTestResults[u.id];

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 font-bold text-purple-800 flex items-center justify-center text-xs shrink-0">
                              {u.firstName[0]}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900">
                                {u.firstName} {u.lastName}
                              </div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 font-medium text-slate-700">
                          {u.schoolName || u.municipality || 'عين أزال'}
                        </td>

                        <td className="p-3 dir-ltr text-left font-mono text-[11px]">
                          {hasKey ? (
                            <span className="bg-purple-50 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-200 font-bold inline-flex items-center gap-1">
                              <Key className="w-3 h-3 text-purple-600" />
                              <span>{u.customApiKey!.slice(0, 8)}...{u.customApiKey!.slice(-4)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-sans text-[11px]">⚪ لم يتم مسند مفتاح خاص بعد</span>
                          )}
                        </td>

                        <td className="p-3">
                          {hasKey ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>مربوط ومفعل</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                              <span>البنك المدمج</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                              }}
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1 cursor-pointer border border-purple-200"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>{hasKey ? 'تعديل المفتاح' : '+ تعيين مفتاح'}</span>
                            </button>

                            {hasKey && (
                              <button
                                onClick={() => handleTestUserApiKey(u.id, u.customApiKey!)}
                                disabled={isTesting}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1 cursor-pointer border border-amber-200 disabled:opacity-50"
                              >
                                {isTesting ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                                )}
                                <span>اختبار</span>
                              </button>
                            )}
                          </div>

                          {testResult && (
                            <div
                              className={`mt-2 p-2 rounded-lg text-[10px] font-bold border ${
                                testResult.valid
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : testResult.quotaExhausted
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-rose-50 border-rose-200 text-rose-800'
                              }`}
                            >
                              {testResult.message}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeAdminTab === 'ai_engine' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 1 Col: AI Provider Configuration Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-600" />
              <span>تكوين المحرك البيداغوجي المعتمد</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اختر مزود الخدمة (AI Provider)</label>
                <select
                  value={provider}
                  onChange={(e: any) => {
                    const p = e.target.value as AISetting['provider'];
                    setProvider(p);
                    setActiveModel(providerModelsMap[p][0]);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-bold text-slate-900"
                >
                  <option value="gemini">Google Gemini (الموصى به - مدمج)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="deepseek">DeepSeek AI</option>
                  <option value="groq">Groq Llama 3.3</option>
                  <option value="ollama">Ollama (محلي)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">النموذج النشط (Model)</label>
                <select
                  value={activeModel}
                  onChange={(e) => setActiveModel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-semibold text-slate-800"
                >
                  {providerModelsMap[provider].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">درجة الابتكار (Temp: {temperature})</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">حد التوكنات (Tokens)</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الحد الأقصى للطلبات اليومية لكل أستاذ</label>
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                حفظ إعدادات محرك البنك التربوي
              </button>
            </form>
          </div>

          {/* Right 2 Cols: Status */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold">المزود المفعل</span>
                  <Cpu className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-extrabold text-slate-900 capitalize">{aiSettings.provider}</div>
                <p className="text-[11px] text-slate-400 mt-1">{aiSettings.activeModel}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold">مفتاح API الرسمي</span>
                  <Key className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-extrabold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>محقق وآمن</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">حقن تلقائي عبر خادم SPEX</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold">الاستهلاك اليومي</span>
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  {aiSettings.dailyQuotaUsed} / {aiSettings.dailyQuotaLimit} طلب
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full"
                    style={{ width: `${(aiSettings.dailyQuotaUsed / aiSettings.dailyQuotaLimit) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>مميزات محرك التوليد الآلي من قاعدة البيانات المدمج في SPEX</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                يعتمد المحرك المدمج على قاعدة البيانات المباشرة للمناهج الجزائرية الرسمية الصادرة عن وزارة التربية الوطنية. يتيح توليد مذكرات
                تربوية نموذجية، استخراج صياغة الأهداف الإجرائية في المجال النفسي الحركي والوجداني، واقتراح ألعاب شبه رياضية
                مناسبة للطور الابتدائي من بنك المعرفة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS & KNOWLEDGE REVIEW */}
      {activeAdminTab === 'audit_logs' && (
        <div className="space-y-6">
          {/* AI Logs Audit */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span>سجل عمليات وطلبات المحرك البيداغوجي (Pedagogical Audit Log)</span>
              </span>
              <span className="text-xs text-slate-400">تحديث مباشر</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="p-2.5">الأستاذ / المستخدم</th>
                    <th className="p-2.5">الوحدة / الخدمة</th>
                    <th className="p-2.5">المزود والنموذج</th>
                    <th className="p-2.5">التوكنات</th>
                    <th className="p-2.5">زمن الاستجابة</th>
                    <th className="p-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aiLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-bold text-slate-900">{log.userName}</td>
                      <td className="p-2.5">{log.module}</td>
                      <td className="p-2.5 text-slate-600">
                        {log.provider} ({log.model})
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">{log.tokensUsed} token</td>
                      <td className="p-2.5 text-slate-500">{log.responseTimeMs} ms</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Knowledge Bank Submissions Queue */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>مراجعة مقترحات بنك المعرفة التربوية</span>
            </h3>

            <div className="space-y-3">
              {knowledgeItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {item.category === 'game'
                          ? 'لعبة تربوية'
                          : item.category === 'objective'
                          ? 'هدف إجرائي'
                          : 'وضعية تعلمية'}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                    <span className="text-[10px] text-slate-400 block">المقترح بواسطة: {item.createdBy}</span>
                  </div>

                  <div>
                    {item.approved ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                        معتمد في البنك
                      </span>
                    ) : (
                      <button
                        onClick={() => onApproveKnowledgeItem(item.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        اعتماد ونشر
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EDUCATIONAL DIRECTORATES & DISTRICTS */}
      {activeAdminTab === 'directorates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>مديريات التربية والمقاطعات التفتيشية المعتمدة بالمنظومة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  قائمة الهياكل الإدارية الرسمية والتوزيع الجغرافي للمفتشين البيداغوجيين بمادة التربية البدنية والرياضية.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  1 مديرية مفعلة (سطيف)
                </span>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  56 مديرية قيد التحديث
                </span>
              </div>
            </div>

            {/* Render Directorates */}
            <div className="space-y-6">
              {INITIAL_DIRECTORATES.map((dir) => (
                <div
                  key={dir.id}
                  className={`rounded-2xl p-5 border transition-all ${
                    dir.isActiveWithData
                      ? 'bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 border-emerald-200 shadow-sm'
                      : 'bg-slate-50/80 border-slate-200/80 opacity-80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-2xl ${
                          dir.isActiveWithData
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-slate-900">{dir.name}</h4>
                          {dir.code && (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                              رمز الولاية: {dir.code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {dir.isActiveWithData
                            ? `تتضمن 9 مقاطعات تفتيشية مسجلة وموزعة بأسماء المفتشين الميدانيين`
                            : dir.note || 'قيد التحديث لاحقاً'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {dir.isActiveWithData ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>نشطة وتتضمن بيانات رسمية</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1.5 rounded-xl">
                          {dir.note || 'قيد التحديث لاحقاً'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Render Districts if active */}
                  {dir.isActiveWithData && dir.districts && dir.districts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-emerald-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <span>المقاطعات التفتيشية التسع (09 مقاطعات) بمديرية التربية لولاية سطيف:</span>
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                          إجمالي 9 مفتشين مادة
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dir.districts.map((dist) => (
                          <div
                            key={dist.id}
                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                              dist.inspectorId === 'usr_inspector_1'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                                : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                    dist.inspectorId === 'usr_inspector_1'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  المقاطعة {dist.districtNumber ? (dist.districtNumber < 10 ? `0${dist.districtNumber}` : dist.districtNumber) : dist.name}
                                </span>
                                {dist.inspectorId === 'usr_inspector_1' && (
                                  <span className="text-[9px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md">
                                    المفتش المتاح للتجربة
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold mt-1">
                                المفتش: {dist.inspectorName}
                              </div>
                            </div>

                            <UserCheck
                              className={`w-4 h-4 shrink-0 ${
                                dist.inspectorId === 'usr_inspector_1' ? 'text-emerald-200' : 'text-slate-400'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>إضافة حساب جديد بالمنصة</span>
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">الصفة والدور في المنصة</label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 outline-none focus:border-purple-500"
                >
                  <option value="teacher">⚽ أستاذ تربية بدنية ورياضية (ابتدائي)</option>
                  <option value="inspector">🛡️ مفتش بيداغوجي (مقاطعة رويبة/الجزائر)</option>
                  <option value="director">🏫 مدير مدرسة ابتدائية</option>
                  <option value="admin">🔑 مشرف النظام (أدمن)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الاسم الأول</label>
                  <input
                    type="text"
                    required
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    placeholder="مثال: عبد المالك"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">اللقب</label>
                  <input
                    type="text"
                    required
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    placeholder="مثال: نابتي"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني الرسمية</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="abdelmalek.nabti@education.dz"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 dir-ltr text-left"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 dir-ltr"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">حالة الحساب</label>
                  <select
                    value={newUserStatus}
                    onChange={(e: any) => setNewUserStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-bold"
                  >
                    <option value="active">مفعل ونشط</option>
                    <option value="inactive">معطل مؤقتاً</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم المدرسة الابتدائية</label>
                  <input
                    type="text"
                    required
                    value={newUserSchoolName}
                    onChange={(e) => setNewUserSchoolName(e.target.value)}
                    placeholder="مثال: مدرسة الشهيد بالخيري عبد القادر"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">بلدية العمل</label>
                  <input
                    type="text"
                    required
                    value={newUserMunicipality}
                    onChange={(e) => setNewUserMunicipality(e.target.value)}
                    placeholder="مثال: عين أزال"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مديرية التربية</label>
                  <select
                    value={newUserDirectorate}
                    onChange={(e) => setNewUserDirectorate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="setif_de">مديرية التربية لولاية سطيف (19)</option>
                    <option value="alg_de">مديرية التربية لولاية الجزائر</option>
                    <option value="oran_de">مديرية التربية لولاية وهران</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">المقاطعة التفتيشية</label>
                  <select
                    value={newUserDistrict}
                    onChange={(e) => setNewUserDistrict(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="dist_setif_7">المقاطعة 07 - عين أزال (سطيف)</option>
                    <option value="dist_setif_1">المقاطعة 01 - سطيف شرق</option>
                    <option value="dist_setif_5">المقاطعة 05 - عين ولمان</option>
                  </select>
                </div>
              </div>

              {/* API Key Binding for New Account */}
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 space-y-2">
                <label className="font-extrabold text-amber-950 block text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>مفتاح Gemini API Key المخصص لهذا الحساب (تفعيل المشرف)</span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-normal">اختياري - لعميل الذكاء الاصطناعي الخاص</span>
                </label>
                <input
                  type="password"
                  value={newUserApiKey}
                  onChange={(e) => setNewUserApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-mono text-xs outline-none focus:border-amber-500 dir-ltr text-left"
                />
                <p className="text-[11px] text-amber-800/90 leading-tight">
                  عند إلصاق مفتاح مخصص، سيعمل هذا الحساب بعميل ذكاء اصطناعي مستقل بسعة مجانية يومية منفصلة.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                >
                  حفظ وتأكيد الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-purple-600" />
                <span>تعديل بيانات حساب: {editingUser.firstName} {editingUser.lastName}</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">الصفة والدور في المنصة</label>
                <select
                  value={editingUser.role}
                  onChange={(e: any) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 outline-none"
                >
                  <option value="teacher">⚽ أستاذ تربية بدنية ورياضية (ابتدائي)</option>
                  <option value="inspector">🛡️ مفتش بيداغوجي (المقاطعة 07 - عين أزال)</option>
                  <option value="director">🏫 مدير مدرسة ابتدائية</option>
                  <option value="admin">🔑 مشرف النظام (أدمن)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الاسم الأول</label>
                  <input
                    type="text"
                    required
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">اللقب</label>
                  <input
                    type="text"
                    required
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني الحساب</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none dir-ltr text-left font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">كلمة المرور الجديدة</label>
                  <input
                    type="text"
                    value={editingUser.password || '12345678'}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="12345678"
                    className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 outline-none dir-ltr text-left font-bold text-purple-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none dir-ltr"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">حالة الحساب والتفعيل</label>
                  <select
                    value={editingUser.status}
                    onChange={(e: any) => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-bold text-slate-800"
                  >
                    <option value="active">نشط ومفعل</option>
                    <option value="inactive">معطل مؤقتاً</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم المؤسسة / المدرسة</label>
                  <input
                    type="text"
                    value={editingUser.schoolName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, schoolName: e.target.value })}
                    placeholder="مدرسة الشهيد بالخيري عبد القادر"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">بلدية العمل</label>
                  <input
                    type="text"
                    value={editingUser.municipality || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, municipality: e.target.value })}
                    placeholder="عين أزال"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مديرية التربية</label>
                  <select
                    value={editingUser.directorateId || 'setif_de'}
                    onChange={(e) => setEditingUser({ ...editingUser, directorateId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="setif_de">مديرية التربية لولاية سطيف (19)</option>
                    <option value="alg_de">مديرية التربية لولاية الجزائر</option>
                    <option value="oran_de">مديرية التربية لولاية وهران</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">المقاطعة التفتيشية</label>
                  <select
                    value={editingUser.districtId || 'dist_setif_7'}
                    onChange={(e) => setEditingUser({ ...editingUser, districtId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="dist_setif_7">المقاطعة 07 - عين أزال (سطيف)</option>
                    <option value="dist_setif_1">المقاطعة 01 - سطيف شرق</option>
                    <option value="dist_setif_5">المقاطعة 05 - عين ولمان</option>
                  </select>
                </div>
              </div>

              {/* API Key Binding for Account (Supervisor Action) */}
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 space-y-2">
                <label className="font-extrabold text-amber-950 block text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>مفتاح Gemini API Key المخصص للحساب (تنشيط المشرف)</span>
                  </span>
                  {editingUser.customApiKey && editingUser.customApiKey.trim().length > 5 && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                      🟢 مفتاح نشط ومربوط
                    </span>
                  )}
                </label>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={editingUser.customApiKey || ''}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        customApiKey: e.target.value,
                        apiKeyStatus: e.target.value.trim() ? 'active' : 'not_set'
                      })
                    }
                    placeholder="AIzaSy..."
                    className="flex-1 p-2.5 rounded-xl border border-amber-300 bg-white font-mono text-xs outline-none focus:border-amber-500 dir-ltr text-left"
                  />
                  {editingUser.customApiKey && editingUser.customApiKey.trim().length > 5 && (
                    <button
                      type="button"
                      onClick={() => handleTestUserApiKey(editingUser.id, editingUser.customApiKey!)}
                      disabled={testingUserId === editingUser.id}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-purple-950 font-extrabold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {testingUserId === editingUser.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-purple-950" />
                      )}
                      <span>فحص</span>
                    </button>
                  )}
                </div>

                {keyTestResults[editingUser.id] && (
                  <div
                    className={`p-2 rounded-xl text-[11px] font-bold border ${
                      keyTestResults[editingUser.id].valid
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : keyTestResults[editingUser.id].quotaExhausted
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {keyTestResults[editingUser.id].message}
                  </div>
                )}

                <p className="text-[11px] text-amber-800/90 leading-tight">
                  عند ترك هذا الحقل فارغاً، سيتصل حساب الأستاذ تلقائياً بالبنك البيداغوجي المدمج في المنصة.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  حفظ وتحديث الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
