import React from 'react';
import type { LearningSectionPrintModel } from '../../services/learningSectionPrint.service';
import { AcademicYearLabel } from '../common/AcademicYearLabel';

interface LearningSectionPrintDocumentProps {
  model: LearningSectionPrintModel;
}

export const LearningSectionPrintDocument: React.FC<LearningSectionPrintDocumentProps> = ({
  model,
}) => (
  <section className="learning-section-print-root" dir="rtl" aria-label="وثيقة المقطع التعلمي">
    <article className="learning-section-print-page">
      <header className="learning-section-print-header">
        <div className="learning-section-print-authority">
          <div>الجمهورية الجزائرية الديمقراطية الشعبية</div>
          <div>وزارة التربية الوطنية</div>
        </div>
        <h1>المقطع التعلمي</h1>
        <p>التربية البدنية والرياضية</p>
        <div className="learning-section-print-meta">
          <div>
            <span>المؤسسة</span>
            <strong>{model.header.institution}</strong>
          </div>
          <div>
            <span>الأستاذ</span>
            <strong>{model.header.teacher}</strong>
          </div>
          <div>
            <span>السنة الدراسية</span>
            <strong>
              <AcademicYearLabel value={model.header.academicYear} />
            </strong>
          </div>
          <div>
            <span>المستوى</span>
            <strong>{model.header.level}</strong>
          </div>
          <div className="learning-section-print-meta-domain">
            <span>الميدان</span>
            <strong>{model.header.domain}</strong>
          </div>
        </div>
      </header>

      <section className="learning-section-print-competencies">
        <div>
          <strong>الكفاءة الختامية</strong>
          <p>{model.finalCompetency}</p>
        </div>
      </section>

      <table className="learning-section-print-table">
        <colgroup>
          <col className="learning-section-print-col-type" />
          <col className="learning-section-print-col-objective" />
          <col className="learning-section-print-col-content" />
          <col className="learning-section-print-col-execution" />
          <col className="learning-section-print-col-situations" />
          <col className="learning-section-print-col-knowledge" />
          <col className="learning-section-print-col-guidance" />
        </colgroup>
        <caption>التسلسل البيداغوجي للمقطع التعلمي</caption>
        <thead>
          <tr>
            <th>نوع الحصة</th>
            <th>هدف الحصة / التعلم</th>
            <th>محتوى التعلم</th>
            <th>محتوى الإنجاز</th>
            <th>المواقف التربوية / الموارد</th>
            <th>المعارف المجندة</th>
            <th>التوجيهات</th>
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row, index) => (
            <tr key={`${row.kind}-${index}`} className={`learning-section-print-row-${row.kind}`}>
              <th scope="row">{row.label}</th>
              <td>{row.objective}</td>
              <td>{row.learningContent}</td>
              <td>{row.executionContent}</td>
              <td>{row.situationsAndResources}</td>
              <td>{row.knowledge}</td>
              <td>{row.guidance}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="learning-section-print-signatures">
        <span>الأستاذ: {model.signatures.teacher}</span>
        <span>المدير: {model.signatures.director}</span>
        <span>المفتش: {model.signatures.inspector}</span>
      </footer>
    </article>
  </section>
);
