/**
 * SPEX - Daily Notebook View Component
 * الكراس اليومي الإلكتروني للأستاذ: المتابعة الفورية، حالة التنفيذ، وتوليد المذكرات
 */

import React, { useState } from 'react';
import { BookMarked, Clock, FileText, Sparkles, Calendar, Filter, ArrowUpDown, Trash2 } from 'lucide-react';
import { DailyNotebookEntry, LessonPlan } from '../../types/spex';
import { SAMPLE_PE_SESSIONS, PE_FIELDS } from '../../data/algerianCurriculum';

type SessionRefType = { id?: string; sessionTitle?: string; fieldName?: string; levelName?: string };

interface DailyNotebookViewProps {
  notebookEntries: DailyNotebookEntry[];
  lessonPlans: LessonPlan[];
  onUpdateStatus: (entryId: string, status: 'منجزة' | 'مؤجلة' | 'غير منجزة', note?: string) => void;
  onOpenLessonPlan: (lessonId?: string, sessionRef?: SessionRefType) => void;
  onOpenAIGeneratorForSession: (sessionRef: SessionRefType) => void;
  onDeleteEntry?: (entryId: string) => void;
}

export const DailyNotebookView: React.FC<DailyNotebookViewProps> = ({
  notebookEntries,
  lessonPlans: _lessonPlans,
  onUpdateStatus,
  onOpenLessonPlan,
  onOpenAIGeneratorForSession,
  onDeleteEntry
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'sequence'>('date');

  const handleDeleteEntry = (entryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذه الحصة من الكراس اليومي؟ لا يمكن التراجع عن هذا الإجراء.')) {
      onDeleteEntry?.(entryId);
    }
  };

  // Filter and Sort Entries
  const filteredEntries = notebookEntries.filter((e) => {
    // Filter status
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    
    // Filter level/class
    if (selectedLevel !== 'all' && !e.className.includes(selectedLevel)) return false;

    // Filter field
    const sessionObj = SAMPLE_PE_SESSIONS.find((s) => s.id === e.sessionId) || SAMPLE_PE_SESSIONS[0];
    if (selectedField !== 'all' && sessionObj.fieldId !== selectedField) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      // Sort by execution date and time
      const dateComparison = a.executionDate.localeCompare(b.executionDate);
      if (dateComparison !== 0) return dateComparison;
      return a.timeSlot.localeCompare(b.timeSlot);
    } else {
      // Sort by annual distribution session number sequence
      const sessionA = SAMPLE_PE_SESSIONS.find((s) => s.id === a.sessionId);
      const sessionB = SAMPLE_PE_SESSIONS.find((s) => s.id === b.sessionId);
      return (sessionA?.sessionNumber || 0) - (sessionB?.sessionNumber || 0);
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              الوثائق التنفيذية الرسمية
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-blue-600" />
              <span>الكراس اليومي الإلكتروني لحصص التربية البدنية والرياضية</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ترتيب الحصص وفق التوزيع السنوي الرسمي والمقاطع التعليمية والميدان والمستوى وتوقيت الحصة وتاريخها
            </p>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              الكل ({notebookEntries.length})
            </button>
            <button
              onClick={() => setFilterStatus('منجزة')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterStatus === 'منجزة' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              منجزة
            </button>
            <button
              onClick={() => setFilterStatus('مؤجلة')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterStatus === 'مؤجلة' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              مؤجلة
            </button>
          </div>
        </div>

        {/* Detailed Filtering & Sorting Controls (الميدان، السنة/المستوى، الترتيب حسب التوزيع أو التاريخ) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Level Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-700 shrink-0">المستوى / السنة:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-transparent font-bold text-slate-900 outline-none w-full cursor-pointer"
            >
              <option value="all">جميع السنوات (س1 - س5)</option>
              <option value="1">السنة 1 ابتدائي</option>
              <option value="2">السنة 2 ابتدائي</option>
              <option value="3">السنة 3 ابتدائي</option>
              <option value="4">السنة 4 ابتدائي</option>
              <option value="5">السنة 5 ابتدائي</option>
            </select>
          </div>

          {/* Field / Domain Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-700 shrink-0">الميدان التعليمي:</span>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="bg-transparent font-bold text-slate-900 outline-none w-full cursor-pointer"
            >
              <option value="all">جميع الميادين الثلاثة</option>
              {PE_FIELDS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
            <ArrowUpDown className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-700 shrink-0">ترتيب الحصص:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'sequence')}
              className="bg-transparent font-extrabold text-blue-900 outline-none w-full cursor-pointer"
            >
              <option value="date">حسب تاريخ وتوقيت الحصة 📅</option>
              <option value="sequence">حسب تسلسل التوزيع السنوي (حصة 1 - 10) 📊</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-extrabold text-slate-700">لا توجد حصص مسجلة في الكراس اليومي بهذا التصفية</p>
            <p className="text-xs text-slate-500">قم بتوليد الحصص تلقائياً من المخطط والتوزيع السنوي لكل مستوى من القائمة الرئيسية.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const sessionObj = SAMPLE_PE_SESSIONS.find((s) => s.id === entry.sessionId) || SAMPLE_PE_SESSIONS[0];
            const fieldObj = PE_FIELDS.find((f) => f.id === sessionObj.fieldId) || PE_FIELDS[0];
            const hasLessonPlan = Boolean(entry.lessonPlanId);

            return (
              <div
                key={entry.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                {/* Header Metadata Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-100 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>{entry.executionDate}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{entry.timeSlot}</span>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-800 font-extrabold">
                      القسم: {entry.className}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 font-extrabold border border-teal-100">
                      {fieldObj.name.split(':')[0]}
                    </span>
                  </div>

                  {/* Execution Status Controls */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
                    <button
                      onClick={() => onUpdateStatus(entry.id, 'منجزة')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        entry.status === 'منجزة' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      منجزة
                    </button>
                    <button
                      onClick={() => onUpdateStatus(entry.id, 'مؤجلة')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        entry.status === 'مؤجلة' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      مؤجلة
                    </button>
                    <button
                      onClick={() => onUpdateStatus(entry.id, 'غير منجزة')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        entry.status === 'غير منجزة' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      غير منجزة
                    </button>
                  </div>
                </div>

                {/* Lesson Session Body */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-200">
                        {sessionObj.type} - حصة 0{sessionObj.sessionNumber || 1}
                      </span>
                      <h3 className="text-base font-black text-slate-900">{sessionObj.title}</h3>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <strong className="text-blue-900 block mb-0.5">الهدف الإجرائي المسطر للمقطع التعليمي:</strong>
                      {sessionObj.targetObjective}
                    </p>

                    {entry.note && (
                      <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200/80 italic">
                        <strong>ملاحظة الأستاذ:</strong> {entry.note}
                      </div>
                    )}
                  </div>

                  {/* AI Generator & Lesson View Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-center">
                    <button
                      onClick={() => onOpenAIGeneratorForSession(sessionObj)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                      <span>توليد المذكرة البيداغوجية ✨</span>
                    </button>

                    <button
                      onClick={() => onOpenLessonPlan(entry.lessonPlanId, sessionObj)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>{hasLessonPlan ? 'عرض المذكرة' : 'إنشاء مذكرة'}</span>
                    </button>

                    {onDeleteEntry && (
                      <button
                        onClick={(e) => handleDeleteEntry(entry.id, e)}
                        title="حذف هذه الحصة من الكراس اليومي"
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-xs transition-all cursor-pointer border border-rose-200/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

