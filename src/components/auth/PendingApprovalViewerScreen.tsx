/**
 * SPEX - Pending Approval & Platform Viewer Screen
 * واجهة الحساب غير المفعل / حساب للمشاهدة ومزايا المنصة
 * تظهر فور تسجيل الدخول لأي حساب جديد بانتظار تفعيل المشرف
 */

import React, { useState } from 'react';
import {
  Lock,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  Mail,
  RefreshCw,
  LogOut,
  Building2,
  BookOpen,
  Calendar,
  Award,
  FileText,
  BrainCircuit,
  Users,
  Zap,
  School,
  ExternalLink,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import { User } from '../../types/spex';

interface PendingApprovalViewerScreenProps {
  user: User;
  onLogout: () => void;
  onRefreshStatus: () => Promise<void>;
}

export const PendingApprovalViewerScreen: React.FC<PendingApprovalViewerScreenProps> = ({
  user,
  onLogout,
  onRefreshStatus
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    await onRefreshStatus();
    setIsRefreshing(false);
    setRefreshMessage('تم تحديث حالة الحساب من خادم المنظومة');
    setTimeout(() => setRefreshMessage(null), 4000);
  };

  const isInactive = user.status === 'inactive';
  const isPending = !user.isApprovedByAdmin || user.status === 'pending_approval';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-x-hidden selection:bg-purple-500 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-extrabold shadow-md shadow-purple-600/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  منصة SPEX الرقمية <span className="text-purple-400 text-xs font-bold">| وضع المشاهدة</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{isInactive ? 'حساب معطل مؤقتاً' : 'في انتظار تفعيل المشرف'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                وزارة التربية الوطنية - منظومة التربية البدنية والرياضية (الطور الابتدائي)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="إعادة التحديث للتحقق هل قام المشرف بتفعيل حسابك"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">فحص حالة التفعيل</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs rounded-xl transition-all border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Status Notification Box */}
        {refreshMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{refreshMessage}</span>
            </div>
          </div>
        )}

        {/* Top Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950/80 to-indigo-950 p-6 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>حساب للمشاهدة والاطلاع على مزايا المنظومة</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              أهلاً بك أستاذ <span className="text-purple-400">{user.firstName} {user.lastName}</span> في منصة SPEX الرقمية
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              تم إنشاء تسجيلك بنجاح على المنظومة! نظراً لخصوصية معطيات المناهج البيداغوجية وسجلات المفتشية بالطور الابتدائي، ينطوي تفعيل الحساب للعمل الكامل على <strong>اعتماد وموافقة مشرف المنظومة الرقمية</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                  👤
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">صاحب الحساب</div>
                  <div className="font-extrabold text-white">{user.firstName} {user.lastName} ({user.email})</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                  🏫
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">المؤسسة / المقاطعة</div>
                  <div className="font-extrabold text-white">{user.schoolName || 'عين أزال'} - {user.municipality || 'سطيف'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Card: Contact Supervisor for Activation */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-purple-950/40 border-2 border-amber-500/40 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                <span>خطوات تفعيل الحساب والبدء في استغلال المنصة</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                تواصل مع مشرف المنظومة الرقمية لتفعيل حسابك الآن
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                يرجى التواصل المباشر مع مشرف القطاع أو المفتش البيداغوجي المعتمد بمقاطعتك لتأكيد هويتك والتحقق من التعيين المهني، وسيتم منحك صلاحية الوصول الكاملة فوراً.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <a
                href="https://wa.me/213661234567?text=%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D9%82%D9%85%D8%AA%20%D8%A8%D8%AA%D8%B3%D8%AC%D9%8A%D9%84%20%D8%AD%D8%B3%D8%A7%D8%A8%20%D8%AC%D8%AF%D9%8A%D8%AF%20%D8%B9%D9%84%D9%89%20%D9%85%D9%86%D8%B5%D8%A9%20SPEX%20%D9%88%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%D9%87"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <PhoneCall className="w-4 h-4" />
                <span>التواصل المباشر مع المشرف (واتساب / هاتف)</span>
              </a>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-5 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>تم التواصل؟ اضغط هنا لإعادة الفحص</span>
              </button>
            </div>
          </div>
        </div>

        {/* Platform Capabilities Showcase (مزايا وإمكانيات منصة SPEX) */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>استكشف مزايا المنظومة الرقمية SPEX</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              أبرز الإمكانيات المتاحة فور تفعيل حسابك من المشرف
            </h3>
            <p className="text-xs text-slate-400">
              منظومة متكاملة مصممة خصيصاً لتسهيل عمل أستاذ ومفتش التربية البدنية والرياضية للطور الابتدائي
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-extrabold group-hover:scale-110 transition-transform border border-blue-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-white">توليد المذكرات البيداغوجية الذكية</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                إنشاء مذكرات تربوية سريعة ومطابقة لمنهاج وزارة التربية الوطنية، مع صياغة الأهداف الإجرائية والوضعيات التعلمية للطور الابتدائي تلقائياً.
              </p>
              <div className="text-[11px] text-purple-400 font-bold flex items-center gap-1">
                <span>توليد آلي بنقرة واحدة</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-extrabold group-hover:scale-110 transition-transform border border-emerald-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-white">الكراس اليومي الرقمي المباشر</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                متابعة وإثبات تنفيذ الحصص والأنشطة اليومية، مع الربط التلقائي بالمذكرات وتوثيق الملاحظات والمبررات البيداغوجية.
              </p>
              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <span>توثيق يومي معتمد</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-extrabold group-hover:scale-110 transition-transform border border-amber-500/20">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-white">المخططات والتدرجات السنوية الرسمية</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                توزيع الميادين البدنية والرياضية والوحدات التعلمية عبر الأسابيع والفصول الدراسية وفق التدرجات الرسمية لسنة 2025/2026.
              </p>
              <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                <span>توزيع مدروس ومحيّن</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-extrabold group-hover:scale-110 transition-transform border border-purple-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-white">بوابة التوجيه والمتابعة مع المفتش</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                استلام الملاحظات والتوجيهات البيداغوجية المباشرة من مفتش المقاطعة، والاطلاع على تقارير زيارات المعاينة والتفتيش.
              </p>
              <div className="text-[11px] text-purple-400 font-bold flex items-center gap-1">
                <span>تواصل وتأطير مباشر</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-extrabold group-hover:scale-110 transition-transform border border-indigo-500/20">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-white">بنك المعرفة والألعاب شبه الرياضية</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                مكتبة بيداغوجية غنية تتضمن مئات الألعاب التنافسية والتمارين الهادفة لتطوير الصفات البدنية والتوافق الحركي لدى التلاميذ.
              </p>
              <div className="text-[11px] text-indigo-400 font-bold flex items-center gap-1">
                <span>أكثر من 500 وضعية تربوية</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-extrabold group-hover:scale-110 transition-transform border border-rose-500/20">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-white">المجتمع المهني التفاعلي</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                التواصل وتبادل الخبرات بين أساتذة ومفتشي المقاطعات التفتيشية المختلفة، ومشاركة المذكرات والتجارب الميدانية الناجحة.
              </p>
              <div className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                <span>شبكة مهنية متخصصة</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 mt-12 text-center text-xs text-slate-500">
        <p>منصة SPEX الرقمية - جميع الحقوق محفوظة لوزارة التربية الوطنية 2025/2026</p>
      </footer>
    </div>
  );
};
