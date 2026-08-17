import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Clock, Search, Filter, Sparkles, MessageSquare, FileText, UserCheck, AlertCircle } from 'lucide-react';
import { CommunityResource, User } from '../../../types/spex';

interface InspectorResourceValidationViewProps {
  resources: CommunityResource[];
  teachers: User[];
  onToggleApproveResource: (resourceId: string) => void;
  onSendNoteToTeacher: (teacherId: string, teacherName: string, title: string, content: string) => void;
}

export const InspectorResourceValidationView: React.FC<InspectorResourceValidationViewProps> = ({
  resources,
  teachers,
  onToggleApproveResource,
  onSendNoteToTeacher,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'approved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Feedback note state
  const [selectedResourceForNote, setSelectedResourceForNote] = useState<CommunityResource | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');

  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterType === 'all'
        ? true
        : filterType === 'pending'
        ? !res.isApprovedByInspector
        : res.isApprovedByInspector;

    const matchesCategory =
      categoryFilter === 'all' ? true : res.type === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const pendingCount = resources.filter((r) => !r.isApprovedByInspector).length;
  const approvedCount = resources.filter((r) => r.isApprovedByInspector).length;

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceForNote || !feedbackNote.trim()) return;

    // Find author user ID if available from teachers
    const authorTeacher = teachers.find(
      (t) => `${t.firstName} ${t.lastName}` === selectedResourceForNote.authorName || t.username === selectedResourceForNote.authorUsername.replace('@', '')
    );

    const teacherId = authorTeacher?.id || 'usr_teacher_1';

    onSendNoteToTeacher(
      teacherId,
      selectedResourceForNote.authorName,
      `توجيه بيداغوجي بخصوص المورد: ${selectedResourceForNote.title}`,
      feedbackNote.trim()
    );

    setFeedbackNote('');
    setSelectedResourceForNote(null);
  };

  return (
    <div className="space-y-6 dir-rtl animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 shadow-md border border-slate-700/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>مراجعة وتوثيق الموارد البيداغوجية للمقاطعة 07</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              مركز المصادقة والاعتماد البيداغوجي للموارد المرفوعة
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              فحص ومراجعة المذكرات والألعاب التربوية والوثائق البيداغوجية المنشورة من طرف أساتذة المقاطعة، وتوثيق المكتمل منها بختم المفتشية الرسمي.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-[10px] text-amber-200 block font-bold">بانتظار المراجعة</span>
              <span className="text-lg font-black text-amber-400">{pendingCount} مورد</span>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-[10px] text-emerald-200 block font-bold">معتمد رسمياً</span>
              <span className="text-lg font-black text-emerald-400">{approvedCount} مورد</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جميع الموارد ({resources.length})
            </button>
            <button
              onClick={() => setFilterType('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filterType === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>بانتظار الاعتماد ({pendingCount})</span>
            </button>
            <button
              onClick={() => setFilterType('approved')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filterType === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>المعتمَدة رسمياً ({approvedCount})</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالعنوان، اسم الأستاذ، الوصف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">جميع الأنواع</option>
              <option value="lesson_plan">مذكرات بيداغوجية</option>
              <option value="game">ألعاب تربوية</option>
              <option value="situation">وضعيات تعلمية</option>
              <option value="file">وثائق وكتب</option>
            </select>
          </div>
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">لا توجد موارد مطابقة للفرز المحدد حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResources.map((res) => (
              <div
                key={res.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  res.isApprovedByInspector
                    ? 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300'
                    : 'bg-white border-amber-200 hover:border-amber-300 shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  {/* Status & Type Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
                      {res.type === 'lesson_plan'
                        ? '📄 مذكرة بيداغوجية'
                        : res.type === 'game'
                        ? '🎮 لعبة تربوية'
                        : res.type === 'situation'
                        ? '🎯 وضعية تعلمية'
                        : '📁 وثيقة بيداغوجية'}
                    </span>

                    {res.isApprovedByInspector ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>معتمد من المفتشية</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>بانتظار المصادقة</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {res.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>
                  </div>

                  {/* Author Meta */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        {res.authorName?.[0] || 'أ'}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-800 text-[11px] block leading-none">
                          {res.authorName}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {res.authorUsername} • {new Date(res.createdAt).toLocaleDateString('ar-DZ')}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-bold">
                      ❤️ {res.likesCount || 0} إعجاب • 💾 {res.savesCount || 0} حفظ
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedResourceForNote(res)}
                    className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                    <span>توجيه ملاحظة للأستاذ</span>
                  </button>

                  <button
                    onClick={() => onToggleApproveResource(res.id)}
                    className={`flex-1 px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      res.isApprovedByInspector
                        ? 'bg-slate-200 hover:bg-rose-100 text-slate-800 hover:text-rose-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {res.isApprovedByInspector ? 'إلغاء الاعتماد' : 'اعتماد وختم المفتشية'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {selectedResourceForNote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">إرسال توجيه بيداغوجي للأستاذ</h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    المورد المعني: {selectedResourceForNote.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResourceForNote(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  المحظورات والتعديلات المطلوبة (توجيهات المفتشية)
                </label>
                <textarea
                  rows={4}
                  required
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="اكتب التوجيهات البيداغوجية، ملاحظات الأمن والسلامة، أو المقترحات لتحسين المورد..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedResourceForNote(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-xs cursor-pointer"
                >
                  إرسال التوجيه الرسمي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
