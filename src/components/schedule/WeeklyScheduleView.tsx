/**
 * SPEX - Weekly Schedule & PE Timetable View
 * التوزيع الأسبوعي واستعمال الزمن الرسمي لحصص التربية البدنية والرياضية بالأركان والأنصبة
 */

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  MapPin,
  Users,
  Layers,
  BookMarked,
  CheckCircle2,
  AlertCircle,
  Settings,
  Edit2
} from 'lucide-react';
import { WeeklyScheduleSlot, ClassRoom, PEField } from '../../types/spex';
import { PE_FIELDS } from '../../data/algerianCurriculum';

interface WeeklyScheduleViewProps {
  scheduleSlots: WeeklyScheduleSlot[];
  teacherClasses: ClassRoom[];
  onAddSlot: (slot: Omit<WeeklyScheduleSlot, 'id'>) => void;
  onDeleteSlot: (slotId: string) => void;
  teacherName?: string;
  schoolName?: string;
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const;

// Default Working Hours from 08:00 to 17:00
const DEFAULT_TIME_SLOTS = [
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00'
];

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  scheduleSlots,
  teacherClasses,
  onAddSlot,
  onDeleteSlot,
  teacherName = 'أ. علي بن زايد',
  schoolName = 'مدرسة الشهيد بالخيري عبد القادر'
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageTimeModalOpen, setIsManageTimeModalOpen] = useState(false);

  // Dynamic state for customizable time slots (08:00 to 17:00 and editable)
  const [timeSlots, setTimeSlots] = useState<string[]>(() => {
    const saved = localStorage.getItem('spex_weekly_time_slots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_TIME_SLOTS;
  });

  const [newCustomSlotInput, setNewCustomSlotInput] = useState('');

  // Save time slots to localStorage
  const saveTimeSlots = (slots: string[]) => {
    setTimeSlots(slots);
    localStorage.setItem('spex_weekly_time_slots', JSON.stringify(slots));
  };

  const handleAddTimeSlot = () => {
    if (!newCustomSlotInput.trim()) return;
    if (timeSlots.includes(newCustomSlotInput.trim())) return;
    const updated = [...timeSlots, newCustomSlotInput.trim()];
    saveTimeSlots(updated);
    setNewCustomSlotInput('');
  };

  const handleDeleteTimeSlot = (slotToDelete: string) => {
    if (timeSlots.length <= 1) {
      alert('يجب الإبقاء على فترة زمنية واحدة على الأقل في التوزيع.');
      return;
    }
    const updated = timeSlots.filter((s) => s !== slotToDelete);
    saveTimeSlots(updated);
  };

  const handleResetTimeSlots = () => {
    saveTimeSlots(DEFAULT_TIME_SLOTS);
  };

  // New slot form state
  const [day, setDay] = useState<typeof DAYS[number]>('الأحد');
  const [timeSlot, setTimeSlot] = useState<string>(timeSlots[0] || '08:00 - 09:00');
  const [classId, setClassId] = useState<string>(teacherClasses[0]?.id || 'cls_1');
  const [fieldId, setFieldId] = useState<string>(PE_FIELDS[0]?.id || 'field_physical');
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [venue, setVenue] = useState<string>('ساحة الرياضة الرئيسية');

  const filteredSlots = scheduleSlots.filter((slot) => {
    if (selectedClassFilter !== 'all' && slot.classId !== selectedClassFilter) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSaveNewSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const classObj = teacherClasses.find((c) => c.id === classId) || teacherClasses[0];
    const fieldObj = PE_FIELDS.find((f) => f.id === fieldId) || PE_FIELDS[0];

    onAddSlot({
      teacherId: 'usr_teacher_1',
      day,
      timeSlot,
      classId: classObj?.id || 'cls_1',
      className: classObj?.name || '1 إبتدائي أ',
      fieldId: fieldObj?.id || 'field_physical',
      fieldName: fieldObj?.name || 'الميدان البدني',
      sessionTitle: sessionTitle.trim() || `حصة ${fieldObj?.name.split(':')[0]}`,
      venue: venue || 'ساحة المدرسة'
    });

    setIsAddModalOpen(false);
    setSessionTitle('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Print Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-none print:shadow-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              التنظيم والتوقيت الأسبوعي
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              الحجم الساعي: {filteredSlots.length} ساعة/أسبوعياً
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>التوزيع الأسبوعي للحصص واشغال استعمال الزمن</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            جدول توزِيع حصص التربية البدنية والرياضية حسب الأيام، الفترات الزمنية، والأقسام المسندة للأستاذ
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Class Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200 text-xs font-bold">
            <Users className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="all">جميع الأقسام المسندة</option>
              {teacherClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsManageTimeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs border border-slate-200 transition-all cursor-pointer"
            title="تخصيص وتعديل أوقات وساعات العمل (من 08:00 إلى 17:00)"
          >
            <Settings className="w-4 h-4 text-blue-600" />
            <span>تعديل أوقات العمل (08:00 - 17:00)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حصة للجدول</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة استعمال الزمن</span>
          </button>
        </div>
      </div>

      {/* Official Timetable Printable Grid Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        {/* Header Document Metadata */}
        <div className="border-b border-slate-200 pb-4 text-center space-y-1">
          <h3 className="text-sm font-extrabold text-slate-900">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
          <h4 className="text-xs font-bold text-slate-700">وزارة التربية الوطنية - مديرية التربية لولاية سطيف (المقاطعة 07)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold bg-slate-50 p-3 rounded-2xl border border-slate-200 mt-2 text-right">
            <div><span className="text-slate-500">المؤسسة:</span> <strong className="text-slate-900">{schoolName}</strong></div>
            <div><span className="text-slate-500">الأستاذ:</span> <strong className="text-slate-900">{teacherName}</strong></div>
            <div><span className="text-slate-500">السنة الدراسية:</span> <strong className="text-slate-900">2025 / 2026</strong></div>
            <div><span className="text-slate-500">نطاق التوقيت:</span> <strong className="text-blue-900">من 08:00 صباحاً إلى 17:00 مساءً</strong></div>
          </div>
        </div>

        {/* Weekly Timetable Grid Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-extrabold">
                <th className="p-3 border border-slate-800 text-center w-28">اليوم / التوقيت</th>
                {timeSlots.map((slot) => (
                  <th key={slot} className="p-3 border border-slate-800 text-center text-[11px] font-extrabold dir-ltr whitespace-nowrap">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((dayName) => (
                <tr key={dayName} className="hover:bg-slate-50/80 transition-colors">
                  {/* Day Label Header Column */}
                  <td className="p-3 border border-slate-200 bg-slate-100 font-black text-xs text-slate-900 text-center whitespace-nowrap">
                    {dayName}
                  </td>

                  {/* Time Slots Cells */}
                  {timeSlots.map((ts) => {
                    const matchedSlots = filteredSlots.filter(
                      (s) => s.day === dayName && s.timeSlot === ts
                    );

                    return (
                      <td key={ts} className="p-2 border border-slate-200 text-xs align-top h-24 min-w-[110px]">
                        {matchedSlots.length > 0 ? (
                          matchedSlots.map((item) => (
                            <div
                              key={item.id}
                              className="bg-blue-50/90 border border-blue-200 p-2 rounded-xl text-xs space-y-1 relative group hover:bg-blue-100 transition-all shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-blue-950 text-xs">{item.className}</span>
                                <button
                                  onClick={() => onDeleteSlot(item.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-rose-600 hover:bg-rose-100 rounded transition-all cursor-pointer print:hidden"
                                  title="حذف من التوزيع"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <p className="font-bold text-slate-800 text-[11px] leading-snug line-clamp-2">
                                {item.sessionTitle || item.fieldName}
                              </p>

                              <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{item.venue || 'الساحة'}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] text-slate-300 font-medium italic">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Notes & Signatures for Official Inspection Document */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs font-bold text-slate-700">
          <div>
            <p className="text-slate-500 mb-6">توقيع وإمضاء الأستاذ:</p>
            <p className="text-slate-900 font-extrabold">{teacherName}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-6">مصادقة وتوقيع مدير المدرسة:</p>
            <p className="text-slate-900 font-extrabold">الختم والإمضاء</p>
          </div>
          <div>
            <p className="text-slate-500 mb-6">تأشيرة مفتش المادة:</p>
            <p className="text-blue-900 font-extrabold">المفتش: عبد الرحمن سطيفي</p>
          </div>
        </div>
      </div>

      {/* Add Slot Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>إضافة حصة لجدول استعمال الزمن</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewSlot} className="space-y-3 text-xs font-bold">
              {/* Day Selection */}
              <div>
                <label className="block text-slate-700 mb-1">اليوم:</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value as typeof DAYS[number])}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Time Slot Selection */}
              <div>
                <label className="block text-slate-700 mb-1">الفترة الزمنية (التوقيت):</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none"
                >
                  {timeSlots.map((ts) => (
                    <option key={ts} value={ts}>{ts}</option>
                  ))}
                </select>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-slate-700 mb-1">القسم المسند:</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none"
                >
                  {teacherClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              {/* PE Field Selection */}
              <div>
                <label className="block text-slate-700 mb-1">الميدان التعليمي:</label>
                <select
                  value={fieldId}
                  onChange={(e) => setFieldId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none"
                >
                  {PE_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Session Title */}
              <div>
                <label className="block text-slate-700 mb-1">عنوان الحصة (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: حصة الألعاب الجماعية والتوافق الحركي"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              {/* Venue / Field Location */}
              <div>
                <label className="block text-slate-700 mb-1">مكان التنفيذ / الفضاء الرياضي:</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  حفظ الحصة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Working Hours & Time Slots Modal */}
      {isManageTimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <span>تعديل وتخصيص ساعات العمل (08:00 - 17:00)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يمكن للأستاذ تعديل الفترات الزمنية وإضافة أو حذف الساعات حسب برنامج عمله الخاص
                </p>
              </div>
              <button
                onClick={() => setIsManageTimeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Time Slots List */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">الفترات الزمنية المعتمدة حالياً في التوزيع:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {timeSlots.map((slot) => (
                  <div
                    key={slot}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-extrabold text-slate-800"
                  >
                    <span className="dir-ltr">{slot}</span>
                    <button
                      onClick={() => handleDeleteTimeSlot(slot)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف هذه الفترة الزمنية"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Custom Time Slot */}
            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 space-y-2 text-xs font-bold">
              <label className="block text-blue-950">إضافة فترة زمنية مخصصة (مثال: 08:30 - 09:30):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="08:30 - 09:30"
                  value={newCustomSlotInput}
                  onChange={(e) => setNewCustomSlotInput(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl bg-white border border-blue-200 outline-none dir-ltr font-bold text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddTimeSlot}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer whitespace-nowrap"
                >
                  + إضافة
                </button>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleResetTimeSlots}
                className="text-slate-500 hover:text-blue-600 font-bold underline cursor-pointer"
              >
                إعادة ضبط التوقيت الافتراضي (08:00 - 17:00)
              </button>

              <button
                type="button"
                onClick={() => setIsManageTimeModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-extrabold cursor-pointer hover:bg-slate-800"
              >
                إغلاق وتطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
