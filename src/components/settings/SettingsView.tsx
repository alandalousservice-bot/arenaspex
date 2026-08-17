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
  Cpu,
  Zap,
  RefreshCw,
  Sparkles,
  Bot,
  Key
} from 'lucide-react';
import { User } from '../../types/spex';
import { getStoredApiKey, setStoredApiKey, testApiKeyOnServer } from '../../services/api';

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
  { id: 'other_de', name: 'مديرية تربية أخرى...' }
];

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUpdateUser }) => {
  // Account Profile Details
  const [firstName, setFirstName] = useState(currentUser.firstName);
  const [lastName, setLastName] = useState(currentUser.lastName);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '0661234567');
  const [specialization, setSpecialization] = useState(
    currentUser.specialization || (currentUser.role === 'inspector' ? 'مفتش إدارة وابتدائيات التربية البدنية' : 'أستاذ التربية البدنية والرياضية - الطور الابتدائي')
  );
  const [yearsExperience, setYearsExperience] = useState(currentUser.yearsExperience || 5);

  // Security Credentials (Password)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Administrative / School details
  const [schoolName, setSchoolName] = useState(currentUser.schoolName || 'مدرسة الشهيد بالخيري عبد القادر');
  const [municipality, setMunicipality] = useState(currentUser.municipality || 'عين أزال');
  const [directorateId, setDirectorateId] = useState(currentUser.directorateId || 'setif_de');
  const [customDirectorateName, setCustomDirectorateName] = useState('');
  const [districtId, setDistrictId] = useState(currentUser.districtId || 'dist_setif_7');
  const [customDistrictName, setCustomDistrictName] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Custom API Key per Account (Dedicated AI Agent / Pedagogical Engine Key)
  const [customApiKeyInput, setCustomApiKeyInput] = useState(() => {
    return currentUser.customApiKey || getStoredApiKey() || '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyTestLoading, setKeyTestLoading] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

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
        type: 'warning'
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
        type: 'success'
      });
    } else if (result.quotaExhausted) {
      setKeyTestFeedback({
        message: result.message,
        type: 'warning'
      });
    } else {
      setKeyTestFeedback({
        message: result.message,
        type: 'error'
      });
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Password validation if user entered a new password
    // الحد الأدنى 8 أحرف — موحّد مع سياسة الخادم (reset-password / bootstrap تفرض 8)
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

    // Save API key locally and on user object
    const trimmedKey = customApiKeyInput.trim();
    setStoredApiKey(trimmedKey);

    const updatedUser: User = {
      ...currentUser,
      firstName,
      lastName,
      email: email.trim(),
      phone,
      specialization,
      yearsExperience,
      schoolName,
      municipality,
      directorateId: directorateId === 'other_de' && customDirectorateName ? customDirectorateName : directorateId,
      districtId: districtId === 'custom' && customDistrictName ? customDistrictName : districtId,
      customApiKey: trimmedKey,
      apiKeyStatus: trimmedKey ? 'active' : 'not_set',
      ...(newPassword ? { password: newPassword } : {})
    };

    onUpdateUser(updatedUser);
    setSavedSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  // Find current directorate display name
  const selectedDirObj = ALL_ALGERIAN_DIRECTORATES.find((d) => d.id === directorateId);
  const directorateDisplayName = selectedDirObj ? selectedDirObj.name : (directorateId || 'مديرية التربية لولاية سطيف');

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
          إعدادات الحساب والأمان والانتساب الإداري
        </span>
        <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-600" />
          <span>إدارة حساب الأستاذ والمفتش وتعديل البريد الإلكتروني وكلمة المرور</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          يمكنك تعديل بيانات الاعتماد الرسمية، البريد الإلكتروني، كلمة السر، بيانات المدرسة والمقاطعة. يتم حفظ التغييرات مباشرة في قاعدة بيانات المنصة.
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
                  required
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

          {/* Section 2: Personal Details */}
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

              <div>
                <label className="font-bold text-slate-700 block mb-1">التخصص والصفة المهنية</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                  placeholder="مثال: أستاذ التربية البدنية والرياضية للتعليم الابتدائي"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">سنوات الخبرة المهنية</label>
                <input
                  type="number"
                  min={0}
                  max={45}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Administrative & School Assignment */}
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
                  placeholder="مثال: مدرسة الشهيد بالخيري عبد القادر"
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
                <label className="font-bold text-slate-700 block mb-1">مديرية التربية لولاية</label>
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
                <label className="font-bold text-slate-700 block mb-1">المقاطعة التفتيشية المنسوب إليها</label>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold bg-white"
                >
                  <option value="dist_setif_7">المقاطعة 07 - عين أزال (سطيف)</option>
                  <option value="dist_setif_1">المقاطعة 01 - سطيف شرق</option>
                  <option value="dist_setif_2">المقاطعة 02 - سطيف غرب</option>
                  <option value="dist_setif_5">المقاطعة 05 - عين ولمان</option>
                  <option value="dist_alg_1">المقاطعة التفتيشية الأولى - رويبة والدار البيضاء</option>
                  <option value="dist_oran_1">المقاطعة التفتيشية 01 - وهران شرق</option>
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
                <div>🏫 <strong>المدرسة:</strong> {schoolName || 'لم تحدد'}</div>
                <div>📍 <strong>البلدية:</strong> {municipality || 'لم تحدد'}</div>
                <div>🏛️ <strong>المديرية:</strong> {directorateDisplayName}</div>
                <div>🛡️ <strong>المقاطعة:</strong> {districtId === 'custom' ? customDistrictName : districtId}</div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 flex-wrap gap-3">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> تم حفظ التغييرات والبريد الإلكتروني وكلمة المرور بنجاح في قاعدة البيانات!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                🔒 يتم حفظ التعديلات وحمايتها فوراً للاستخدام بجميع الجلسات القادمة.
              </span>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all mr-auto cursor-pointer flex items-center gap-2 text-xs"
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
