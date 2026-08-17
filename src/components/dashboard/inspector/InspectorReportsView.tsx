import React, { useState } from 'react';
import { Award, Plus, FileText, Printer, CheckCircle2, User, Search, Filter, ShieldCheck, Star } from 'lucide-react';
import { InspectionVisit, User as UserType } from '../../../types/spex';

interface InspectorReportsViewProps {
  visits: InspectionVisit[];
  teachers: UserType[];
  inspector: UserType;
  onAddVisit: (visit: Partial<InspectionVisit>) => void;
}

export const InspectorReportsView: React.FC<InspectorReportsViewProps> = ({
  visits,
  teachers,
  inspector,
  onAddVisit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>('all');
  const [showAddVisitModal, setShowAddVisitModal] = useState(false);
  const [printableVisit, setPrintableVisit] = useState<InspectionVisit | null>(null);

  // Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const [visitType, setVisitType] = useState<'تفتيش تثبيت' | 'توجيهية' | 'متابعة دورية' | 'تقييمية'>('توجيهية');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [adminGrade, setAdminGrade] = useState('4.5'); // /5
  const [pedagogicalGrade, setPedagogicalGrade] = useState('8.5'); // /10
  const [safetyGrade, setSafetyGrade] = useState('4.0'); // /5
  const [positivesText, setPositivesText] = useState('التزام بدفتر اليوميات والتوزيع السنوي، تحكم بيداغوجي وتوزيع محكم للمجموعات.');
  const [improvementsText, setImprovementsText] = useState('تنويع أساليب التقييم التكويني الذاتي، وتدعيم الجانب التحفيزي.');
  const [recommendationsText, setRecommendationsText] = useState('مواصلة التطبيق الدقيق للتدرج السنوي المعتمد من المفتشية.');

  const totalScore = (parseFloat(adminGrade) || 0) + (parseFloat(pedagogicalGrade) || 0) + (parseFloat(safetyGrade) || 0);

  const filteredVisits = visits.filter((v) => {
    const teacher = teachers.find((t) => t.id === v.teacherId);
    const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : '';
    const matchesSearch =
      v.lessonObservedTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = visitTypeFilter === 'all' || v.visitType === visitTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmitVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
    if (!selectedTeacher) return;

    const newVisit: Partial<InspectionVisit> = {
      id: `visit_${Date.now()}`,
      inspectorId: inspector.id,
      teacherId: selectedTeacher.id,
      institutionId: selectedTeacher.institutionId || 'inst_1',
      visitDate,
      visitType,
      lessonObservedTitle: lessonTitle.trim() || 'حصة التربية البدنية والرياضية',
      pedagogicalGrade: totalScore,
      positivePoints: positivesText.split('،').map((s) => s.trim()).filter(Boolean),
      areasForImprovement: improvementsText.split('،').map((s) => s.trim()).filter(Boolean),
      recommendations: recommendationsText.split('،').map((s) => s.trim()).filter(Boolean),
      officialReportGenerated: true,
    };

    onAddVisit(newVisit);
    setShowAddVisitModal(false);
    setLessonTitle('');
  };

  const handlePrintReport = (visit: InspectionVisit) => {
    setPrintableVisit(visit);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6 dir-rtl animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-emerald-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-bold border border-white/20">
              <Award className="w-4 h-4 text-amber-300" />
              <span>تقارير وسجلات المعاينات التفتيشية الرسمية</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              سجل التقييم والزيارات التفتيشية المعتمدة
            </h2>
            <p className="text-xs text-emerald-100/90 max-w-2xl leading-relaxed">
              توثيق وطباعة تقارير الزيارات التفتيشية البيداغوجية الرسمية لأساتذة التربية البدنية والرياضية بالمقاطعة 07 سطيف.
            </p>
          </div>

          <button
            onClick={() => setShowAddVisitModal(true)}
            className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل تقرير زيارة تفتيشية رسمية</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم الأستاذ أو عنوان الحصة المعاينة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={visitTypeFilter}
            onChange={(e) => setVisitTypeFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="all">جميع أنواع الزيارات</option>
            <option value="تفتيش تثبيت">تفتيش تثبيت</option>
            <option value="توجيهية">زيارة توجيهية</option>
            <option value="متابعة دورية">متابعة دورية</option>
            <option value="تقييمية">زيارة تقييمية</option>
          </select>
        </div>

        {/* Visits Cards */}
        {filteredVisits.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">لا توجد زيارات مسجلة مطابقة للفرز المحدد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVisits.map((visit) => {
              const teacher = teachers.find((t) => t.id === visit.teacherId);
              const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'أستاذ المادة';

              return (
                <div
                  key={visit.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4 hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {visit.visitType}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        الأستاذ(ة): {teacherName}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold">
                        الحصة: {visit.lessonObservedTitle}
                      </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-1.5 text-center">
                      <span className="text-[9px] text-amber-700 font-bold block">العلامة الرسمية</span>
                      <span className="text-base font-black text-amber-900">
                        {visit.pedagogicalGrade || 16} / 20
                      </span>
                    </div>
                  </div>

                  {/* Summary lists */}
                  <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-2xl">
                    <div>
                      <span className="font-extrabold text-emerald-800 block text-[11px] mb-0.5">
                        ✅ النقاط الإيجابية:
                      </span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {visit.positivePoints?.join(' • ') || 'انضباط ممتاز بدفتر التحضير والتوجيهات.'}
                      </p>
                    </div>

                    <div>
                      <span className="font-extrabold text-amber-800 block text-[11px] mb-0.5">
                        📌 التوصيات البيداغوجية:
                      </span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {visit.recommendations?.join(' • ') || 'تطبيق توصيات المفتشية بانتظام.'}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>📅 تاريخ الزيارة: {visit.visitDate}</span>

                    <button
                      onClick={() => handlePrintReport(visit)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>استخراج البطاقة الرسمية</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add Visit */}
      {showAddVisitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تسجيل تقرير زيارة تفتيشية جديدة</h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    إدخال تقييم الأستاذ واستخراج بطاقة المعاينة الرسمية
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddVisitModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitVisit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">اختيار الأستاذ</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.schoolName || 'عين أزال'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">نوع الزيارة التفتيشية</label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="توجيهية">زيارة توجيهية</option>
                    <option value="تفتيش تثبيت">تفتيش تثبيت</option>
                    <option value="متابعة دورية">متابعة دورية</option>
                    <option value="تقييمية">زيارة تقييمية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">تاريخ المعاينة</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">عنوان الحصة المعاينة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الحفاظ على الجري بالسرعة والتتابع"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Breakdown Grades */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-800 text-xs flex items-center justify-between">
                  <span>📊 سلم التقييم البيداغوجي المعتمد:</span>
                  <span className="text-emerald-700 font-extrabold">
                    العلامة الإجمالية: {totalScore.toFixed(1)} / 20
                  </span>
                </h4>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      الجانب التنظيمي والإداري (/5)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="5"
                      value={adminGrade}
                      onChange={(e) => setAdminGrade(e.target.value)}
                      className="w-full text-center p-2 bg-white border border-slate-200 rounded-xl font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      الجانب البيداغوجي والتربوي (/10)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={pedagogicalGrade}
                      onChange={(e) => setPedagogicalGrade(e.target.value)}
                      className="w-full text-center p-2 bg-white border border-slate-200 rounded-xl font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      الأمن والسلامة والوسائل (/5)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="5"
                      value={safetyGrade}
                      onChange={(e) => setSafetyGrade(e.target.value)}
                      className="w-full text-center p-2 bg-white border border-slate-200 rounded-xl font-black text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Text notes */}
              <div className="space-y-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">النقاط الإيجابية والمكاسب</label>
                  <textarea
                    rows={2}
                    value={positivesText}
                    onChange={(e) => setPositivesText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">الجوانب الواجب تحسينها</label>
                  <textarea
                    rows={2}
                    value={improvementsText}
                    onChange={(e) => setImprovementsText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">التوصيات والتعليمات المباشرة</label>
                  <textarea
                    rows={2}
                    value={recommendationsText}
                    onChange={(e) => setRecommendationsText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddVisitModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md cursor-pointer"
                >
                  حفظ تقرير الزيارة الرسمية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Report View (Hidden from normal UI, visible on print) */}
      {printableVisit && (
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-50 dir-rtl text-slate-900 font-sans">
          <div className="border-4 border-slate-900 p-8 space-y-6">
            {/* Algerian Republic Header */}
            <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
              <h1 className="text-sm font-bold">الجمهورية الجزائرية الديمقراطية الشعبية</h1>
              <h2 className="text-xs font-bold">وزارة التربية الوطنية</h2>
              <h3 className="text-xs font-bold">مديرية التربية لولاية سطيف — مفتشية التعليم الابتدائي للمقاطعة 07 (عين أزال)</h3>
              <p className="text-base font-black text-emerald-950 mt-2">
                بطاقة معاينة وتقييم بيداغوجي لمادة التربية البدنية والرياضية
              </p>
            </div>

            {/* Visit Details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-bold border-b border-slate-300 pb-4">
              <div>
                <p>الأستاذ المعايَن: {teachers.find((t) => t.id === printableVisit.teacherId)?.firstName} {teachers.find((t) => t.id === printableVisit.teacherId)?.lastName}</p>
                <p>المؤسسة التعليمية: {teachers.find((t) => t.id === printableVisit.teacherId)?.schoolName || 'مدرسة إبتدائية'}</p>
                <p>نوع الزيارة: {printableVisit.visitType}</p>
              </div>
              <div>
                <p>تاريخ الزيارة: {printableVisit.visitDate}</p>
                <p>عنوان الحصة المعاينة: {printableVisit.lessonObservedTitle}</p>
                <p className="text-emerald-900 font-extrabold text-sm mt-1">العلامة النهائية: {printableVisit.pedagogicalGrade} / 20</p>
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold underline text-slate-900">1. النقاط الإيجابية والمكاسب:</h4>
                <p className="mt-1 leading-relaxed">{printableVisit.positivePoints?.join(' • ')}</p>
              </div>

              <div>
                <h4 className="font-bold underline text-slate-900">2. النقاط التوجيهية الواجب تحسينها:</h4>
                <p className="mt-1 leading-relaxed">{printableVisit.areasForImprovement?.join(' • ')}</p>
              </div>

              <div>
                <h4 className="font-bold underline text-slate-900">3. التوصيات البيداغوجية الملزمة:</h4>
                <p className="mt-1 leading-relaxed">{printableVisit.recommendations?.join(' • ')}</p>
              </div>
            </div>

            {/* Signatures & Seal */}
            <div className="flex justify-between items-end pt-12 border-t border-slate-300 text-xs font-bold">
              <div className="text-center">
                <p>توقيع الأستاذ المعني</p>
                <p className="text-[10px] text-slate-400 mt-8">(اطلعتُ على التوجيهات)</p>
              </div>

              <div className="text-center">
                <p>ختم وتوقيع مفتش التربية والتعليم الابتدائي</p>
                <p className="text-emerald-900 font-extrabold mt-1">المفتش: {inspector.firstName} {inspector.lastName}</p>
                <div className="w-24 h-24 rounded-full border-2 border-emerald-800 text-emerald-900 text-[9px] font-black flex items-center justify-center mx-auto mt-2 border-dashed">
                  ختم المفتشية الرسمية
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
