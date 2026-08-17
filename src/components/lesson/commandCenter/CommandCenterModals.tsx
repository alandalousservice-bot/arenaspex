import React from 'react';
import { X, Settings, CheckCircle2, Volume2, AlertTriangle } from 'lucide-react';
import { LessonSessionTiming, LessonExecutionLog } from '../../../types/spex';

interface CommandCenterModalsProps {
  showSettingsModal: boolean;
  onCloseSettingsModal: () => void;
  timingSettings: LessonSessionTiming;
  onUpdateTimingSettings: (settings: LessonSessionTiming) => void;
  showSummaryModal: boolean;
  onCloseSummaryModal: () => void;
  lastExecutionLog: LessonExecutionLog | null;
}

export const CommandCenterModals: React.FC<CommandCenterModalsProps> = ({
  showSettingsModal,
  onCloseSettingsModal,
  timingSettings,
  onUpdateTimingSettings,
  showSummaryModal,
  onCloseSummaryModal,
  lastExecutionLog,
}) => {
  return (
    <>
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <span>إعدادات التوقيت والتنبيهات الميدانية</span>
              </h3>
              <button onClick={onCloseSettingsModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <span className="font-bold text-slate-700 block mb-0.5">إجمالي زمن الحصة الأصلي:</span>
                <span className="text-sm font-black text-emerald-700">
                  {(timingSettings.preparationMinutes || 10) +
                    (timingSettings.situation1Minutes || 20) +
                    (timingSettings.situation2Minutes || 20) +
                    (timingSettings.finalMinutes || 10)}{' '}
                  دقيقة
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">التحضيرية (د):</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={timingSettings.preparationMinutes || 10}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        preparationMinutes: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">الوضعية 1 (د):</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={timingSettings.situation1Minutes || 20}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        situation1Minutes: parseInt(e.target.value) || 20,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">الوضعية 2 (د):</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={timingSettings.situation2Minutes || 20}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        situation2Minutes: parseInt(e.target.value) || 20,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">الختامية (د):</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={timingSettings.finalMinutes || 10}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        finalMinutes: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={timingSettings.soundEnabled}
                    onChange={(e) =>
                      onUpdateTimingSettings({ ...timingSettings, soundEnabled: e.target.checked })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>تفعيل المؤثرات الصوتية وزبرة الصفارة</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={timingSettings.vibrationEnabled}
                    onChange={(e) =>
                      onUpdateTimingSettings({ ...timingSettings, vibrationEnabled: e.target.checked })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>تفعيل اهتزاز الهاتف عند تغيير المراحل</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={timingSettings.voiceAnnouncements}
                    onChange={(e) =>
                      onUpdateTimingSettings({ ...timingSettings, voiceAnnouncements: e.target.checked })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>الإعلان الصوتي بالعربية عند تغيير المراحل</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onCloseSettingsModal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>ملخص تنفيذ الحصة البيداغوجية</span>
              </h3>
              <button onClick={onCloseSummaryModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-emerald-50 text-emerald-950 rounded-2xl border border-emerald-200/80 space-y-1">
                <span className="font-extrabold block text-sm">تم إنهاء الحصة الميدانية بنجاح!</span>
                <p className="text-emerald-800">
                  تم توثيق الحصة تلقائياً وإضافتها لدفتر اليوميات التربوي للمؤسسة.
                </p>
              </div>

              {lastExecutionLog && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">القسم:</span>
                    <span className="font-extrabold text-slate-900">{lastExecutionLog.className}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">عنوان الحصة:</span>
                    <span className="font-extrabold text-slate-900">{lastExecutionLog.lessonPlanTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">زمن التنفيذ الفعلي:</span>
                    <span className="font-black text-emerald-700">{lastExecutionLog.totalDurationMinutes} دقيقة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">حالة الالتزام الزمني:</span>
                    <span className="font-black text-slate-800">{lastExecutionLog.completionStatus}</span>
                  </div>

                  {lastExecutionLog.attendanceData && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">نسبة الحضور:</span>
                      <span className="font-black text-slate-800">
                        {lastExecutionLog.attendanceData.present} / {lastExecutionLog.attendanceData.total}
                      </span>
                    </div>
                  )}

                  {lastExecutionLog.overruns && lastExecutionLog.overruns.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 space-y-1">
                      <span className="flex items-center gap-1.5 font-black text-rose-700 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> التجاوزات الزمنية المسجلة:
                      </span>
                      {lastExecutionLog.overruns.map((o, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-rose-800">{o.phase}</span>
                          <span className="font-black text-rose-700">+{o.minutes} دقيقة</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {lastExecutionLog.paceAnalysis && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                      <span className="font-black text-emerald-800 text-[11px] block mb-1">تحليل الإيقاع الذكي:</span>
                      <p className="text-emerald-900 leading-relaxed whitespace-pre-line">{lastExecutionLog.paceAnalysis}</p>
                    </div>
                  )}

                  {lastExecutionLog.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      <span className="font-black text-amber-800 text-[11px] block mb-1">ملاحظات المعلم:</span>
                      <p className="text-amber-900 leading-relaxed">{lastExecutionLog.notes}</p>
                    </div>
                  )}

                  {lastExecutionLog.studentRatings && Object.keys(lastExecutionLog.studentRatings).length > 0 && (
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5">
                      <span className="font-black text-sky-800 text-[11px] block mb-1">
                        تقييم التلاميذ المميزين: {Object.keys(lastExecutionLog.studentRatings).length} تلميذاً
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onCloseSummaryModal}
                className="px-6 py-2.5 bg-slate-900 text-white font-extrabold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
