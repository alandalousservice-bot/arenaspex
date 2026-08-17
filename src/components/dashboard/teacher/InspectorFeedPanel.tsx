import React, { useState } from 'react';
import { ShieldCheck, Award, MessageSquare, CheckCircle2, Eye, X, ChevronRight, CornerDownLeft } from 'lucide-react';
import { InspectorNote, InspectionVisit } from '../../../types/spex';
import {
  CURRENT_INSPECTOR_NAME,
  INSPECTOR_NOTE_MODULE_REF,
} from '../../../constants/teacherDashboard.constants';

interface InspectorFeedPanelProps {
  inspectorNotes: InspectorNote[];
  inspectionVisits?: InspectionVisit[];
  onOpenChatWithInspector?: () => void;
  onMarkNoteRead?: (noteId: string) => void;
}

function getNoteBadge(note: InspectorNote): { className: string; label: string } {
  if (note.moduleRef === INSPECTOR_NOTE_MODULE_REF.SEMINAR_INVITATION) {
    return {
      className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      label: '🎓 دعوة لندوة تربوية',
    };
  }
  if (note.moduleRef === INSPECTOR_NOTE_MODULE_REF.VISIT_ALERT) {
    return {
      className: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      label: '🔔 تنبيه بزيارة تفقدية',
    };
  }
  return {
    className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    label: '📝 توجيه بيداغوجي',
  };
}

