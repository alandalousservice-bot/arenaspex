import React, { useState } from 'react';
import { DistrictBroadcast, InspectorNote, User } from '../../../types/spex';

interface InspectorBroadcastsViewProps {
  broadcasts: DistrictBroadcast[];
  inspector: User;
  onAddBroadcast: (broadcast: Partial<DistrictBroadcast>) => void;
  teacherContext?: User | null;
  onAddNote?: (note: Partial<InspectorNote>) => void | Promise<boolean | void>;
  onNoteSaved?: (teacherId: string) => void | Promise<void>;
  onClearTeacherContext?: () => void;
}

export const InspectorBroadcastsView: React.FC<InspectorBroadcastsViewProps> = ({
  teacherContext = null,
  onAddNote,
  onNoteSaved,
  onClearTeacherContext,
}) => {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaved, setNoteSaved] = useState<'idle' | 'success' | 'refresh-error' | 'save-error'>(
    'idle'
  );
  const handleTeacherNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherContext || !onAddNote || !noteTitle.trim() || !noteContent.trim()) return;
    setNoteSaved('idle');
    const saved = await onAddNote({
      id: `note_${Date.now()}`,
      teacherId: teacherContext.id,
      teacherName: `${teacherContext.firstName} ${teacherContext.lastName}`.trim(),
      title: noteTitle.trim(),
      content: noteContent.trim(),
      moduleRef: 'general',
      priority: 'عادية',
      status: 'جديدة',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (saved === false) {
      setNoteSaved('save-error');
      return;
    }
    try {
      await onNoteSaved?.(teacherContext.id);
      setNoteTitle('');
      setNoteContent('');
      setNoteSaved('success');
    } catch {
      setNoteSaved('refresh-error');
      setNoteTitle('');
      setNoteContent('');
    }
  };

  if (teacherContext) {
    return (
      <div className="space-y-6 dir-rtl animate-in fade-in duration-200">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-md border border-emerald-700/50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-emerald-200">توجيه خاص بالأستاذ</span>
              <h2 className="mt-2 text-xl font-black">
                {teacherContext.firstName} {teacherContext.lastName}
              </h2>
              <p className="mt-1 text-xs text-emerald-100/80">
                المؤسسة: {teacherContext.schoolName || 'غير محددة'}
              </p>
            </div>
            <button
              onClick={onClearTeacherContext}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
            >
              إلغاء تحديد الأستاذ
            </button>
          </div>
        </div>
        <form
          onSubmit={handleTeacherNote}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
        >
          <h3 className="text-sm font-black text-slate-900">إضافة توجيه أو ملاحظة</h3>
          <input
            value={noteTitle}
            onChange={(event) => setNoteTitle(event.target.value)}
            placeholder="العنوان / الموضوع"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
            required
          />
          <textarea
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            placeholder="نص التوجيه أو الملاحظة"
            rows={6}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
            required
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${noteSaved === 'refresh-error' || noteSaved === 'save-error' ? 'text-rose-700' : 'text-emerald-700'}`}
            >
              {noteSaved === 'success'
                ? 'تم حفظ التوجيه بنجاح.'
                : noteSaved === 'refresh-error'
                  ? 'تم حفظ التوجيه، وتعذر تحديث العرض فوراً.'
                  : noteSaved === 'save-error'
                    ? 'تعذر حفظ التوجيه.'
                    : 'سيُحفظ التوجيه كسجل InspectorNote خاص بهذا الأستاذ.'}
            </span>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              حفظ التوجيه
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
      <h2 className="font-bold">البث الجماعي غير متاح حاليًا</h2>
      <p className="mt-2 text-sm">النشر من الواجهة القديمة معطّل؛ لا يتم إرسال منشورات إلى أساتذة المقاطعة عبرها.</p>
    </section>
  );
};