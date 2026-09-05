import React, { type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Sliders, X } from 'lucide-react';
import type { EvaluationWeights } from '../../types/smartGradebook';

interface GradebookWeightsDialogProps {
  dialogRef: RefObject<HTMLDivElement | null>;
  weights: EvaluationWeights;
  onChange: Dispatch<SetStateAction<EvaluationWeights>>;
  onClose: () => void;
  onSave: () => void;
}

export const GradebookWeightsDialog: React.FC<GradebookWeightsDialogProps> = ({
  dialogRef,
  weights,
  onChange,
  onClose,
  onSave,
}) => (
  <div className="fixed inset-0 z-50 flex min-h-full items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gradebook-weights-title"
      aria-describedby="gradebook-weights-description"
      tabIndex={-1}
      className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3
          id="gradebook-weights-title"
          className="flex min-w-0 flex-1 items-center gap-2 text-base font-black text-slate-900"
        >
          <Sliders aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-500" />
          <span className="min-w-0 break-words">إعدادات وتخصيص أوزان التقييم (المجموع = 10)</span>
        </h3>
        <button
          type="button"
          aria-label="إغلاق إعدادات أوزان التقييم"
          onClick={onClose}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <p id="gradebook-weights-description" className="text-xs text-slate-500">
        يمكن للأستاذ أو المؤسسة تعديل التوزيع الافتراضي لأوزان التقييم الأربعة لتلائم خصوصيات
        التدريس أو المنشور الخاص بالولاية.
      </p>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
            <label htmlFor="gradebook-weight-competency" className="min-w-0 flex-1 text-slate-800">
              1. تملك الكفاءة الختامية:
            </label>
            <span className="shrink-0 font-mono font-black text-blue-700">
              {weights.competencyWeight} نقاط
            </span>
          </div>
          <input
            id="gradebook-weight-competency"
            type="range"
            min="1"
            max="7"
            step="0.5"
            value={weights.competencyWeight}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                competencyWeight: parseFloat(event.target.value),
              }))
            }
            className="w-full cursor-pointer accent-blue-600"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
            <label
              htmlFor="gradebook-weight-participation"
              className="min-w-0 flex-1 text-slate-800"
            >
              2. المشاركة الفعالة والأداء الحركي:
            </label>
            <span className="shrink-0 font-mono font-black text-blue-700">
              {weights.participationWeight} نقاط
            </span>
          </div>
          <input
            id="gradebook-weight-participation"
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={weights.participationWeight}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                participationWeight: parseFloat(event.target.value),
              }))
            }
            className="w-full cursor-pointer accent-blue-600"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
            <label htmlFor="gradebook-weight-behavior" className="min-w-0 flex-1 text-slate-800">
              3. السلوك والانضباط والروح الرياضية:
            </label>
            <span className="shrink-0 font-mono font-black text-blue-700">
              {weights.behaviorWeight} نقاط
            </span>
          </div>
          <input
            id="gradebook-weight-behavior"
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={weights.behaviorWeight}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                behaviorWeight: parseFloat(event.target.value),
              }))
            }
            className="w-full cursor-pointer accent-blue-600"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
            <label htmlFor="gradebook-weight-attendance" className="min-w-0 flex-1 text-slate-800">
              4. المواظبة والحضور:
            </label>
            <span className="shrink-0 font-mono font-black text-blue-700">
              {weights.attendanceWeight} نقاط
            </span>
          </div>
          <input
            id="gradebook-weight-attendance"
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={weights.attendanceWeight}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                attendanceWeight: parseFloat(event.target.value),
              }))
            }
            className="w-full cursor-pointer accent-blue-600"
          />
        </div>

        <div className="border-t border-slate-100 pt-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
            <label htmlFor="gradebook-weight-absence" className="min-w-0 flex-1 text-slate-800">
              خصم الغياب غير المبرر (عن كل حصة):
            </label>
            <span className="shrink-0 font-mono font-black text-rose-600">
              -{weights.unexcusedDeduction} نقطة
            </span>
          </div>
          <input
            id="gradebook-weight-absence"
            type="range"
            min="0.1"
            max="0.5"
            step="0.05"
            value={weights.unexcusedDeduction}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                unexcusedDeduction: parseFloat(event.target.value),
              }))
            }
            className="w-full cursor-pointer accent-rose-600"
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
          <span className="font-bold text-slate-700">المجموع النهائي للأوزان:</span>
          <span className="text-sm font-mono font-black text-blue-900">
            {(
              weights.competencyWeight +
              weights.participationWeight +
              weights.behaviorWeight +
              weights.attendanceWeight
            ).toFixed(1)}{' '}
            / 10 نقاط
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 pt-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() =>
            onChange({
              competencyWeight: 5,
              participationWeight: 2,
              behaviorWeight: 2,
              attendanceWeight: 1,
              unexcusedDeduction: 0.25,
            })
          }
          className="w-full rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 sm:w-auto"
        >
          استرجاع الأوزان الافتراضية
        </button>
        <button
          type="button"
          onClick={onSave}
          className="action-primary w-full rounded-2xl px-5 py-2 text-xs font-bold text-white shadow-md sm:w-auto"
        >
          حفظ وإعادة حساب العلامات المقترحة
        </button>
      </div>
    </div>
  </div>
);
