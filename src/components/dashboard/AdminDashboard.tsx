/**
 * SPEX - Admin Module & AI Engine Control Panel
 * لوحة التحكم المركزية: إعدادات الذكاء الاصطناعي، المزودات، السجلات والتصريحات
 */

import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Plug,
} from 'lucide-react';
import { AISetting, AILog, KnowledgeItem, User } from '../../types/spex';
import { INITIAL_DIRECTORATES } from '../../data/initialState';
import {
  testApiKeyOnServer,
  fetchAIProviders,
  createAIProvider,
  updateAIProvider,
  deleteAIProvider,
  testAIProviderById,
  AIProviderStatusItem,
  fetchGenerationConfig,
  updateGenerationConfig,
  fetchGenerationAccess,
  updateGenerationAccess,
  testGenerationAccess,
  testPlatformFallback,
  GenerationAccessItem,
  fetchGeoDirectorates,
  fetchGeoDistricts,
  fetchPendingUsersFromDB,
  activateUserAccount,
} from '../../services/api';

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
  isPlatformOwner?: boolean;
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
  onDeleteUser,
  isPlatformOwner = false,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    'users' | 'account_api_keys' | 'ai_engine' | 'audit_logs' | 'directorates'
  >('users');

  // AI settings state
  const [provider, setProvider] = useState<AISetting['provider']>(aiSettings.provider);
  const [activeModel, setActiveModel] = useState(aiSettings.activeModel);
  const [temperature, setTemperature] = useState(aiSettings.temperature);
  const [maxTokens, setMaxTokens] = useState(aiSettings.maxTokens);
  const [dailyLimit, setDailyLimit] = useState(aiSettings.dailyQuotaLimit);

  // Server-managed AI providers state
  const [serverProviders, setServerProviders] = useState<AIProviderStatusItem[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderStatusItem | null>(null);
  const [providerForm, setProviderForm] = useState({
    name: '',
    type: 'openai-compatible',
    baseUrl: '',
    apiKey: '',
    model: '',
    enabled: true,
  });
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [providerTestResults, setProviderTestResults] = useState<
    Record<string, { valid: boolean; message: string }>
  >({});
  const [generationEnabled, setGenerationEnabled] = useState(true);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [platformFallbackConfigured, setPlatformFallbackConfigured] = useState(false);
  const [generationAccess, setGenerationAccess] = useState<Record<string, GenerationAccessItem>>(
    {}
  );

  const loadServerProviders = async () => {
    setProvidersLoading(true);
    const list = await fetchAIProviders();
    setServerProviders(list);
    setProvidersLoading(false);
  };

  useEffect(() => {
    loadServerProviders();
    void (async () => {
      try {
        const config = await fetchGenerationConfig();
        setGenerationEnabled(config.generationEnabled);
        setProviderConfigured(config.providerConfigured);
        setPlatformFallbackConfigured(Boolean(config.platformFallbackConfigured));
        const access = await fetchGenerationAccess();
        setGenerationAccess(Object.fromEntries(access.map((item) => [item.userId, item])));
      } catch {
        /* server unavailable */
      }
    })();
  }, []);

  const toggleGeneration = async (enabled: boolean) => {
    setGenerationEnabled(enabled);
    try {
      await updateGenerationConfig(enabled);
    } catch {
      setGenerationEnabled(!enabled);
    }
  };
  const toggleAccountGeneration = async (user: User) => {
    const current = generationAccess[user.id] || {
      userId: user.id,
      enabled: false,
      assistantEnabled: false,
      gameSuggestionsEnabled: false,
    };
    const next = {
      ...current,
      enabled: !current.enabled,
      assistantEnabled: !current.enabled,
      gameSuggestionsEnabled: !current.enabled,
    };
    setGenerationAccess((prev) => ({ ...prev, [user.id]: next }));
    try {
      const saved = await updateGenerationAccess(user.id, next);
      setGenerationAccess((prev) => ({ ...prev, [user.id]: { ...next, ...saved } }));
    } catch {
      setGenerationAccess((prev) => ({ ...prev, [user.id]: current }));
    }
  };
  const setAccountKey = async (user: User) => {
    const key = window.prompt('أدخل مفتاح Gemini للحساب (لن يتم عرضه أو حفظه في المتصفح):');
    if (!key?.trim()) return;
    const current = generationAccess[user.id] || {
      userId: user.id,
      enabled: false,
      assistantEnabled: false,
      gameSuggestionsEnabled: false,
    };
    try {
      const saved = await updateGenerationAccess(user.id, {
        ...current,
        enabled: true,
        assistantEnabled: true,
        gameSuggestionsEnabled: true,
        apiKey: key,
        credentialEnabled: true,
      });
      setGenerationAccess((prev) => ({ ...prev, [user.id]: { ...current, ...saved } }));
    } catch {
      window.alert('تعذر حفظ مفتاح الحساب.');
    }
  };
  const clearAccountKey = async (user: User) => {
    const current = generationAccess[user.id] || {
      userId: user.id,
      enabled: false,
      assistantEnabled: false,
      gameSuggestionsEnabled: false,
    };
    try {
      const saved = await updateGenerationAccess(user.id, {
        ...current,
        clearKey: true,
        credentialEnabled: false,
      });
      setGenerationAccess((prev) => ({ ...prev, [user.id]: { ...current, ...saved } }));
    } catch {
      window.alert('تعذر إزالة مفتاح الحساب.');
    }
  };
  const testAccountKey = async (user: User) => {
    const result = await testGenerationAccess(user.id);
    window.alert(result.message);
  };
  const testFallbackKey = async () => {
    const result = await testPlatformFallback();
    window.alert(result.message);
  };

  const openAddProvider = () => {
    setEditingProvider(null);
    setProviderError('');
    setProviderForm({
      name: '',
      type: 'openai-compatible',
      baseUrl: '',
      apiKey: '',
      model: '',
      enabled: true,
    });
    setShowProviderModal(true);
  };

  const openEditProvider = (p: AIProviderStatusItem) => {
    setEditingProvider(p);
    setProviderError('');
    setProviderForm({
      name: p.name,
      type: p.type,
      baseUrl: p.baseUrl || '',
      apiKey: '',
      model: p.model || '',
      enabled: p.enabled,
    });
    setShowProviderModal(true);
  };

  const closeProviderModal = () => {
    if (providerSaving) return;
    setShowProviderModal(false);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setProviderError('');
    if (!providerForm.name.trim()) {
      setProviderError('اسم المزود مطلوب.');
      return;
    }
    const payload = {
      name: providerForm.name.trim(),
      type: providerForm.type,
      baseUrl: providerForm.baseUrl.trim() || undefined,
      apiKey: providerForm.apiKey,
      model: providerForm.model.trim() || undefined,
      enabled: providerForm.enabled,
      sortOrder: 0,
    };
    setProviderSaving(true);
    const result = editingProvider
      ? await updateAIProvider(editingProvider.id, payload)
      : await createAIProvider(payload);
    setProviderSaving(false);
    if (!result.success) {
      setProviderError(result.error || 'تعذّرت العملية.');
      return;
    }
    setShowProviderModal(false);
    await loadServerProviders();
  };

  const handleDeleteProvider = async (p: AIProviderStatusItem) => {
    if (!window.confirm(`هل تريد حذف المزود "${p.name}" نهائياً؟`)) return;
    const result = await deleteAIProvider(p.id);
    if (!result.success) {
      alert(result.error || 'تعذّر حذف المزود.');
      return;
    }
    await loadServerProviders();
  };

  const handleTestProvider = async (p: AIProviderStatusItem) => {
    setTestingProviderId(p.id);
    setProviderTestResults((prev) => ({
      ...prev,
      [p.id]: { valid: false, message: 'جارٍ الاختبار...' },
    }));
    const res = await testAIProviderById(p.id);
    setTestingProviderId(null);
    setProviderTestResults((prev) => ({
      ...prev,
      [p.id]: { valid: Boolean(res.valid), message: res.message || 'نتيجة غير معروفة.' },
    }));
  };

  const providerTypeLabels: Record<string, string> = {
    'openai-compatible': 'متوافق مع OpenAI',
    openai: 'OpenAI',
    nvidia: 'NVIDIA NIM',
    anthropic: 'Anthropic Claude',
    gemini: 'Google Gemini',
    ollama: 'Ollama (محلي)',
  };
  const providerTypesRequiringBaseUrl = ['openai-compatible', 'openai', 'nvidia', 'ollama'];

  // User Management state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'teacher' | 'inspector' | 'director' | 'admin'
  >('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Per-account API Key Management (Supervisor Dashboard Only)
  const [editingApiKeyUser, setEditingApiKeyUser] = useState<User | null>(null);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');
  const [testingUserId, setTestingUserId] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<
    Record<string, { valid: boolean; message: string; quotaExhausted?: boolean }>
  >({});
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);

  const refreshPendingUsers = async () => setPendingUsers(await fetchPendingUsersFromDB());
  useEffect(() => {
    void refreshPendingUsers();
  }, []);

  const handleActivatePending = async (user: User) => {
    const result = await activateUserAccount(user.id);
    if (!result.success || !result.user) {
      window.alert(result.error || 'تعذر تفعيل الحساب.');
      return;
    }
    setPendingUsers((prev) => prev.filter((item) => item.id !== user.id));
    onUpdateUser?.({ ...user, ...result.user, status: 'active', isApprovedByAdmin: true });
  };

  // Form state for new user
  const [newUserRole, setNewUserRole] = useState<'teacher' | 'inspector' | 'director' | 'admin'>(
    'teacher'
  );
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('0661234567');
  const [newUserSchoolName, setNewUserSchoolName] = useState('مدرسة الشهيد بالخيري عبد القادر');
  const [newUserMunicipality, setNewUserMunicipality] = useState('عين أزال - سطيف');
  const [newUserDirectorate, setNewUserDirectorate] = useState('');
  const [newUserDistrict, setNewUserDistrict] = useState('');
  const [newUserStatus, setNewUserStatus] = useState<'active' | 'inactive'>('active');
  const [newUserApiKey, setNewUserApiKey] = useState('');
  const [geoDirectorates, setGeoDirectorates] = useState<Array<{ id: string; name: string }>>([]);
  const [geoDistricts, setGeoDistricts] = useState<
    Array<{ id: string; name: string; directorateId: string; districtNumber?: number }>
  >([]);

  useEffect(() => {
    void fetchGeoDirectorates().then((r: any) => setGeoDirectorates(r?.directorates || []));
  }, []);
  useEffect(() => {
    if (!newUserDirectorate) {
      setGeoDistricts([]);
      setNewUserDistrict('');
      return;
    }
    void fetchGeoDistricts(newUserDirectorate).then((r: any) => {
      const districts = r?.districts || [];
      setGeoDistricts(districts);
      if (!districts.some((d: any) => d.id === newUserDistrict)) setNewUserDistrict('');
    });
  }, [newUserDirectorate]);
  useEffect(() => {
    if (!editingUser?.directorateId) return;
    void fetchGeoDistricts(editingUser.directorateId).then((r: any) =>
      setGeoDistricts(r?.districts || [])
    );
  }, [editingUser?.directorateId]);

  const handleTestUserApiKey = async (userId: string, apiKey: string) => {
    if (!apiKey || !apiKey.trim()) return;
    setTestingUserId(userId);
    const res = await testApiKeyOnServer(apiKey.trim());
    setTestingUserId(null);
    setKeyTestResults((prev) => ({
      ...prev,
      [userId]: res,
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
      dailyQuotaLimit: dailyLimit,
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserFirstName || !newUserLastName || !newUserEmail) return;

    if (newUserPassword.trim().length < 8) {
      window.alert('كلمة المرور الأولية يجب أن تكون 8 أحرف على الأقل.');
      return;
    }
    if (newUserRole === 'inspector' && !newUserDirectorate) {
      window.alert('يرجى اختيار مديرية التربية.');
      return;
    }
    if (newUserRole === 'inspector' && !newUserDistrict) {
      window.alert('يرجى اختيار المقاطعة التفتيشية.');
      return;
    }

    if (onAddUser) {
      const trimmedKey = newUserApiKey.trim();
      onAddUser({
        role: newUserRole,
        firstName: newUserFirstName,
        lastName: newUserLastName,
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword.trim(),
        phone: newUserPhone,
        schoolName: newUserSchoolName,
        municipality: newUserMunicipality,
        directorateId: newUserDirectorate,
        districtId: newUserRole === 'inspector' ? newUserDistrict : '',
        ...(newUserRole === 'inspector'
          ? { institutionId: undefined, schoolName: undefined, municipality: undefined }
          : {}),
        status: newUserStatus,
        customApiKey: trimmedKey,
        apiKeyStatus: trimmedKey ? 'active' : 'not_set',
        isApprovedByAdmin: true,
      });
    }

    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserApiKey('');
    setShowAddUserModal(false);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !onUpdateUser) return;
    // إن لم يكتب المشرف كلمة مرور جديدة صراحة، لا نرسل الحقل أصلاً حتى لا تتغير كلمة المرور الحالية
    const payload = { ...editingUser };
    if (!payload.password || !String(payload.password).trim()) {
      delete payload.password;
    } else if (String(payload.password).trim().length < 8) {
      window.alert(
        'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل، أو اترك الحقل فارغاً لعدم التغيير.'
      );
      return;
    }
    onUpdateUser(payload);
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
    ollama: ['llama3:8b', 'mistral:7b'],
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
              تحكم كامل في إضافة وإزالة وتعديل حسابات الأطراف (أستاذ، مفتش، مدير مدرسة)، بالإضافة
              إلى ضبط قواعد البيانات وسجلات التوليد.
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
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                إجمالي الحسابات
              </span>
              <div className="text-2xl font-extrabold text-slate-900">{users.length}</div>
              <span className="text-[10px] text-emerald-600 font-bold">جميع الأدوار</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                أساتذة التربية البدنية
              </span>
              <div className="text-2xl font-extrabold text-emerald-600">{teachersCount}</div>
              <span className="text-[10px] text-slate-400">حسابات نشطة</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                المفتشون البيداغوجيون
              </span>
              <div className="text-2xl font-extrabold text-blue-600">{inspectorsCount}</div>
              <span className="text-[10px] text-slate-400">المقاطعة 01</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                مدراء المدارس الابتدائية
              </span>
              <div className="text-2xl font-extrabold text-purple-600">{directorsCount}</div>
              <span className="text-[10px] text-slate-400">إدارة المؤسسات</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  إعدادات الخدمات المساعدة
                </h3>
                <p className="text-xs text-slate-500">
                  التحكم المركزي في تشغيل الخدمات وصلاحيات الحسابات.
                </p>
              </div>
              <button
                onClick={() => void toggleGeneration(!generationEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${generationEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
              >
                {generationEnabled ? 'الخدمات مفعلة' : 'الخدمات متوقفة'}
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              إعداد المزود:{' '}
              <span
                className={
                  providerConfigured ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'
                }
              >
                {providerConfigured ? 'مكتمل' : 'غير مكتمل'}
              </span>{' '}
              · <span className="font-bold">مفتاح احتياطي للمنصة:</span>{' '}
              <span
                className={
                  platformFallbackConfigured ? 'text-emerald-700 font-bold' : 'text-slate-400'
                }
              >
                {platformFallbackConfigured ? 'متاح' : 'غير متاح'}
              </span>{' '}
              <button
                onClick={() => void testFallbackKey()}
                className="mr-2 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold"
              >
                اختبار المفتاح الاحتياطي
              </button>{' '}
              · لا تظهر المفاتيح السرية في هذه الصفحة.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-2">الحساب</th>
                    <th className="p-2">الخدمات المساعدة</th>
                    <th className="p-2">مفتاح الحساب</th>
                    <th className="p-2">حالة المصدر</th>
                    <th className="p-2">المساعد</th>
                    <th className="p-2">اقتراح الألعاب</th>
                    <th className="p-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((user) => user.role === 'teacher')
                    .map((user) => {
                      const access = generationAccess[user.id] || {
                        userId: user.id,
                        enabled: false,
                        assistantEnabled: false,
                        gameSuggestionsEnabled: false,
                      };
                      const sourceStatus =
                        access.keyConfigured && access.credentialEnabled
                          ? 'مفتاح خاص مضبوط'
                          : access.enabled && platformFallbackConfigured
                            ? 'يستخدم المفتاح الاحتياطي'
                            : 'لا توجد خدمة متاحة';
                      return (
                        <tr key={user.id} className="border-b border-slate-100">
                          <td className="p-2 font-bold">
                            {user.firstName} {user.lastName}
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => void toggleAccountGeneration(user)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold ${access.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                            >
                              {access.enabled ? 'مفعلة' : 'غير مفعلة'}
                            </button>
                          </td>
                          <td className="p-2">
                            <span
                              className={
                                access.keyConfigured
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-slate-400'
                              }
                            >
                              {access.keyConfigured
                                ? access.credentialEnabled
                                  ? 'مضبوط ونشط'
                                  : 'مضبوط'
                                : 'غير مضبوط'}
                            </span>
                          </td>
                          <td className="p-2 text-[10px]">{sourceStatus}</td>
                          <td className="p-2">{access.assistantEnabled ? 'مسموح' : '—'}</td>
                          <td className="p-2">{access.gameSuggestionsEnabled ? 'مسموح' : '—'}</td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => void setAccountKey(user)}
                                className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold"
                              >
                                مفتاح الخدمة
                              </button>
                              {access.keyConfigured && (
                                <>
                                  <button
                                    onClick={() => void testAccountKey(user)}
                                    className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold"
                                  >
                                    اختبار
                                  </button>
                                  <button
                                    onClick={() => void clearAccountKey(user)}
                                    className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold"
                                  >
                                    إزالة
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Management Panel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  سجل وحسابات مستخدمي المنصة
                </h3>
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

            {pendingUsers.length > 0 && (
              <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-amber-950">حسابات بانتظار التفعيل ({pendingUsers.length})</h3>
                  <span className="text-[10px] text-amber-800">مصدرها قاعدة البيانات</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{user.firstName} {user.lastName}</div>
                        <div className="text-[10px] text-slate-500 dir-ltr truncate">{user.email}</div>
                      </div>
                      <button type="button" onClick={() => void handleActivatePending(user)} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white">تفعيل</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                            <div className="text-[10px] font-bold text-slate-500 dir-ltr mt-0.5">
                              🆔 {u.spexId}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.phone || 'بدون هاتف'}
                            </div>
                          </td>

                          <td className="p-3 font-medium text-slate-700">
                            {u.schoolName || u.municipality || 'عين أزال (سطيف)'}
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                                !u.isApprovedByAdmin || u.status === 'pending_approval'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                  : u.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {!u.isApprovedByAdmin || u.status === 'pending_approval'
                                ? '⏳ بانتظار التفعيل'
                                : u.status === 'active'
                                  ? '🟢 نشط ومفعل'
                                  : '🔴 معطل'}
                            </span>
                          </td>

                          <td className="p-3 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              {onUpdateUser &&
                                (!u.isApprovedByAdmin ||
                                u.status === 'pending_approval' ||
                                u.status === 'inactive' ? (
                                  <button
                                    onClick={() =>
                                      onUpdateUser({
                                        ...u,
                                        isApprovedByAdmin: true,
                                        status: 'active',
                                      })
                                    }
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                    title="تفعيل حساب المستخدم فوراً"
                                  >
                                    <UserCheck className="w-3 h-3" />
                                    <span>تفعيل</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      onUpdateUser({
                                        ...u,
                                        isApprovedByAdmin: false,
                                        status: 'inactive',
                                      })
                                    }
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    title="تعطيل الحساب وتجميد الوصول"
                                  >
                                    <EyeOff className="w-3 h-3 text-rose-600" />
                                    <span>تعطيل</span>
                                  </button>
                                ))}

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
                                    if (
                                      confirm(
                                        `هل أنت تأكد من إزالة حساب (${u.firstName} ${u.lastName}) نهائياً؟`
                                      )
                                    ) {
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
                    تستهدف إمكانية تخصيص مفتاح <strong>Gemini API Key</strong> لكل حساب إلى{' '}
                    <strong>اقتصاد استهلاك التوكنز وإدارة الحصص اليومية للمنصة</strong> بمرونة
                    عالية. مع التأكيد على أن{' '}
                    <strong>
                      جميع الحسابات وعملاء الذكاء الاصطناعي تعمل بشكل موحد ومطابق تماماً لمنهجية
                      منصة SPEX الرسمية
                    </strong>{' '}
                    والمنهاج الوزاري للتربية البدنية بالطور الابتدائي.
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
                <h3 className="text-base font-extrabold text-slate-900">
                  سجل تفعيل وربط المفاتيح الخاصة بالمستخدمين
                </h3>
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
                              <span>
                                {u.customApiKey!.slice(0, 8)}...{u.customApiKey!.slice(-4)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-sans text-[11px]">
                              ⚪ لم يتم مسند مفتاح خاص بعد
                            </span>
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
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 1 Col: AI Provider Configuration Form */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-600" />
                <span>تكوين المحرك البيداغوجي المعتمد</span>
              </h3>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    اختر مزود الخدمة (AI Provider)
                  </label>
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
                  <label className="font-bold text-slate-700 block mb-1">
                    النموذج النشط (Model)
                  </label>
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

                {newUserRole !== 'inspector' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        درجة الابتكار (Temp: {temperature})
                      </label>
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
                      <label className="font-bold text-slate-700 block mb-1">
                        حد التوكنات (Tokens)
                      </label>
                      <input
                        type="number"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    الحد الأقصى للطلبات اليومية لكل أستاذ
                  </label>
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
                  <div className="text-xl font-extrabold text-slate-900 capitalize">
                    {aiSettings.provider}
                  </div>
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
                      style={{
                        width: `${(aiSettings.dailyQuotaUsed / aiSettings.dailyQuotaLimit) * 100}%`,
                      }}
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
                  يعتمد المحرك المدمج على قاعدة البيانات المباشرة للمناهج الجزائرية الرسمية الصادرة
                  عن وزارة التربية الوطنية. يتيح توليد مذكرات تربوية نموذجية، استخراج صياغة الأهداف
                  الإجرائية في المجال النفسي الحركي والوجداني، واقتراح ألعاب شبه رياضية مناسبة للطور
                  الابتدائي من بنك المعرفة.
                </p>
              </div>
            </div>
          </div>

          {/* Server-Managed AI Providers */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plug className="w-4 h-4 text-purple-600" />
                <span>إدارة مزودات الذكاء الاصطناعي (تخزين خادمي)</span>
              </h3>
              <button
                onClick={openAddProvider}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة مزود جديد
              </button>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
              <Server className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <span>
                يمكنك إضافة أي مزود ذكاء اصطناعي: مزودات سحابية متوافقة مع OpenAI (OpenAI، DeepSeek،
                Groq، Mistral، Together، vLLM...)، أو محلية بلا مفتاح مثل <b>Ollama</b> و{' '}
                <b>LM Studio</b> عبر الرابط
                <code className="mx-1 px-1.5 py-0.5 bg-slate-200 rounded-md">
                  http://localhost:11434/v1
                </code>
                . عند تعذّر أحد المزودات يتحول النظام تلقائياً إلى المزود التالي.
              </span>
            </div>

            {providersLoading ? (
              <div className="flex items-center justify-center gap-3 py-10 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-xs font-bold">جارٍ تحميل المزودات من الخادم...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-2.5">المزود</th>
                      <th className="p-2.5">النوع</th>
                      <th className="p-2.5">النموذج</th>
                      <th className="p-2.5">الرابط / المفتاح</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5">المصدر</th>
                      <th className="p-2.5">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {serverProviders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          لا توجد مزودات مفعّلة حالياً. أضف مفتاحاً في ملف .env أو أضف مزوداً من
                          الزر أعلاه.
                        </td>
                      </tr>
                    )}
                    {serverProviders.map((p) => {
                      const testResult = providerTestResults[p.id];
                      const testing = testingProviderId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-900">{p.name}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-md text-[10px]">
                              {providerTypeLabels[p.type] || p.type}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">{p.model || '—'}</td>
                          <td className="p-2.5 space-y-1">
                            {p.baseUrl ? (
                              <span className="block text-slate-500 text-[10px] dir-ltr text-left">
                                {p.baseUrl}
                              </span>
                            ) : (
                              <span className="block text-slate-300 text-[10px]">—</span>
                            )}
                            <span className="block text-[10px]">
                              {p.keyConfigured ? (
                                <span className="text-emerald-600 font-bold">مفتاح محقون ✓</span>
                              ) : (
                                <span className="text-amber-600">
                                  {p.type === 'ollama' ? 'لا يتطلب مفتاحاً (محلي)' : 'بدون مفتاح'}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 font-bold rounded-md text-[10px] ${
                                p.enabled
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {p.enabled ? 'مفعّل' : 'معطّل'}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 font-bold rounded-md text-[10px] ${
                                p.source === 'db'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {p.source === 'db' ? 'قاعدة البيانات' : 'ملف .env'}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="flex flex-col gap-1.5 items-start">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleTestProvider(p)}
                                  disabled={testing}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                                >
                                  {testing ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Zap className="w-3 h-3" />
                                  )}
                                  اختبار
                                </button>
                                {p.source === 'db' && (
                                  <>
                                    <button
                                      onClick={() => openEditProvider(p)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                                    >
                                      <Edit className="w-3 h-3" />
                                      تعديل
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProvider(p)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      حذف
                                    </button>
                                  </>
                                )}
                              </div>
                              {testResult && (
                                <span
                                  className={`text-[10px] font-bold ${
                                    testResult.valid ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {testResult.valid ? (
                                    <CheckCircle2 className="inline w-3 h-3 mr-0.5" />
                                  ) : (
                                    <AlertCircle className="inline w-3 h-3 mr-0.5" />
                                  )}
                                  {testResult.message}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
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
                    <span className="text-[10px] text-slate-400 block">
                      المقترح بواسطة: {item.createdBy}
                    </span>
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
                  قائمة الهياكل الإدارية الرسمية والتوزيع الجغرافي للمفتشين البيداغوجيين بمادة
                  التربية البدنية والرياضية.
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
                          <span>
                            المقاطعات التفتيشية التسع (09 مقاطعات) بمديرية التربية لولاية سطيف:
                          </span>
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                          إجمالي 9 مفتشين مادة
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dir.districts.map((dist) => (
                          <div
                            key={dist.id}
                            className="p-3.5 rounded-xl border transition-all flex items-center justify-between bg-white border-slate-200 hover:border-emerald-300 text-slate-800"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                  المقاطعة{' '}
                                  {dist.districtNumber
                                    ? dist.districtNumber < 10
                                      ? `0${dist.districtNumber}`
                                      : dist.districtNumber
                                    : dist.name}
                                </span>
                              </div>
                              <div className="text-xs font-bold mt-1">
                                المفتش: {dist.inspectorName || 'لم يُحدد بعد'}
                              </div>
                            </div>

                            <UserCheck className="w-4 h-4 shrink-0 text-slate-400" />
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
                <label className="font-bold text-slate-700 block mb-1">
                  الصفة والدور في المنصة
                </label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => {
                    const role = e.target.value;
                    setNewUserRole(role);
                    if (role !== 'inspector') setNewUserDistrict('');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 outline-none focus:border-purple-500"
                >
                  <option value="teacher">⚽ أستاذ تربية بدنية ورياضية (ابتدائي)</option>
                  <option value="inspector">🛡️ مفتش بيداغوجي (مقاطعة رويبة/الجزائر)</option>
                  <option value="director">🏫 مدير مدرسة ابتدائية</option>
                  {isPlatformOwner && <option value="admin">🔑 مشرف النظام (أدمن)</option>}
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
                <label className="font-bold text-slate-700 block mb-1">
                  البريد الإلكتروني الرسمية
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="abdelmalek.nabti@education.dz"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 dir-ltr text-left"
                />
              </div>

              {/* كلمة المرور الأولية للحساب الجديد — ضرورية لأن الخادم يرفض إنشاء حساب بلا كلمة مرور،
                  وكان النظام يضبط '12345678' سراً لكل الحسابات الجديدة دون علم المشرف */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">كلمة المرور الأولية</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل - سلّمها للمستخدم ليغيّرها لاحقاً"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 dir-ltr text-left font-mono"
                />
              </div>

              {newUserRole !== 'inspector' && (
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
              )}

              {newUserRole !== 'inspector' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      اسم المدرسة الابتدائية
                    </label>
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
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مديرية التربية</label>
                  <select
                    value={newUserDirectorate}
                    onChange={(e) => setNewUserDirectorate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="">اختر المديرية</option>
                    {geoDirectorates.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">المقاطعة التفتيشية</label>
                  <select
                    value={newUserDistrict}
                    onChange={(e) => setNewUserDistrict(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="">
                      {newUserRole === 'inspector' ? 'اختر المقاطعة' : 'لا يوجد إسناد مفتش'}
                    </option>
                    {geoDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
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
                  <span className="text-[10px] text-amber-800 font-normal">
                    اختياري - لعميل الذكاء الاصطناعي الخاص
                  </span>
                </label>
                <input
                  type="password"
                  value={newUserApiKey}
                  onChange={(e) => setNewUserApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-mono text-xs outline-none focus:border-amber-500 dir-ltr text-left"
                />
                <p className="text-[11px] text-amber-800/90 leading-tight">
                  عند إلصاق مفتاح مخصص، سيعمل هذا الحساب بعميل ذكاء اصطناعي مستقل بسعة مجانية يومية
                  منفصلة.
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
                <span>
                  تعديل بيانات حساب: {editingUser.firstName} {editingUser.lastName}
                </span>
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
                <label className="font-bold text-slate-700 block mb-1">
                  الصفة والدور في المنصة
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e: any) => {
                    const role = e.target.value;
                    setEditingUser({
                      ...editingUser,
                      role,
                      ...(role === 'inspector'
                        ? {
                            institutionId: undefined,
                            schoolName: undefined,
                            municipality: undefined,
                          }
                        : { districtId: '' }),
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 outline-none"
                >
                  <option value="teacher">⚽ أستاذ تربية بدنية ورياضية (ابتدائي)</option>
                  <option value="inspector">🛡️ مفتش بيداغوجي (المقاطعة 07 - عين أزال)</option>
                  <option value="director">🏫 مدير مدرسة ابتدائية</option>
                  {isPlatformOwner && <option value="admin">🔑 مشرف النظام (أدمن)</option>}
                </select>
              </div>

              {editingUser.role !== 'inspector' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">الاسم الأول</label>
                    <input
                      type="text"
                      required
                      value={editingUser.firstName}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, firstName: e.target.value })
                      }
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
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    البريد الإلكتروني الحساب
                  </label>
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
                    // فارغة افتراضياً = لا تغيير؛ كان ملؤها آلياً بـ '12345678' يعيد تعيين كلمة مرور المستخدم سراً عند أي تعديل آخر
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="اتركها فارغة لإبقاء كلمة المرور الحالية"
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
                  <label className="font-bold text-slate-700 block mb-1">
                    حالة الحساب والتفعيل
                  </label>
                  <select
                    value={editingUser.status}
                    onChange={(e: any) =>
                      setEditingUser({ ...editingUser, status: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-bold text-slate-800"
                  >
                    <option value="active">نشط ومفعل</option>
                    <option value="inactive">معطل مؤقتاً</option>
                  </select>
                </div>
              </div>

              {editingUser.role !== 'inspector' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      اسم المؤسسة / المدرسة
                    </label>
                    <input
                      type="text"
                      value={editingUser.schoolName || ''}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, schoolName: e.target.value })
                      }
                      placeholder="مدرسة الشهيد بالخيري عبد القادر"
                      className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">بلدية العمل</label>
                    <input
                      type="text"
                      value={editingUser.municipality || ''}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, municipality: e.target.value })
                      }
                      placeholder="عين أزال"
                      className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مديرية التربية</label>
                  <select
                    value={editingUser.directorateId || ''}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        directorateId: e.target.value,
                        ...(editingUser.role === 'inspector' ? { districtId: '' } : {}),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="">اختر المديرية</option>
                    {geoDirectorates.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">المقاطعة التفتيشية</label>
                  <select
                    value={editingUser.districtId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, districtId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="">
                      {editingUser.role === 'inspector' ? 'اختر المقاطعة' : 'لا يوجد إسناد مفتش'}
                    </option>
                    {geoDistricts
                      .filter((d) => d.directorateId === editingUser.directorateId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
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
                        apiKeyStatus: e.target.value.trim() ? 'active' : 'not_set',
                      })
                    }
                    placeholder="AIzaSy..."
                    className="flex-1 p-2.5 rounded-xl border border-amber-300 bg-white font-mono text-xs outline-none focus:border-amber-500 dir-ltr text-left"
                  />
                  {editingUser.customApiKey && editingUser.customApiKey.trim().length > 5 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleTestUserApiKey(editingUser.id, editingUser.customApiKey!)
                      }
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
                  عند ترك هذا الحقل فارغاً، سيتصل حساب الأستاذ تلقائياً بالبنك البيداغوجي المدمج في
                  المنصة.
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

      {/* AI Provider Add/Edit Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Plug className="w-4 h-4 text-purple-600" />
                <span>
                  {editingProvider
                    ? `تعديل المزود: ${editingProvider.name}`
                    : 'إضافة مزود ذكاء اصطناعي جديد'}
                </span>
              </h3>
              <button
                onClick={closeProviderModal}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="p-6 space-y-4 text-xs">
              {providerError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[11px]">
                  {providerError}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم المزود *</label>
                <input
                  type="text"
                  required
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  placeholder="مثال: DeepSeek / Groq / مزودي الخاص"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع المزود *</label>
                  <select
                    value={providerForm.type}
                    onChange={(e) => setProviderForm({ ...providerForm, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-semibold text-slate-900"
                  >
                    <option value="openai-compatible">متوافق مع OpenAI (أي مزود)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="nvidia">NVIDIA NIM</option>
                    <option value="ollama">Ollama (محلي)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">النموذج (Model)</label>
                  <input
                    type="text"
                    value={providerForm.model}
                    onChange={(e) => setProviderForm({ ...providerForm, model: e.target.value })}
                    placeholder="مثال: deepseek-chat / gpt-4o-mini"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-mono text-xs dir-ltr text-left"
                  />
                </div>
              </div>

              {providerTypesRequiringBaseUrl.includes(providerForm.type) && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    رابط الخادم (Base URL) *
                  </label>
                  <input
                    type="text"
                    required
                    value={providerForm.baseUrl}
                    onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
                    placeholder={
                      providerForm.type === 'ollama'
                        ? 'http://localhost:11434/v1'
                        : 'https://api.deepseek.com/v1'
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-mono text-xs dir-ltr text-left"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {providerForm.type === 'ollama'
                    ? 'مفتاح API (اختياري — محلي بلا مفتاح)'
                    : 'مفتاح API'}
                </label>
                <input
                  type="password"
                  value={providerForm.apiKey}
                  onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                  placeholder={
                    editingProvider ? 'اتركه فارغاً للإبقاء على المفتاح الحالي' : 'sk-...'
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-mono text-xs dir-ltr text-left"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  يُشفَّر المفتاح ويُخزَّن في قاعدة بيانات الخادم ولا يُعاد أبداً إلى الواجهة.
                </p>
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={providerForm.enabled}
                  onChange={(e) => setProviderForm({ ...providerForm, enabled: e.target.checked })}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="font-bold text-slate-700">
                  مزوّد مفعّل (يشارك في التوليد والتحويل التلقائي)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeProviderModal}
                  disabled={providerSaving}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={providerSaving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md cursor-pointer inline-flex items-center gap-2"
                >
                  {providerSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingProvider ? 'حفظ التعديلات' : 'إضافة المزود'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
