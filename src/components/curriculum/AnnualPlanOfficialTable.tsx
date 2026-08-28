import React from 'react';
import { Clock } from 'lucide-react';
import type {
  AnnualPlanDomainPresentation,
  AnnualPlanGradePresentation,
} from '../../services/annualPlanPresentation';

export type AnnualPlanEditValues = {
  comprehensive: string;
  domains: Record<string, Record<string, string>>;
};

interface AnnualPlanOfficialTableProps {
  presentation: AnnualPlanGradePresentation;
  editValues: AnnualPlanEditValues;
  isEditing: boolean;
  onComprehensiveChange: (value: string) => void;
  onDomainChange: (domainId: string, field: string, value: string) => void;
}

function DomainCell({
  domain,
  value,
  children,
  isEditing,
  onChange,
}: {
  domain: AnnualPlanDomainPresentation;
  value: string;
  children: React.ReactNode;
  isEditing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <td className="align-top border border-slate-300 bg-white p-3 text-right text-xs leading-6 text-slate-800">
      {isEditing ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          className="min-h-28 w-full resize-y rounded-lg border border-blue-300 bg-white p-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        children
      )}
    </td>
  );
}

const list = (items: string[]) => (
  <ul className="list-disc space-y-1 pr-4">
    {items.map((item, index) => (
      <li key={`${item}-${index}`}>{item}</li>
    ))}
  </ul>
);

export const AnnualPlanOfficialTable: React.FC<AnnualPlanOfficialTableProps> = ({
  presentation,
  editValues,
  isEditing,
  onComprehensiveChange,
  onDomainChange,
}) => (
  <section className="space-y-4 break-inside-avoid print:break-inside-avoid">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-2 text-xs font-black text-emerald-900">الكفاءة الشاملة</div>
      {isEditing ? (
        <textarea
          value={editValues.comprehensive}
          onChange={(event) => onComprehensiveChange(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-emerald-300 bg-white p-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
        />
      ) : (
        <p className="text-sm font-extrabold leading-7 text-slate-900">
          {presentation.overallCompetency || '— فارغ —'}
        </p>
      )}
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-sm print:overflow-visible">
      <table className="min-w-[1180px] w-full border-collapse text-right print:min-w-0">
        <caption className="border-b border-slate-300 bg-slate-900 px-4 py-3 text-right text-sm font-black text-white">
          المخطط السنوي لبناء التعلمات — {presentation.gradeLabel}
        </caption>
        <thead>
          <tr className="bg-amber-100 text-[11px] font-black text-slate-900">
            {[
              'الميدان',
              'الكفاءة الختامية / الخاصة',
              'مركبات الكفاءة',
              'الموارد المعرفية',
              'الموارد العرضية',
              'معايير ومؤشرات التقييم',
              'الزمن',
            ].map((label) => (
              <th key={label} className="border border-slate-300 p-3 align-middle">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {presentation.domains.map((domain) => {
            const edit = editValues.domains[domain.domainId] || {};
            return (
              <tr key={domain.domainId} className="break-inside-avoid">
                <td className="w-[13%] align-top border border-slate-300 bg-blue-50 p-3 text-xs font-black leading-6 text-blue-950">
                  {domain.domainLabel}
                </td>
                <DomainCell
                  domain={domain}
                  value={edit.competency ?? domain.competency}
                  isEditing={isEditing}
                  onChange={(value) => onDomainChange(domain.domainId, 'competency', value)}
                >
                  <p className="font-bold">{domain.competency || '— فارغ —'}</p>
                </DomainCell>
                <DomainCell
                  domain={domain}
                  value={edit.components ?? domain.components.join('\n')}
                  isEditing={isEditing}
                  onChange={(value) => onDomainChange(domain.domainId, 'components', value)}
                >
                  {list(domain.components)}
                </DomainCell>
                <DomainCell
                  domain={domain}
                  value={edit.knowledgeResources ?? domain.knowledgeResources.join('\n')}
                  isEditing={isEditing}
                  onChange={(value) => onDomainChange(domain.domainId, 'knowledgeResources', value)}
                >
                  {list(domain.knowledgeResources)}
                </DomainCell>
                <DomainCell
                  domain={domain}
                  value={
                    edit.transversalResources ??
                    domain.transversalResources
                      .map((group) => `${group.label}: ${group.items.join('؛ ')}`)
                      .join('\n')
                  }
                  isEditing={isEditing}
                  onChange={(value) =>
                    onDomainChange(domain.domainId, 'transversalResources', value)
                  }
                >
                  <div className="space-y-2">
                    {domain.transversalResources.map((group) => (
                      <div key={group.label}>
                        <strong className="text-amber-800">{group.label}</strong>
                        {list(group.items)}
                      </div>
                    ))}
                  </div>
                </DomainCell>
                <DomainCell
                  domain={domain}
                  value={
                    edit.evaluationCriteria ??
                    domain.evaluationCriteria
                      .map((item) => `${item.criterion}: ${item.indicators.join('؛ ')}`)
                      .join('\n')
                  }
                  isEditing={isEditing}
                  onChange={(value) => onDomainChange(domain.domainId, 'evaluationCriteria', value)}
                >
                  <div className="space-y-2">
                    {domain.evaluationCriteria.map((item, index) => (
                      <div key={`${item.criterion}-${index}`}>
                        <strong className="text-indigo-800">{item.criterion}</strong>
                        {list(item.indicators)}
                      </div>
                    ))}
                  </div>
                </DomainCell>
                <td className="w-[8%] align-top border border-slate-300 bg-slate-50 p-3 text-center text-xs font-black text-slate-900">
                  {isEditing ? (
                    <input
                      value={edit.time ?? domain.time}
                      onChange={(event) =>
                        onDomainChange(domain.domainId, 'time', event.target.value)
                      }
                      className="w-full rounded-lg border border-blue-300 p-2 text-center text-xs"
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-blue-700" />
                      {domain.time || '—'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);
