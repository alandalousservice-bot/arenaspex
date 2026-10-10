/**
 * SPEX - Mandatory Authentication Screen
 * شاشة الدخول الإجبارية: تسجيل الدخول، إنشاء حساب جديد، واسترجاع كلمة المرور
 * PART A/A7: نموذج إنشاء حساب بسلسلة قوائم حية: مديرية ← مقاطعة (اختيارية) ← بلدية ← مدرسة (أو كتابة يدوية)
 */

import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  UserPlus,
  LogIn,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Shield,
  School,
  ArrowRight,
} from 'lucide-react';
import { User as UserType, UserRole } from '../../types/spex';
import {
  loginRequest,
  registerRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
  googleLoginRequest,
  fetchGeoDirectorates,
  fetchGeoDistricts,
  requestEmailVerification,
  verifyEmailRequest,
} from '../../services/api';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthScreenProps {
  onLoginSuccess: (user: UserType) => void;
  onBackToLanding?: () => void;
  usersList?: UserType[];
}

interface GeoOption {
  id: string;
  name: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, onBackToLanding }) => {
  const [activeForm, setActiveForm] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Geo registration states (PART A/A7)
  const [geoDirectorates, setGeoDirectorates] = useState<GeoOption[]>([]);
  const [geoDistricts, setGeoDistricts] = useState<GeoOption[]>([]);
  const [eduDirectorateId, setEduDirectorateId] = useState('');
  const [eduDistrictId, setEduDistrictId] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Reset-password form state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const canRegister = selectedRole === 'teacher' || selectedRole === 'inspector';

  useEffect(() => {
    if (!canRegister && activeForm === 'register') setActiveForm('login');
  }, [canRegister, activeForm]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('reset_token');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setActiveForm('reset');
    }
    const googleError = params.get('google_error');
    if (googleError) {
      setErrorMsg(`الدخول عبر Google: ${googleError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load directorates for registration
  useEffect(() => {
    if (activeForm !== 'register') return;
    (async () => {
      setGeoLoading(true);
      const res = await fetchGeoDirectorates();
      if (res.success) setGeoDirectorates(res.directorates);
      setGeoLoading(false);
    })();
  }, [activeForm]);

  // When directorate changes: load districts and municipalities
  useEffect(() => {
    if (!eduDirectorateId) {
      setGeoDistricts([]);
      setEduDistrictId('');
      return;
    }
    (async () => {
      setGeoLoading(true);
      const distRes = await fetchGeoDistricts(eduDirectorateId);
      if (distRes.success) setGeoDistricts(distRes.districts);
      else setGeoDistricts([]);
      setGeoLoading(false);
    })();
  }, [eduDirectorateId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني وكلمة المرور للدخول');
      return;
    }
    setIsSubmitting(true);
    const result = await loginRequest(email.trim(), password, 'professional');
    setIsSubmitting(false);
    if (result.verificationRequired) {
      setAwaitingEmailVerification(true);
      setSuccessMsg('يجب تأكيد البريد أولاً. اطلب الرمز ثم أدخله للمتابعة.');
      return;
    }
    if (!result.success || !result.user) {
      setErrorMsg(result.error || 'تعذر تسجيل الدخول.');
      return;
    }
    onLoginSuccess(result.user);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !eduDirectorateId ||
      !eduDistrictId
    ) {
      setErrorMsg('يرجى ملء كافة الحقول الأساسية لإنشاء الحساب.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    setIsSubmitting(true);
    const result = await registerRequest({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      role: selectedRole,
      eduDirectorateId,
      eduDistrictId,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMsg(result.error || 'تعذر إنشاء الحساب.');
      return;
    }
    setAwaitingEmailVerification(true);
    setSuccessMsg('إذا كان البريد مؤهلاً للتحقق، فستصلك رسالة برمز صالح لعشر دقائق.');
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!/^\d{6}$/.test(verificationCode)) {
      setErrorMsg('أدخل رمز التحقق المكوّن من ستة أرقام.');
      return;
    }
    setIsSubmitting(true);
    const result = await verifyEmailRequest(email.trim(), verificationCode);
    setIsSubmitting(false);
    if (!result.success || !result.user) {
      setErrorMsg(result.error || 'تعذر التحقق من البريد.');
      return;
    }
    onLoginSuccess(result.user);
  };

  const handleResendVerification = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    const result = await requestEmailVerification(email.trim());
    setIsSubmitting(false);
    if (!result.success) setErrorMsg(result.error || 'تعذر طلب رمز التحقق.');
    else setSuccessMsg('إذا كان البريد مؤهلاً للتحقق، فستصلك رسالة برمز صالح لعشر دقائق.');
  };

  const handleGoogleCredential = async (credential: string) => {
    setErrorMsg('');
    setIsSubmitting(true);
    const registration =
      activeForm === 'register'
        ? { role: selectedRole as 'teacher' | 'inspector', eduDirectorateId, eduDistrictId }
        : undefined;
    if (activeForm === 'register' && (!eduDirectorateId || !eduDistrictId)) {
      setIsSubmitting(false);
      setErrorMsg('اختر مديرية التربية والمقاطعة التفتيشية أولاً.');
      return;
    }
    const result = await googleLoginRequest(credential, registration);
    setIsSubmitting(false);
    if (!result.success || !result.user) {
      setErrorMsg(result.error || 'تعذر تسجيل الدخول عبر Google.');
      return;
    }
    onLoginSuccess(result.user);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني الخاص بك');
      return;
    }
    setIsSubmitting(true);
    const result = await forgotPasswordRequest(email.trim());
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMsg(result.error || 'تعذر إرسال الطلب.');
      return;
    }
    setSuccessMsg(
      result.message || 'إن كان هذا البريد مسجلاً لدينا، فسيصلك رابط إعادة التعيين خلال دقائق.'
    );
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (newPassword.length < 8) {
      setErrorMsg('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }
    setIsSubmitting(true);
    const result = await resetPasswordRequest(resetToken, newPassword);
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMsg(result.error || 'تعذر تحديث كلمة المرور.');
      return;
    }
    setResetDone(true);
    setSuccessMsg(result.message || 'تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بها.');
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="public-shell auth-shell min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {onBackToLanding && (
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <button
              type="button"
              onClick={onBackToLanding}
              className="text-xs text-slate-400 hover:text-emerald-400 font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للصفحة الرئيسية للمنصة</span>
            </button>
            <span className="text-[10px] bg-slate-700 text-slate-300 font-bold px-2 py-0.5 rounded-full">
              بوابة الدخول
            </span>
          </div>
        )}

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20 mb-2">
            <Shield className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            منصة SPEX <span className="text-blue-400">الابتدائي</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            SPEX — منصة رقمية مستقلة لأساتذة ومفتشي التربية البدنية والرياضية للطور الابتدائي
            <br />
            <span className="text-emerald-400 font-bold">
              وفق المناهج الرسمية الجزائرية للتعليم الابتدائي
            </span>
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block text-center">
            اختر صفك المهني لتوجيه شاشة الدخول:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('teacher');
                setErrorMsg('');
              }}
              className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedRole === 'teacher'
                  ? 'bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500/40 shadow-lg'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-black text-blue-400">أستاذ المادة</span>
                <School className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                المذكرة البيداغوجية، الكراس اليومي، والمخطط السنوي
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole('inspector');
                setErrorMsg('');
              }}
              className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedRole === 'inspector'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white ring-2 ring-emerald-500/40 shadow-lg'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-black text-emerald-400">مفتش بيداغوجي</span>
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                زيارات التفتيش والمتابعة الميدانية للأساتذة
              </p>
            </button>
          </div>
        </div>

        <div
          className={`${canRegister ? 'grid-cols-3' : 'grid-cols-2'} grid p-1 bg-slate-900/80 rounded-xl text-xs font-bold text-slate-400`}
        >
          <button
            onClick={() => {
              setActiveForm('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeForm === 'login' ? 'action-primary text-white shadow-md' : 'hover:text-slate-200'}`}
          >
            <LogIn className="w-3.5 h-3.5" /> تسجيل الدخول
          </button>
          {canRegister && (
            <button
              onClick={() => {
                setActiveForm('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeForm === 'register' ? 'action-primary text-white shadow-md' : 'hover:text-slate-200'}`}
            >
              <UserPlus className="w-3.5 h-3.5" /> إنشاء حساب
            </button>
          )}
          <button
            onClick={() => {
              setActiveForm('forgot');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeForm === 'forgot' ? 'action-primary text-white shadow-md' : 'hover:text-slate-200'}`}
          >
            <HelpCircle className="w-3.5 h-3.5" /> نسيت كلمة السر
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {awaitingEmailVerification && (
          <form onSubmit={handleVerifyEmail} className="space-y-4" dir="rtl">
            <p className="text-xs text-slate-300 leading-relaxed">
              أدخل الرمز المكوّن من ستة أرقام الذي أُرسل إلى البريد المدخل. تنتهي صلاحيته بعد عشر
              دقائق.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">رمز التحقق</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-center text-xl tracking-[0.5em] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 dir-ltr"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || verificationCode.length !== 6}
              className="w-full py-3 rounded-xl action-primary text-white font-bold text-xs disabled:opacity-60"
            >
              {isSubmitting ? 'جارٍ التحقق...' : 'تأكيد البريد والمتابعة'}
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isSubmitting}
              className="w-full py-2 text-xs text-blue-300 hover:text-blue-200 disabled:opacity-60"
            >
              إعادة إرسال رمز التحقق
            </button>
            <button
              type="button"
              onClick={() => {
                setAwaitingEmailVerification(false);
                setVerificationCode('');
                setSuccessMsg('');
              }}
              className="w-full py-2 text-xs text-slate-400 hover:text-white"
            >
              تغيير البريد أو العودة
            </button>
          </form>
        )}

        {!awaitingEmailVerification && activeForm === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">البريد الإلكتروني المهني</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@spex.dz"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pl-9"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pl-9"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">الرتبة / الصفة المهنية</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="teacher">أستاذ التربية البدنية (مرحلة ابتدائية)</option>
                <option value="inspector">مفتش التربية البدنية والرياضية</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'جارٍ التحقق...' : 'الدخول للمنصة البيداغوجية'}</span>
            </button>
            <div className="pt-2 text-center">
              <p className="text-[10px] text-slate-400 font-medium">
                🔒 دخول محمي. يرجى إدخال البريد الإلكتروني وكلمة المرور المسلمة لك من طرف مشرف
                المنظومة.
              </p>
            </div>
          </form>
        )}

        {activeForm === 'login' && selectedRole !== 'admin' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-700/70" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                أو
              </span>
              <div className="h-px flex-1 bg-slate-700/70" />
            </div>
            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isSubmitting} />
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              يمكنك الدخول بحساب Google إذا كان البريد مرتبطاً بحساب موجود، أو متابعة إنشاء حساب
              {selectedRole === 'inspector' ? 'مفتش' : 'أستاذ'} معلّق بانتظار تفعيل مشرف المنظومة.
            </p>
          </div>
        )}

        {!awaitingEmailVerification && activeForm === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              اختر صفتك المهنية ثم أدخل بياناتك الأساسية. تفعيل دور المفتش يخضع لمراجعة الإدارة.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">الاسم الأول *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="مثال: عبد القادر"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">اللقب *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="مثال: بومدين"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">البريد الإلكتروني *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.dz"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 dir-ltr text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">
                كلمة المرور * (6 أحرف على الأقل)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 dir-ltr text-right"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-700/50">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">مديرية التربية *</label>
                <select
                  required
                  value={eduDirectorateId}
                  onChange={(e) => {
                    setEduDirectorateId(e.target.value);
                    setEduDistrictId('');
                    setGeoDistricts([]);
                  }}
                  disabled={geoLoading}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">اختر مديرية التربية...</option>
                  {geoDirectorates.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">المقاطعة التفتيشية *</label>
                <select
                  required
                  value={eduDistrictId}
                  onChange={(e) => setEduDistrictId(e.target.value)}
                  disabled={!eduDirectorateId || geoDistricts.length === 0 || geoLoading}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-40"
                >
                  <option value="">اختر المقاطعة التفتيشية...</option>
                  {geoDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || geoLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isSubmitting ? 'جارٍ تسجيل الحساب...' : 'تسجيل الحساب والدخول لوضع المشاهدة'}
              </span>
            </button>

            {/* Google registration is limited to Teacher/Inspector pending accounts. */}
            {(selectedRole === 'teacher' || selectedRole === 'inspector') && (
              <div className="space-y-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-700/70" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    أو المتابعة عبر Google
                  </span>
                  <div className="h-px flex-1 bg-slate-700/70" />
                </div>
                <GoogleSignInButton
                  onCredential={handleGoogleCredential}
                  disabled={isSubmitting}
                  text="signup_with"
                />
                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  الحسابات العامة الجديدة تُنشأ كحساب{' '}
                  {selectedRole === 'inspector' ? 'مفتش' : 'أستاذ'} معلّق بانتظار تفعيل مشرف
                  المنظومة قبل الاستفادة من الخدمات.
                </p>
              </div>
            )}
          </form>
        )}

        {!awaitingEmailVerification && activeForm === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              أدخل بريدك الإلكتروني المهني المسجل بالنظام لاستلام رابط إعادة تعيين كلمة المرور
              فوراً.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-300">البريد الإلكتروني المهني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@spex.dz"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="action-primary w-full py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs transition-all"
            >
              {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال رابط إعادة الضبط'}
            </button>
          </form>
        )}

        {!awaitingEmailVerification && activeForm === 'reset' && (
          <div className="space-y-4">
            {!resetDone ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  أدخل كلمة مرور جديدة لحسابك. يجب أن تكون 8 أحرف على الأقل.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-300">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg transition-all"
                >
                  {isSubmitting ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveForm('login');
                  setSuccessMsg('');
                  setErrorMsg('');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>الذهاب لتسجيل الدخول</span>
              </button>
            )}
          </div>
        )}

        <div className="pt-2 text-center text-[10px] text-slate-500">
          SPEX v3.5 — وفق المناهج الرسمية الجزائرية للتعليم الابتدائي
        </div>
      </div>
    </div>
  );
};
