import React, { useState } from 'react';
import { Megaphone, Plus, Calendar, ShieldCheck, Users, Send, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { DistrictBroadcast, InspectorNote, User } from '../../../types/spex';

interface InspectorBroadcastsViewProps {
  broadcasts: DistrictBroadcast[];
  inspector: User;
  onAddBroadcast: (broadcast: Partial<DistrictBroadcast>) => void;
  teacherContext?: User | null;
  onAddNote?: (note: Partial<InspectorNote>) => void;
  onClearTeacherContext?: () => void;
}

export const InspectorBroadcastsView: React.FC<InspectorBroadcastsViewProps> = ({
  broadcasts,
  inspector,
  onAddBroadcast,
  teacherContext = null,
  onAddNote,
  onClearTeacherContext,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'دعوة_اجتماع' | 'توجيه_بيداغوجي' | 'إشعار_مستعجل' | 'ندوة_تكوينية'>('توجيه_بيداغوجي');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onAddBroadcast({
      id: `bc_${Date.now()}`,
      inspectorId: inspector.id,
      inspectorName: `${inspector.firstName} ${inspector.lastName}`,
      districtId: inspector.districtId || '',
      title: title.trim(),
      content: content.trim(),
      category,
      createdAt: new Date().toISOString(),
    });

    setTitle('');
    setContent('');
    setShowModal(false);
  };

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const handleTeacherNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherContext || !onAddNote || !noteTitle.trim() || !noteContent.trim()) return;
    onAddNote({
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
    setNoteTitle('');
    setNoteContent('');
    setNoteSaved(true);
  };

  if (teacherContext) {
    return <div className="space-y-6 dir-rtl animate-in fade-in duration-200">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-md border border-emerald-700/50">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold text-emerald-200">توجيه خاص بالأستاذ</span><h2 className="mt-2 text-xl font-black">{teacherContext.firstName} {teacherContext.lastName}</h2><p className="mt-1 text-xs text-emerald-100/80">المؤسسة: {teacherContext.schoolName || 'غير محددة'}</p></div><button onClick={onClearTeacherContext} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20">إلغاء تحديد الأستاذ</button></div>
      </div>
      <form onSubmit={handleTeacherNote} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900">إضافة توجيه أو ملاحظة</h3>
        <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="العنوان / الموضوع" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500" required />
        <textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="نص التوجيه أو الملاحظة" rows={6} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500" required />
        <div className="flex items-center justify-between"><span className="text-xs text-emerald-700">{noteSaved ? 'تم حفظ التوجيه بنجاح.' : 'سيُحفظ التوجيه كسجل InspectorNote خاص بهذا الأستاذ.'}</span><button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500">حفظ التوجيه</button></div>
      </form>
    </div>;
  }

  return (
    <div className="space-y-6 dir-rtl animate-in fade-in duration-200">
      {teacherContext && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">متابعة الأستاذ: {teacherContext.firstName} {teacherContext.lastName} — التوجيهات الخاصة بالأستاذ تستخدم InspectorNote.</div>}
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-amber-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-amber-200 text-xs font-bold border border-white/20">
              <Megaphone className="w-4 h-4 text-amber-300" />
              <span>التعليمات الرسمية والندوات التربوية — المقاطعة 07</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              منصة التوجيهات والبث الجماعي للمفتشية
            </h2>
            <p className="text-xs text-amber-100/90 max-w-2xl leading-relaxed">
              إصدار المنشورات التوجيهية، الدعوة للندوات التربوية والأيام الدراسية، وإرسال التنبيهات الرسمية لجميع أساتذة المقاطعة.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>نشر توجيه رسمـي أو ندوة تربوية</span>
          </button>
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>سجل المنشورات والتعليمات الموجهة لأساتذة المقاطعة</span>
          </h3>
          <span className="text-xs text-slate-500 font-bold">{broadcasts.length} منشورات سابقة</span>
        </div>

        {broadcasts.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">لم يتم نشر أي منشورات أو تعليمات جماعية بعد.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((bc) => (
              <div
                key={bc.id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-amber-300 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${
                      bc.category === 'ندوة_تكوينية'
                        ? 'bg-purple-100 text-purple-800'
                        : bc.category === 'إشعار_مستعجل'
                        ? 'bg-rose-100 text-rose-800'
                        : bc.category === 'دعوة_اجتماع'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {bc.category === 'ندوة_تكوينية'
                      ? '🎓 ندوة تربوية / يوم دراسي'
                      : bc.category === 'إشعار_مستعجل'
                      ? '⚠️ إشعار هام ومستعجل'
                      : bc.category === 'دعوة_اجتماع'
                      ? '📅 دعوة لاجتماع بيداغوجي'
                      : '📜 توجيه بيداغوجي رسمـي'}
                  </span>

                  <span className="text-[10px] text-slate-400 font-bold">
                    📅 {new Date(bc.createdAt).toLocaleDateString('ar-DZ')}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{bc.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                    {bc.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-bold">
                  <span>المفتش الناشر: {bc.inspectorName}</span>
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>تم الإرسال لجميع أساتذة المقاطعة</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal New Broadcast */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">نشر توجيه أو ندوة تربوية للمقاطعة</h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    سيظهر هذا المنشور مباشرة في لوحة تحكم أساتذة المقاطعة 07
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">تصنيف المنشور</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="توجيه_بيداغوجي">📜 توجيه بيداغوجي رسمي</option>
                  <option value="ندوة_تكوينية">🎓 ندوة تربوية / يوم دراسي</option>
                  <option value="دعوة_اجتماع">📅 دعوة لاجتماع تنسيقي</option>
                  <option value="إشعار_مستعجل">⚠️ إشعار هام ومستعجل</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">عنوان المنشور</label>
                <input
                  type="text"
                  required
                  placeholder="عنوان التوجيه أو اليوم الدراسي..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">محتوى وتفاصيل التعليمة الرسمية</label>
                <textarea
                  rows={5}
                  required
                  placeholder="اكتب نص التعليمة، جدول الأعمال، المكان، التاريخ، أو التوجيهات البيداغوجية المطلوب الالتزام بها..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black shadow-md cursor-pointer"
                >
                  بث المنشور لجميع الأساتذة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
