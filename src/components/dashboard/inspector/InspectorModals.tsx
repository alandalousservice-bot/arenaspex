import React, { useState } from 'react';
import { X, Award, Send, Megaphone } from 'lucide-react';
import { User, LessonPlan, InspectionVisit, InspectorNote } from '../../../types/spex';

interface InspectorModalsProps {
  selectedLessonPlanModal: LessonPlan | null;
  onCloseLessonPlanModal: () => void;
  showNoteModal: boolean;
  onCloseNoteModal: () => void;
  selectedTeacher: User;
  onAddNote: (note: InspectorNote) => void;
  showVisitModal: boolean;
  onCloseVisitModal: () => void;
  onAddVisit: (visit: InspectionVisit) => void;
  showBroadcastModal: boolean;
  onCloseBroadcastModal: () => void;
  onSendBroadcast: (title: string, content: string) => void;
}

export const InspectorModals: React.FC<InspectorModalsProps> = ({
  selectedLessonPlanModal,
  onCloseLessonPlanModal,
  showNoteModal,
  onCloseNoteModal,
  selectedTeacher,
  onAddNote,
  showVisitModal,
  onCloseVisitModal,
  onAddVisit,
  showBroadcastModal,
  onCloseBroadcastModal,
  onSendBroadcast,
}) => {
  // New Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notePriority, setNotePriority] = useState<'عادية' | 'هام' | 'مستعجل'>('عادية');

  // New Visit State
  const [visitType, setVisitType] = useState<'تفتيش تثبيت' | 'توجيهية' | 'متابعة دورية' | 'تقييمية'>('توجيهية');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [pedagogicalGrade, setPedagogicalGrade] = useState('16.5');
  const [positivesStr, setPositivesStr] = useState('التزام بدفتر اليوميات والتنظيم، التحكم الجيد في الفضاء والوقت.');
  const [improvementsStr, setImprovementsStr] = useState('تنويع وضعيات التقييم الذاتي، تعزيز مبادئ الروح الرياضية.');

  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState('توجيه بيداغوجي عام للمقاطعة 07');
  const [broadcastContent, setBroadcastContent] = useState('');

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    onAddNote({
      id: `note_${Date.now()}`,
      inspectorId: 'insp_1',
      inspectorName: 'أحمد المفتش',
      moduleRef: 'general',
      status: 'جديدة',
      teacherId: selectedTeacher.id,
      teacherName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      priority: notePriority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNoteTitle('');
    setNoteContent('');
    onCloseNoteModal();
  };

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    onAddVisit({
      id: `v_${Date.now()}`,
      inspectorId: 'insp_1',
      institutionId: selectedTeacher.institutionId || 'inst_1',
      teacherId: selectedTeacher.id,
      visitDate,
      visitType,
      lessonObservedTitle: lessonTitle.trim(),
      pedagogicalGrade: parseFloat(pedagogicalGrade) || 16,
      positivePoints: positivesStr.split('،').map((s) => s.trim()).filter(Boolean),
      areasForImprovement: improvementsStr.split('،').map((s) => s.trim()).filter(Boolean),
      recommendations: ['مواصلة الاجتهاد والتطبيق الدقيق للتدرج الوزاري المعتمد.'],
      officialReportGenerated: true,
    });
    setLessonTitle('');
    onCloseVisitModal();
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastContent.trim()) return;
    onSendBroadcast(broadcastTitle, broadcastContent.trim());
    setBroadcastContent('');
    onCloseBroadcastModal();
  };

  return (
    <>
      {/* Lesson Plan Viewer Modal */}
      {selectedLessonPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {selectedLessonPlanModal.levelName || selectedLessonPlanModal.className}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {selectedLessonPlanModal.sessionTitle}
                </h3>
              </div>
              <button
                onClick={onCloseLessonPlanModal}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500 block text-[10px]">الهدف التعلمي للحصة:</span>
                <p className="font-bold text-slate-900">{selectedLessonPlanModal.generalObjective}</p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                  <span className="font-extrabold text-amber-900 block mb-1">1. المرحلة التمهيدية / الإحماء (10 دقائق):</span>
                  <p className="text-slate-800 leading-relaxed">
                    {selectedLessonPlanModal.warmupPhase?.generalWarmup ||
                      selectedLessonPlanModal.warmupPhase?.pedagogicalWarmupGame?.title ||
                      'الإحماء العام والخاص'}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <span className="font-extrabold text-blue-900 block mb-1">2. المرحلة الرئيسية / التعلم والتطبيق (25 دقيقة):</span>
                  <p className="text-slate-800 leading-relaxed">
                    {selectedLessonPlanModal.mainPhase?.learningSituation1?.description ||
                      selectedLessonPlanModal.mainPhase?.problemSituation ||
                      'الوضعيات التعلمية الميدانية'}
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="font-extrabold text-emerald-900 block mb-1">3. المرحلة الختامية / التهدئة والتقويم (10 دقائق):</span>
                  <p className="text-slate-800 leading-relaxed">
                    {selectedLessonPlanModal.coolDownPhase?.assessmentAndDialogue ||
                      selectedLessonPlanModal.coolDownPhase?.activities ||
                      'التهدئة والتقويم الختامي'}
                  </p>
                </div>
              </div>

              {selectedLessonPlanModal.evaluation && (
                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                  <span className="font-bold text-emerald-400 block mb-1">معايير التقييم والملاحظة البيداغوجية:</span>
                  <p className="text-slate-200">{selectedLessonPlanModal.evaluation}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={onCloseLessonPlanModal}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                إرسال توجيه بيداغوجي للأستاذ: {selectedTeacher.firstName} {selectedTeacher.lastName}
              </h3>
              <button onClick={onCloseNoteModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNoteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان التوجيه:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: التقييم البيداغوجي للميدان الأول..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">درجة الأهمية:</label>
                <select
                  value={notePriority}
                  onChange={(e) => setNotePriority(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="منخفضة">منخفضة</option>
                  <option value="متوسطة">متوسطة</option>
                  <option value="عالية">عالية / عاجل</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">نص التوجيه أو الملاحظة الرسمية:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب التوجيه البيداغوجي بالتفصيل..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال التوجيه</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseNoteModal}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Inspection Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>تسجيل زيارة تفقدية وتقييم تربوي للأستاذ: {selectedTeacher.firstName} {selectedTeacher.lastName}</span>
              </h3>
              <button onClick={onCloseVisitModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVisitSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع الزيارة:</label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="تفتيشية">تفتيشية رسمية</option>
                    <option value="توجيهية">توجيهية بيداغوجية</option>
                    <option value="استثنائية">استثنائية</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ الزيارة:</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان الحصة الملاحظة:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: التحكم في التوازن والجري السريع (سنة 1 ابتدائي)"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">النقطة التربوية (من 20):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  required
                  value={pedagogicalGrade}
                  onChange={(e) => setPedagogicalGrade(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">نقاط القوة والإيجابيات (مفصولة بفواصل):</label>
                <input
                  type="text"
                  value={positivesStr}
                  onChange={(e) => setPositivesStr(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">التوجيهات ونقاط التحسين (مفصولة بفواصل):</label>
                <input
                  type="text"
                  value={improvementsStr}
                  onChange={(e) => setImprovementsStr(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  <span>اعتماد وحفظ التقريـر</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseVisitModal}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <span>إرسال بث جماعي لجميع أساتذة المقاطعة</span>
              </h3>
              <button onClick={onCloseBroadcastModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان البث الجماعي:</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">محتوى التوجيه العام:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب التوجيه الرسمي العام الذي سيصل لجميع أساتذة المقاطعة..."
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>إرسال للجميع الآن</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseBroadcastModal}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
