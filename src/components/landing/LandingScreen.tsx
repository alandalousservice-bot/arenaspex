/**
 * SPEX Engine - Official Platform Landing Index Screen
 * صفحة الهبوط والتعريف بالمنظومة الرقمية الوطنية للتربية البدنية والرياضية
 */

import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  LogIn,
  BookOpen,
  Users,
  Award,
  Zap,
  CheckCircle2,
  Building2,
  FileText,
  Lock,
  ArrowLeft,
  ChevronDown,
  GraduationCap,
  Layers,
  BarChart3,
  HelpCircle
} from 'lucide-react';

interface LandingScreenProps {
  onGoToLogin: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onGoToLogin }) => {
  const scrollToFeatures = () => {
    const el = document.getElementById('platform-features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (

    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between relative overflow-x-hidden" dir="rtl">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[450px] h-[450px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & National Branding */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-600 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">
                  SPEX <span className="text-emerald-400">ENGINE</span>
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  v2.5 الرسمية
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                المنظومة الرقمية للتربية البدنية والرياضية • التعليم الابتدائي
              </p>
            </div>
          </div>

          {/* Login Action CTA Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={onGoToLogin}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول للمنصة</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Promotional Hero Billboard */}
      <main className="flex-1">
        <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Top National Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-8 shadow-xl">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>الجمهورية الجزائرية الديمقراطية الشعبية • وزارة التربية الوطنية</span>
            <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded-md font-mono mr-1">
              DZ-2026
            </span>
          </div>

          {/* Big Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight sm:leading-tight tracking-tight max-w-5xl mx-auto mb-6">
            المنصة الرقمية الموحدة لتدبير وقيادة{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
              التربية البدنية والرياضية
            </span>{' '}
            بالتعليم الابتدائي
          </h1>

          {/* Subtitle description */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium mb-10">
            بيئة بيداغوجية متكاملة تجمع بين{' '}
            <strong className="text-white">أستاذ المادة</strong>،{' '}
            <strong className="text-emerald-400">المفتش البيداغوجي</strong>، و{' '}
            <strong className="text-teal-300">مدير المدرسة الابتدائية</strong>{' '}
            لإعداد المذكرات الرقمية، متابعة الكراس اليومي، تقييم الكفاءات، واستخراج التقارير الرسمية بدقة متناهية.
          </p>

          {/* Primary & Secondary Call To Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onGoToLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-2xl shadow-emerald-500/40 transition-all transform hover:scale-105 flex items-center justify-center gap-3 cursor-pointer group"
            >
              <LogIn className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>المتابعة والتسجيل في المنصة الآن</span>
              <ArrowLeft className="w-4 h-4 text-slate-900" />
            </button>

            <button
              onClick={scrollToFeatures}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>استكشاف المميزات والهيكل التنظيمي</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Security Banner Alert - Crucial for user intent */}
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-right flex items-start gap-3 shadow-xl">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <span>تنبيه دخول آمن وحصري:</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full">
                  محمي بنظام التشفير
                </span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                المنظومة رقمية مغلقة ولا يتم تسجيل الدخول التلقائي لأي زائر. يتوجب عليك الضغط على زر
                <strong className="text-emerald-400 mx-1">"تسجيل الدخول"</strong> وإدخال البريد الإلكتروني الرسمي وكلمة المرور الخاصة بحسابك البيداغوجي.
              </p>
            </div>
          </div>
        </section>

        {/* Live System Stats */}
        <section className="bg-slate-900/60 border-y border-slate-800/80 py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mb-1">57</div>
              <div className="text-xs text-slate-400 font-bold">مديرية تربية موحدة</div>
              <div className="text-[10px] text-slate-500 mt-0.5">تحديث سطيف والولايات المجارورة</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-teal-400 mb-1">09</div>
              <div className="text-xs text-slate-400 font-bold">مقاطعات مفتشين مفعلة</div>
              <div className="text-[10px] text-slate-500 mt-0.5">مفتشو ولاية سطيف معتمدون بالكامل</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-blue-400 mb-1">+100</div>
              <div className="text-xs text-slate-400 font-bold">مذكرة بيداغوجية نموذجية</div>
              <div className="text-[10px] text-slate-500 mt-0.5">موزعة على جميع الأطوار الثلاثة</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-purple-400 mb-1">100%</div>
              <div className="text-xs text-slate-400 font-bold">مطابقة للمناهج الوزارية</div>
              <div className="text-[10px] text-slate-500 mt-0.5">وفق المنشور الوزاري الأخير</div>
            </div>
          </div>
        </section>

        {/* Platform Modules & Features */}
        <section id="platform-features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>هيكلة المنظومة البيداغوجية الشاملة</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              خدمات مخصصة لكل متدخل في المنظومة التربوية
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              تتيح منصة SPEX Engine بيئات عمل مستقلة ومتكاملة تلبي احتياجات الأستاذ، المفتش، والمدير.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Teacher Module */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-blue-500/50 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">بوابة أستاذ التربية البدنية</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تتيح للأستاذ إعداد المذكرات البيداغوجية، تدوين الكراس اليومي، متابعة المخطط السنوي للتعلمات، وحساب معدلات التلاميذ بآلية فورية.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>مذكرات رقمية لكافة المقاطع الحركية</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>الكراس اليومي التفاعلي مع توثيق الحصص</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>دفتر تقييم الكفاءات الحركية والوجدانية</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6">
                <button
                  onClick={onGoToLogin}
                  className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs border border-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>دخول الأستاذ</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Inspector Module */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/50 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">بوابة المفتش البيداغوجي</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  مخصصة لمفتشي المقاطعات (مثل المقاطعة 07 سطيف) لمتابعة أساتذة المادة ميدانياً، إرسال التوجيهات، وإعداد تقارير التفتيش الرسمية.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>متابعة أساتذة المقاطعة المسجلين</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>توثيق زيارات التفتيش والندوات التربوية</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>توجيه الملاحظات والنقاط البيداغوجية</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6">
                <button
                  onClick={onGoToLogin}
                  className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>دخول المفتش</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Director Module */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-teal-500/50 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">بوابة مدير المدرسة الابتدائية</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تمكّن مدير المدرسة من التأشير على الكراس اليومي، الإشراف على جدول توقيت أستاذ المادة، ومتابعة الأمن والسلامة في الملاعب.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>التأشير الإلكتروني على الكراس اليومي</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>متابعة استعمال الزمن والأقسام المسندة</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>تقارير جاهزية الهياكل والوسائل الرياضية</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6">
                <button
                  onClick={onGoToLogin}
                  className="w-full py-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 font-bold text-xs border border-teal-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>دخول مدير المدرسة</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-blue-900/60 border border-emerald-500/30 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                جاهز للبدء في استخدام المنظومة البيداغوجية؟
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                قم بتسجيل الدخول بحسابك الرسمي للوصول إلى كافة الأدوات والمذكرات البيداغوجية المحدثة.
              </p>
            </div>

            <div className="relative z-10">
              <button
                onClick={onGoToLogin}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition-all transform hover:scale-105 inline-flex items-center gap-3 cursor-pointer"
              >
                <LogIn className="w-5 h-5 text-slate-950" />
                <span>تسجيل الدخول إلى حسابك الآن</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/90 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-medium text-slate-400">
            المنظومة الرقمية للتربية البدنية والرياضية للتعليم الابتدائي • SPEX Engine v2.5
          </p>
          <p className="text-[11px] text-slate-600">
            جميع الحقوق محفوظة © 2026 • وزارة التربية الوطنية - مديرية التربية لولاية سطيف
          </p>
        </div>
      </footer>
    </div>
  );
};
