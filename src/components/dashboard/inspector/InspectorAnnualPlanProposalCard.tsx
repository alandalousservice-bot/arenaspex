/**
 * SPEX - Inspector Annual Plan/Schedule Proposal Card
 * يتيح للمفتش اقتراح صياغة معدَّلة للأهداف التعلمية (المخطط أو التوزيع السنوي)
 * لأستاذ من مقاطعته (وفق الإسناد الفعلي)، ثم اعتماد اقتراحه ليصبح نافذاً عند الأستاذ.
 */
import React, { useState } from 'react';
import { Send, ShieldCheck, Loader2, ClipboardEdit, ChevronDown, ChevronUp } from 'lucide-react';
import { User, AnnualPlanKind } from '../../../types/spex';
import { COMPLETE_ANNUAL_CURRICULUM } from '../../../data/algerianCurriculum';
import { useAnnualPlanObjectives, objectiveKey } from '../../../hooks/useAnnualPlanObjectives';

interface InspectorAnnualPlanProposalCardProps {
  inspector: User;
  teacher: User;
  levelId: string;
}

export const InspectorAnnualPlanProposalCard: React.FC<InspectorAnnualPlanProposalCardProps> = ({
  inspector,
  teacher,
  levelId
}) => {
  const [kind, setKind] = useState<AnnualPlanKind>('plan');
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    record,
    overrides,
    setObjective,
    save,
    approve,
    isSaving,
    isLoading
  } = useAnnualPlanObjectives({ currentUser: inspector, teacherId: teacher.id, levelId, kind });

  const levelCurriculum = COMPLETE_ANNUAL_CURRICULUM[levelId] || COMPLETE_ANNUAL_CURRICULUM['lvl_p1'];

  const canApprove = !!record && record.status === 'proposed' && record.proposedByInspectorId === inspector.id;
  const isMyApproved = !!record && record.status === 'approved' && record.proposedByInspectorId === inspector.id;

  return (
    <div className="bg-white rounded-3xl p-5 border border-indigo-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <ClipboardEdit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              اقتراح صياغة الأهداف لـ {teacher.firstName} {teacher.lastName}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold">
              يمكنك اقتراح صياغة معدَّلة للأهداف واعتمادها لتصبح نافذة عند هذا الأستاذ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setKind('plan')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                kind === 'plan' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              المخطط السنوي
            </button>
            <button
              onClick={() => setKind('schedule')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                kind === 'schedule' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              التوزيع السنوي
            </button>
          </div>
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <span>{isExpanded ? 'إخفاء الأهداف' : 'تعديل الأهداف'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {record && (
        <div
          className={`rounded-2xl p-3 border flex items-center gap-2 text-[11px] font-bold ${
            record.status === 'approved'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            {record.status === 'approved'
              ? isMyApproved
                ? 'اقتراحك معتمد حالياً وهو النافذ عند هذا الأستاذ.'
                : 'يوجد اقتراح معتمد من مفتش آخر لهذا الأستاذ.'
              : record.proposedByInspectorId === inspector.id
              ? 'اقتراحك محفوظ بانتظار اعتمادك.'
              : 'يوجد اقتراح من مفتش آخر بانتظار الاعتماد.'}
          </span>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-400 text-xs font-bold gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري التحميل...</span>
            </div>
          ) : (
            Object.entries(levelCurriculum.fields).map(([fieldKey, field]) => (
              <div key={fieldKey} className="border border-slate-200 rounded-2xl p-3 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-800">{field.fieldName}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {field.sessionsList.map((s) => (
                    <div key={s.sessionNumber} className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500">
                        الحصة {s.sessionNumber < 10 ? '0' + s.sessionNumber : s.sessionNumber} ({s.typeLabel})
                      </span>
                      <textarea
                        value={overrides[objectiveKey(field.fieldId, s.sessionNumber)] ?? s.objective}
                        onChange={(e) => setObjective(field.fieldId, s.sessionNumber, e.target.value)}
                        rows={2}
                        className="w-full px-2.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-y"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              onClick={() => save()}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>حفظ الاقتراح</span>
            </button>
            <button
              onClick={() => approve()}
              disabled={!canApprove}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>اعتماد الاقتراح</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
