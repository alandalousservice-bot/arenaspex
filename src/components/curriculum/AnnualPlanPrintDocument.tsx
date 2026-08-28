import React from 'react';
import type { User } from '../../types/spex';
import type { AnnualPlanGradePresentation } from '../../services/annualPlanPresentation';
import { formatAcademicYearLabel } from '../../services/academicYear';
import { AnnualPlanPrintTable } from './AnnualPlanPrintTable';

export const ANNUAL_PLAN_PRINT_PAGE_WIDTH_MM = 289;
export const ANNUAL_PLAN_PRINT_PAGE_HEIGHT_MM = 202;
export const ANNUAL_PLAN_PRINT_PAGE_MARGIN_MM = 4;

interface AnnualPlanPrintDocumentProps {
  currentUser: User;
  academicYearId: string;
  presentation: AnnualPlanGradePresentation;
}

export const AnnualPlanPrintDocument: React.FC<AnnualPlanPrintDocumentProps> = ({
  currentUser,
  academicYearId,
  presentation,
}) => (
  <section className="annual-plan-print-root" dir="rtl" aria-label="وثيقة المخطط السنوي للطباعة">
    <div className="annual-plan-print-page">
      <header className="annual-plan-print-header">
        <div className="annual-plan-print-institution">
          <div>الجمهورية الجزائرية الديمقراطية الشعبية</div>
          <div>وزارة التربية الوطنية</div>
        </div>
        <h1>المخطط السنوي للتربية البدنية والرياضية</h1>
        <div className="annual-plan-print-meta">
          <div>
            <span>المؤسسة</span>
            <strong>{currentUser.schoolName || ' '}</strong>
          </div>
          <div>
            <span>الأستاذ(ة)</span>
            <strong>{`${currentUser.firstName} ${currentUser.lastName}`.trim() || ' '}</strong>
          </div>
          <div>
            <span>السنة الدراسية</span>
            <strong>{formatAcademicYearLabel(academicYearId)}</strong>
          </div>
          <div>
            <span>المستوى</span>
            <strong>{presentation.gradeLabel}</strong>
          </div>
        </div>
      </header>

      <section className="annual-plan-print-competency">
        <strong>الكفاءة الشاملة</strong>
        <span>{presentation.overallCompetency || '— فارغ —'}</span>
      </section>

      <div className="annual-plan-print-table-area">
        <AnnualPlanPrintTable presentation={presentation} />
      </div>

      <footer className="annual-plan-print-footer">
        <span>إمضاء الأستاذ(ة): ____________________</span>
        <span>إمضاء المدير(ة): ____________________</span>
      </footer>
    </div>
  </section>
);
