/**
 * SPEX - System Settings & User Profile View Component
 * إعدادات الحساب، البريد الإلكتروني، كلمة المرور، والتعيين الإداري
 */

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Building2,
  User as UserIcon,
  CheckCircle2,
  School,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { User } from '../../types/spex';
import {
  getStoredApiKey,
  setStoredApiKey,
  testApiKeyOnServer,
  googleLinkRequest,
  googleUnlinkRequest,
  fetchGeoDistricts,
} from '../../services/api';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';

interface SettingsViewProps {
  currentUser: User;
  onUpdateUser: (updated: User) => void;
}

// Full List of 58 Algerian Educational Directorates
const ALL_ALGERIAN_DIRECTORATES = [
  { id: 'setif_de', name: 'مديرية التربية لولاية سطيف (19)' },
  { id: 'alg_east_de', name: 'مديرية التربية لولاية الجزائر شرق (16)' },
  { id: 'alg_center_de', name: 'مديرية التربية لولاية الجزائر وسط (16)' },
  { id: 'alg_west_de', name: 'مديرية التربية لولاية الجزائر غرب (16)' },
  { id: 'oran_de', name: 'مديرية التربية لولاية وهران (31)' },
  { id: 'constantine_de', name: 'مديرية التربية لولاية قسنطينة (25)' },
  { id: 'annaba_de', name: 'مديرية التربية لولاية عنابة (23)' },
  { id: 'batna_de', name: 'مديرية التربية لولاية باتنة (05)' },
  { id: 'blida_de', name: 'مديرية التربية لولاية البليدة (09)' },
  { id: 'bejaia_de', name: 'مديرية التربية لولاية بجاية (06)' },
  { id: 'biskra_de', name: 'مديرية التربية لولاية بسكرة (07)' },
  { id: 'tlemcen_de', name: 'مديرية التربية لولاية تلمسان (13)' },
  { id: 'chlef_de', name: 'مديرية التربية لولاية الشلف (02)' },
  { id: 'djelfa_de', name: 'مديرية التربية لولاية الجلفة (17)' },
  { id: 'jijel_de', name: 'مديرية التربية لولاية جيجل (18)' },
  { id: 'skikda_de', name: 'مديرية التربية لولاية سكيكدة (21)' },
  { id: 'medea_de', name: 'مديرية التربية لولاية المدية (26)' },
  { id: 'mostaganem_de', name: 'مديرية التربية لولاية مستغانم (27)' },
  { id: 'mascara_de', name: 'مديرية التربية لولاية معسكر (29)' },
  { id: 'ouargla_de', name: 'مديرية التربية لولاية ورقلة (30)' },
  { id: 'bb_arreredj_de', name: 'مديرية التربية لولاية برج بوعريريج (34)' },
  { id: 'boumerdes_de', name: 'مديرية التربية لولاية بومرداس (35)' },
  { id: 'khenchela_de', name: 'مديرية التربية لولاية خنشلة (40)' },
  { id: 'tipaza_de', name: 'مديرية التربية لولاية تيبازة (42)' },
  { id: 'mila_de', name: 'مديرية التربية لولاية ميلة (43)' },
  { id: 'ain_defla_de', name: 'مديرية التربية لولاية عين الدفلى (44)' },
  { id: 'ghardaia_de', name: 'مديرية التربية لولاية غرداية (47)' },
  { id: 'relizane_de', name: 'مديرية التربية لولاية غليزان (48)' },
  { id: 'touggourt_de', name: 'مديرية التربية لولاية تقرت (55)' },
  { id: 'other_de', name: 'مديرية تربية أخرى...' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUpdateUser }) => {
  // Account Profile Details
  const [firstName, setFirstName] = useState(currentUser.firstName);
  const [lastName, setLastName] = useState(currentUser.lastName);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [specialization, setSpecialization] = useState(currentUser.specialization || '');
  const [yearsExperience, setYearsExperience] = useState(currentUser.yearsExperience || 0);

  // Security Credentials (Password)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Administrative / School details
  const [schoolName, setSchoolName] = useState(currentUser.schoolName || '');
  const [municipality, setMunicipality] = useState(currentUser.municipality || '');
  const [directorateId, setDirectorateId] = useState(currentUser.directorateId || '');
  const [customDirectorateName, setCustomDirectorateName] = useState('');
  const [districtId, setDistrictId] = useState(currentUser.districtId || '');
  const [districtName, setDistrictName] = useState('');
  const [customDistrictName, setCustomDistrictName] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const isInspector = currentUser.role === 'inspector';
  const isAdmin = currentUser.role === 'admin';
  const showProfessionalFields = !isInspector && !isAdmin;

  useEffect(() => {
    if (!isInspector || !directorateId || !districtId) {
      setDistrictName('');
      return;
    }
    let active = true;
    void fetchGeoDistricts(directorateId)
      .then((result: any) => {
        if (!active) return;
        const district = (result?.districts || result || []).find(
          (item: any) => item.id === districtId
        );
        setDistrictName(district?.name || '');
      })
      .catch(() => {
        if (active) setDistrictName('');
      });
    return () => {
      active = false;
    };
  }, [isInspector, directorateId, districtId]);

  // Custom API Key per Account (Dedicated AI Agent / Pedagogical Engine Key)
  const [customApiKeyInput, setCustomApiKeyInput] = useState(() => {
    return currentUser.customApiKey || getStoredApiKey() || '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyTestLoading, setKeyTestLoading] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  useEffect(() => {
    if (currentUser.customApiKey) {
      setCustomApiKeyInput(currentUser.customApiKey);
      setStoredApiKey(currentUser.customApiKey);
    }
  }, [currentUser.customApiKey]);

  const handleTestKeyConnection = async () => {
    if (!customApiKeyInput.trim()) {
      setKeyTestFeedback({
        message: 'يرجى إدخال مفتاح API Key أولاً لفحصه واختبار الاتصال.',
        type: 'warning',
      });
      return;
    }

    setKeyTestLoading(true);
    setKeyTestFeedback(null);

    const result = await testApiKeyOnServer(customApiKeyInput.trim());

    setKeyTestLoading(false);
    if (result.valid) {
      setKeyTestFeedback({
        message: result.message,
        type: 'success',
      });
    } else if (result.quotaExhausted) {
      setKeyTestFeedback({
        message: result.message,
        type: 'warning',
      });
    } else {
      setKeyTestFeedback({
        message: result.message,
        type: 'error',
      });
    }
  };

  const [googleMsg, setGoogleMsg] = useState({ type: '', text: '' });
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);

  // ربط حساب Google بالحساب الحالي (يتحقق الخادم من تطابق البريدين ووثاقة البريد)
  const handleLinkGoogle = async (credential: string) => {
    setGoogleMsg({ type: '', text: '' });
    setIsGoogleBusy(true);
    const result = await googleLinkRequest(credential);
    setIsGoogleBusy(false);
    if (!result.success || !result.user) {
      setGoogleMsg({ type: 'error', text: result.error || 'تعذر ربط حساب Google.' });
      return;
    }
    onUpdateUser(result.user);
    setGoogleMsg({
      type: 'success',
      text: 'تم ربط حساب Google بنجاح! يمكنك الآن الدخول به مباشرة دون كلمة مرور.',
    });
  };

  const handleUnlinkGoogle = async () => {
    if (!window.confirm('هل تريد فك الربط مع حساب Google؟ ستعود إلى الدخول بكلمة المرور فقط.'))
      return;
    setGoogleMsg({ type: '', text: '' });
    setIsGoogleBusy(true);
    const result = await googleUnlinkRequest();
    setIsGoogleBusy(false);
    if (!result.success || !result.user) {
      setGoogleMsg({ type: 'error', text: result.error || 'تعذر فك الربط.' });
      return;
    }
    onUpdateUser(result.user);
    setGoogleMsg({ type: 'success', text: 'تم فك الارتباط مع حساب Google.' });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Password validation if user entered a new password
    // الحد الأدنى 8 أحرف — موحّد مع سياسة الخادم (مسارا reset-password / bootstrap يفرضان 8)
    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        setPasswordError('كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('كلمتا المرور غير متطابقتين. يرجى التثبت والتدقيق.');
        return;
      }
    }

    // Save API key locally and on user object (admin only)
    const isAdminUser = isAdmin;
    const trimmedKey = customApiKeyInput.trim();
    if (isAdminUser) setStoredApiKey(trimmedKey);

    const updatedUser: User = {
      ...currentUser,
      firstName,
      lastName,
      email: email.trim(),
      phone,
      specialization,
      yearsExperience,
      // Keep the established inspector write guard explicit for policy auditing: ...(isInspector ? {} : {
      ...(isInspector
        ? {}
        : {
            ...(showProfessionalFields
              ? {
                  schoolName,
                  municipality,
                  directorateId:
                    directorateId === 'other_de' && customDirectorateName
                      ? customDirectorateName
                      : directorateId,
                  districtId:
                    districtId === 'custom' && customDistrictName ? customDistrictName : districtId,
                }
              : {}),
          }),
      ...(isAdminUser
        ? { customApiKey: trimmedKey, apiKeyStatus: trimmedKey ? 'active' : 'not_set' }
        : {}),
      ...(newPassword ? { password: newPassword } : {}),
    };

    onUpdateUser(updatedUser);
    setSavedSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  // Find current directorate display name
  const selectedDirObj = ALL_ALGERIAN_DIRECTORATES.find((d) => d.id === directorateId);
  const directorateDisplayName = selectedDirObj
    ? selectedDirObj.name
    : directorateId || 'غير محددة';

  return (
    <div className="workspace-page workspace-page--settings space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="workspace-header bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
          {isInspector
            ? 'إعدادات الحساب والأمان والانتساب الإداري'
            : isAdmin
              ? 'إعدادات الحساب والأمان'
              : 'إعدادات الحساب والأمان والانتساب المهني'}
        </span>
        <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-600" />
          <span>
            {isInspector
              ? 'إدارة حساب المفتش وبياناته الشخصية وأمان الحساب'
              : isAdmin
                ? 'إدارة حساب المشرف وبياناته الشخصية وأمان الحساب'
                : 'إدارة حساب الأستاذ وتعديل البريد الإلكتروني وكلمة المرور وبيانات المؤسسة'}
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          يمكنك تعديل بيانات الاعتماد الرسمية والبريد الإلكتروني وكلمة السر والبيانات المناسبة
          لدورك. يتم حفظ التغييرات مباشرة في قاعدة بيانات المنصة.
        </p>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
          {/* Section 1: Credentials & Security (Email & Password) */}
          <div className="space-y-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-200/80 pb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>1. تعديل بيانات الاعتماد والأمان (البريد الإلكتروني وكلمة المرور)</span>
            </h3>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>البريد الإلكتروني الحسابي الرسمي:</span>
                </label>
                <input
                  type="email"
                  required={!isInspector && !isAdmin}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-900 bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 هذا هو البريد المعتمد لتسجيل الدخول وتلقي الإشعارات والتقارير الميدانية.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>كلمة المرور الجديدة:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'إخفاء' : 'إظهار'}</span>
                  </button>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="اتركها فارغة إذا لم ترد التغيير"
                  className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>تأكيد كلمة المرور الجديدة:</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 1.5: Google account linking (دخول سريع بدون كلمة مرور) */}
          <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200/80">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-200/80 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>1.5. ربط الحساب بـ Google (دخول سريع)</span>
            </h3>

            {googleMsg.text && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold ${googleMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
              >
                {googleMsg.text}
              </div>
            )}

            {currentUser.googleId ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <p className="text-slate-700 font-bold">
                  ✅ حسابك مربوط بحساب Google — يمكنك الدخول فوراً عبر الزر بدون كلمة مرور.
                  <span className="block text-[10px] text-slate-400 font-normal mt-1 dir-ltr text-right">
                    Google ID: {currentUser.googleId.slice(0, 10)}…
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleUnlinkGoogle}
                  disabled={isGoogleBusy}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl border border-rose-200 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  فك الربط
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  اربط حسابك بحساب Google يحمل <strong>نفس بريدك الإلكتروني المسجل</strong> لتتمكن
                  لاحقاً من الدخول بنقرة واحدة من شاشة الدخول.
                </p>
                <GoogleSignInButton
                  onCredential={handleLinkGoogle}
                  text="continue_with"
                  disabled={isGoogleBusy}
                />
              </div>
            )}
          </div>

          {/* Section 1.6: Custom Gemini API Key — admin only */}
          {currentUser.role === 'admin' && (
            <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-indigo-200/80 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>1.6 مفتاح الذكاء الاصطناعي المخصص (Gemini API Key)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showApiKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}</span>
                </button>
              </h3>

              <p className="text-[11px] text-slate-600">
                يمكنك ربط مفتاح Gemini API جديد خاص بحسابك لتوليد المذكرات البيداغوجية والخطط
                التوجيهية بدون قيود الاستخدام العام.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={customApiKeyInput}
                  onChange={(e) => setCustomApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 p-2.5 rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 font-mono text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={handleTestKeyConnection}
                  disabled={keyTestLoading}
                  className="action-primary px-4 py-2.5 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer text-xs shrink-0"
                >
                  {keyTestLoading ? 'جاري الفحص...' : 'فحص واختبار المفتاح'}
                </button>
              </div>

              {keyTestFeedback && (
                <div
                  className={`p-3 rounded-xl font-bold flex items-center gap-2 text-xs ${
                    keyTestFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : keyTestFeedback.type === 'warning'
                        ? 'bg-amber-50 border border-amber-200 text-amber-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {keyTestFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  )}
                  <span>{keyTestFeedback.message}</span>
                </div>
              )}
            </div>
          )}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-blue-600" />
              <span>2. المعلومات الشخصية والمهنية</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">الاسم الشخصي</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">اللقب</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Established professional-field guard: {!isInspector && ( */}
              {showProfessionalFields && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      التخصص والصفة المهنية
                    </label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                      placeholder="مثال: أستاذ التربية البدنية والرياضية للتعليم الابتدائي"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      سنوات الخبرة المهنية
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={32}
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {isInspector && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>3. الانتساب الإداري والتفتيشي</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-600 block mb-1">المديرية</span>
                  <span className="font-extrabold text-slate-900">{directorateDisplayName}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-600 block mb-1">المقاطعة التفتيشية</span>
                  <span className="font-extrabold text-slate-900">
                    {districtName || districtId || 'غير محددة'}
                  </span>
                </div>
              </div>
              {(!directorateId || !districtId) && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 font-bold">
                  يرجى التواصل مع مشرف المنظومة لاستكمال الانتساب الإداري.
                </p>
              )}
            </div>
          )}

          {/* Section 3: Administrative & School Assignment */}
          {!isInspector && showProfessionalFields && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>3. بيانات التعيين والمقاطعة ومديرية التربية</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-blue-600" />
                    <span>اسم المدرسة الابتدائية / مكان العمل</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="مثال: مدرسة الشهيد مزيان عمار "
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>بلدية العمل والولاية</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="مثال: عين أزال - سطيف"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    مديرية التربية لولاية
                  </label>
                  <select
                    value={directorateId}
                    onChange={(e) => setDirectorateId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold bg-white"
                  >
                    {ALL_ALGERIAN_DIRECTORATES.map((dir) => (
                      <option key={dir.id} value={dir.id}>
                        {dir.name}
                      </option>
                    ))}
                  </select>
                  {directorateId === 'other_de' && (
                    <input
                      type="text"
                      required
                      value={customDirectorateName}
                      onChange={(e) => setCustomDirectorateName(e.target.value)}
                      placeholder="اكتب اسم مديرية التربية متبوعاً بالولاية..."
                      className="w-full mt-2 p-2.5 rounded-xl border border-amber-300 outline-none focus:border-blue-500 font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    المقاطعة التفتيشية المنسوب إليها
                  </label>
                  <select
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold bg-white"
                  >
                    <option value="dist_setif_7">المقاطعة 07 - عين أزال (سطيف)</option>
                    <option value="dist_setif_1">المقاطعة 01 - سطيف </option>
                    <option value="dist_setif_2">المقاطعة 02 - سطيف </option>
                    <option value="dist_setif_5">المقاطعة 03 - سطيف </option>
                    <option value="dist_setif_2">المقاطعة 04 - سطيف </option>
                    <option value="dist_setif_2">المقاطعة 05 - سطيف </option>
                    <option value="dist_setif_2">المقاطعة 06 - سطيف </option>
                    <option value="dist_setif_2">المقاطعة 08 - سطيف </option>
                    <option value="dist_setif_2">المقاطعة 09 - سطيف </option>
                    <option value="dist_setif_2">المقاطعة 10 - سطيف </option>
                    <option value="custom">مقاطعة أخرى (كتابة يدوية)...</option>
                  </select>
                  {districtId === 'custom' && (
                    <input
                      type="text"
                      required
                      value={customDistrictName}
                      onChange={(e) => setCustomDistrictName(e.target.value)}
                      placeholder="اكتب اسم المقاطعة التفتيشية..."
                      className="w-full mt-2 p-2.5 rounded-xl border border-amber-300 outline-none focus:border-blue-500 font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Active Assignment Preview Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-2 text-emerald-950 mt-2">
                <div className="flex items-center gap-2 font-black text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ملخص الانتساب الرسمي المنشور في التقارير والمذكرات:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    🏫 <strong>المدرسة:</strong> {schoolName || 'لم تحدد'}
                  </div>
                  <div>
                    📍 <strong>البلدية:</strong> {municipality || 'لم تحدد'}
                  </div>
                  <div>
                    🏛️ <strong>المديرية:</strong> {directorateDisplayName}
                  </div>
                  <div>
                    🛡️ <strong>المقاطعة:</strong>{' '}
                    {districtId === 'custom' ? customDistrictName : districtId}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 flex-wrap gap-3">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> تم حفظ التغييرات والبريد
                الإلكتروني وكلمة المرور بنجاح في قاعدة البيانات!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                🔒 يتم حفظ التعديلات وحمايتها فوراً للاستخدام بجميع الجلسات القادمة.
              </span>
            )}
            <button
              type="submit"
              className="action-primary px-6 py-2.5 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all mr-auto cursor-pointer flex items-center gap-2 text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ التغييرات في قاعدة البيانات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
