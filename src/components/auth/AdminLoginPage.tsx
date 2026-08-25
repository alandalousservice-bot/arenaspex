import React, { useState } from 'react';
import { AlertCircle, ArrowRight, KeyRound, Lock, LogIn, ShieldCheck } from 'lucide-react';
import { loginRequest } from '../../services/api';
import { User } from '../../types/spex';

interface AdminLoginPageProps {
  onLoginSuccess: (user: User) => void;
  onBackToProfessionalLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToProfessionalLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setSubmitting(true);
    const result = await loginRequest(email.trim(), password, 'admin');
    setSubmitting(false);
    if (!result.success || !result.user) {
      setError(result.error || 'تعذر تسجيل الدخول.');
      return;
    }
    onLoginSuccess(result.user);
  };
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-slate-900/95 p-6 sm:p-8 text-white shadow-2xl">
        <button
          type="button"
          onClick={onBackToProfessionalLogin}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-purple-300"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى بوابة الأستاذ والمفتش
        </button>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-700 to-slate-700 shadow-lg">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-black">دخول إدارة المنظومة</h1>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            هذه البوابة مخصصة لحسابات إدارة المنظومة المصرح بها.
          </p>
        </div>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-bold text-slate-300">
            البريد الإلكتروني
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-purple-500"
            />
          </label>
          <label className="block text-xs font-bold text-slate-300">
            كلمة المرور
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-purple-500"
              />
              <Lock className="absolute left-3 top-4 h-4 w-4 text-slate-500" />
            </div>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 py-3 text-xs font-black hover:bg-purple-600 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {submitting ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <KeyRound className="h-3.5 w-3.5" />
          لا يوجد تسجيل عام لحسابات الإدارة.
        </div>
      </div>
    </div>
  );
};