export const InspectorFeedPanel: React.FC<InspectorFeedPanelProps> = ({
  inspectorNotes,
  inspectionVisits = [],
  onOpenChatWithInspector,
  onMarkNoteRead,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'visits'>('notes');
  const [selectedVisitModal, setSelectedVisitModal] = useState<InspectionVisit | null>(null);
  const [readNoteIds, setReadNoteIds] = useState<Record<string, boolean>>({});
  const [acknowledgedVisitIds, setAcknowledgedVisitIds] = useState<Record<string, boolean>>({});

  const toggleNoteRead = (id: string) => {
    setReadNoteIds((prev) => ({ ...prev, [id]: !prev[id] }));
    if (onMarkNoteRead) onMarkNoteRead(id);
  };

  const toggleVisitAck = (id: string) => {
    setAcknowledgedVisitIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalItemsCount = inspectorNotes.length + inspectionVisits.length;

  return (
    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 shadow-md border border-emerald-800/40 relative overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
        <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>توجيهات وزيارات المفتش: {CURRENT_INSPECTOR_NAME}</span>
        </span>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
          {totalItemsCount} رسائل وتفاعلات
        </span>
      </div>

      {/* Sub-tabs: Notes vs Visits */}
      <div className="flex items-center justify-between text-xs font-bold border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-200/70 hover:text-white hover:bg-white/5'
            }`}
          >
            التوجيهات والملاحظات ({inspectorNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`px-3 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'visits'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-200/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>الزيارات التفقدية ({inspectionVisits.length})</span>
          </button>
        </div>

        {onOpenChatWithInspector && (
          <button
            onClick={onOpenChatWithInspector}
            className="flex items-center gap-1 text-[10px] text-emerald-300 hover:text-white font-bold bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 rounded-xl border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3 h-3" />
            <span>مراسلة المفتش</span>
          </button>
        )}
      </div>

      {/* Tab 1: Inspector Notes */}
      {activeTab === 'notes' && (
        <>
          {inspectorNotes.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {inspectorNotes.map((note) => {
                const badge = getNoteBadge(note);
                const isRead = Boolean(readNoteIds[note.id] || (note.status as string) === 'مقروءة');
                return (
                  <div
                    key={note.id}
                    className={`p-3.5 rounded-2xl transition-all border space-y-2 ${
                      isRead
                        ? 'bg-white/5 border-white/10 opacity-80'
                        : 'bg-emerald-900/30 border-emerald-500/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${badge.className}`}>
                        {badge.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-200/70">{note.priority}</span>
                        <button
                          onClick={() => toggleNoteRead(note.id)}
                          className="text-[10px] text-emerald-300 hover:text-white flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md cursor-pointer"
                          title="تأكيد الاطلاع"
                        >
                          <CheckCircle2 className={`w-3 h-3 ${isRead ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span>{isRead ? 'تمت المطالعة' : 'تحديد كمقروء'}</span>
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">{note.title}</h4>
                    <p className="text-xs text-emerald-100/90 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                      "{note.content}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-emerald-300/80 pt-1 border-t border-white/5">
                      <span>المفتش المحرر: {note.inspectorName || CURRENT_INSPECTOR_NAME}</span>
                      <span className="dir-ltr">{note.createdAt?.split('T')[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center space-y-1">
              <p className="text-xs text-emerald-200/80 italic">
                لا توجد ملاحظات أو توجيهات بيداغوجية مرسلة من المفتش حالياً.
              </p>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Inspection Visits */}
      {activeTab === 'visits' && (
        <>
          {inspectionVisits.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {inspectionVisits.map((visit) => {
                const isAck = acknowledgedVisitIds[visit.id];
                return (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-emerald-500/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30">
                          علامة التفتيش: {visit.pedagogicalGrade}/20
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold">
                          {visit.visitType}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-200/70 dir-ltr">{visit.visitDate}</span>
                    </div>

                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <span>{visit.lessonObservedTitle}</span>
                    </h4>

                    {visit.positivePoints && visit.positivePoints.length > 0 && (
                      <div className="text-[11px] text-emerald-200/90 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40 space-y-1">
                        <span className="font-bold text-emerald-400 block">أبرز النقاط الإيجابية المسجلة:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[10px] text-emerald-100">
                          {visit.positivePoints.slice(0, 2).map((pt, idx) => (
                            <li key={idx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <button
                        onClick={() => setSelectedVisitModal(visit)}
                        className="flex items-center gap-1 text-emerald-300 hover:text-white font-bold bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>عرض تقرير الزراءة التفصيلي</span>
                      </button>

                      <button
                        onClick={() => toggleVisitAck(visit.id)}
                        className={`flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          isAck
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isAck ? 'تم التأكيد والتعهد' : 'تأكيد الاستلام'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center space-y-1">
              <p className="text-xs text-emerald-200/80 italic">
                لا توجد تقارير زيارات تفقدية مرسلة من المفتش حالياً.
              </p>
            </div>
          )}
        </>
      )}

      {/* Detailed Visit Modal */}
      {selectedVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200 dir-rtl text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تقرير الزيارة التفتيشية البيداغوجية</h3>
                  <p className="text-xs text-slate-500">تاريخ الزيارة: {selectedVisitModal.visitDate}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVisitModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-bold block">موضوع الحصة الملاحظة:</span>
                <span className="text-sm font-extrabold text-emerald-950">{selectedVisitModal.lessonObservedTitle}</span>
              </div>
              <div className="text-center bg-emerald-600 text-white p-2.5 rounded-2xl shadow-sm">
                <span className="text-[10px] block font-bold">التقدير البيداغوجي</span>
                <span className="text-lg font-black">{selectedVisitModal.pedagogicalGrade} / 20</span>
              </div>
            </div>

            {/* Positive Points */}
            {selectedVisitModal.positivePoints && selectedVisitModal.positivePoints.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <h4 className="font-extrabold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>النقاط البيداغوجية الإيجابية:</span>
                </h4>
                <ul className="list-disc list-inside bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-slate-700">
                  {selectedVisitModal.positivePoints.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {selectedVisitModal.areasForImprovement && selectedVisitModal.areasForImprovement.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <h4 className="font-extrabold text-amber-800 flex items-center gap-1">
                  <CornerDownLeft className="w-4 h-4 text-amber-600" />
                  <span>نقاط التحسين الموصى بها:</span>
                </h4>
                <ul className="list-disc list-inside bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 space-y-1 text-amber-900">
                  {selectedVisitModal.areasForImprovement.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Official Recommendations */}
            {selectedVisitModal.recommendations && selectedVisitModal.recommendations.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <h4 className="font-extrabold text-blue-800 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>التوصيات والقرارات التوجيهية:</span>
                </h4>
                <ul className="list-disc list-inside bg-blue-50/60 p-3 rounded-xl border border-blue-200/80 space-y-1 text-blue-900">
                  {selectedVisitModal.recommendations.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedVisitModal(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                إغلاق التقارير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

