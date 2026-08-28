import React from 'react';
import type {
  AnnualPlanDomainPresentation,
  AnnualPlanGradePresentation,
} from '../../services/annualPlanPresentation';

interface AnnualPlanPrintTableProps {
  presentation: AnnualPlanGradePresentation;
}

const PrintList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul>
    {items.map((item, index) => (
      <li key={`${item}-${index}`}>{item}</li>
    ))}
  </ul>
);

const Resources: React.FC<{ domain: AnnualPlanDomainPresentation }> = ({ domain }) => (
  <>
    <PrintList items={domain.knowledgeResources} />
  </>
);

const TransversalResources: React.FC<{ domain: AnnualPlanDomainPresentation }> = ({ domain }) => (
  <div className="annual-plan-print-inline-groups">
    {domain.transversalResources.map((group) => (
      <div key={group.label}>
        <strong>{group.label}: </strong>
        <span>{group.items.join('؛ ')}</span>
      </div>
    ))}
  </div>
);

const Criteria: React.FC<{ domain: AnnualPlanDomainPresentation }> = ({ domain }) => (
  <div className="annual-plan-print-inline-groups">
    {domain.evaluationCriteria.map((item, index) => (
      <div key={`${item.criterion}-${index}`}>
        <strong>{item.criterion}: </strong>
        <span>{item.indicators.join('؛ ')}</span>
      </div>
    ))}
  </div>
);

export const AnnualPlanPrintTable: React.FC<AnnualPlanPrintTableProps> = ({ presentation }) => (
  <table className="annual-plan-print-table">
    <colgroup>
      <col style={{ width: '7%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '22%' }} />
      <col style={{ width: '20%' }} />
      <col style={{ width: '17%' }} />
      <col style={{ width: '6%' }} />
    </colgroup>
    <caption>المخطط السنوي لبناء التعلمات — {presentation.gradeLabel}</caption>
    <thead>
      <tr>
        <th>الميدان</th>
        <th>الكفاءة الختامية / الخاصة</th>
        <th>مركبات الكفاءة</th>
        <th>الموارد المعرفية</th>
        <th>الموارد العرضية</th>
        <th>معايير ومؤشرات التقييم</th>
        <th>الزمن</th>
      </tr>
    </thead>
    <tbody>
      {presentation.domains.map((domain) => (
        <tr key={domain.domainId}>
          <th scope="row" className="annual-plan-print-domain-cell">
            {domain.domainLabel}
          </th>
          <td>{domain.competency || '— فارغ —'}</td>
          <td>
            <PrintList items={domain.components} />
          </td>
          <td>
            <Resources domain={domain} />
          </td>
          <td>
            <TransversalResources domain={domain} />
          </td>
          <td>
            <Criteria domain={domain} />
          </td>
          <td className="annual-plan-print-time-cell">{domain.time || '—'}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
