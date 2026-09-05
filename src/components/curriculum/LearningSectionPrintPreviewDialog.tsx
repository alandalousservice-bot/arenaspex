import React, { type RefObject } from 'react';
import { Printer } from 'lucide-react';
import type { LearningSectionPrintModel } from '../../services/learningSectionPrint.service';
import { useAccessibleDialog } from '../../hooks/useAccessibleDialog';
import { LearningSectionPrintDocument } from './LearningSectionPrintDocument';

interface LearningSectionPrintPreviewDialogProps {
  model: LearningSectionPrintModel;
  dialogRef: RefObject<HTMLDivElement | null>;
  openerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export const LearningSectionPrintPreviewDialog: React.FC<
  LearningSectionPrintPreviewDialogProps
> = ({ model, dialogRef, openerRef, onClose }) => {
  useAccessibleDialog({
    open: true,
    dialogRef,
    openerRef,
    onClose,
  });

  return (
    <div
      ref={dialogRef}
      className="learning-section-print-preview-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-section-print-title"
      tabIndex={-1}
    >
      <div className="learning-section-print-preview-actions print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
        >
          <Printer aria-hidden="true" className="h-4 w-4" /> طباعة
        </button>
        <button
          type="button"
          aria-label="إغلاق معاينة المقطع التعلمي"
          onClick={onClose}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
        >
          رجوع / إغلاق
        </button>
      </div>
      <LearningSectionPrintDocument model={model} />
    </div>
  );
};
