import React from 'react';
import type {
  DailyNotebookPrintModel,
  DailyNotebookPrintRow,
} from '../../services/dailyNotebookPrint.service';

interface DailyNotebookPrintDocumentProps {
  model: DailyNotebookPrintModel;
}

function PrintDate({ row }: { row: DailyNotebookPrintRow }) {
  return (
    <div className="daily-notebook-print-date">
      <strong>{row.dayLabel}</strong>
      <b>{row.dayNumber}</b>
      <span>{row.monthLabel}</span>
      <span>{row.year}</span>
    </div>
  );
}

function PrintSessionMeta({ row }: { row: DailyNotebookPrintRow }) {
  return (
    <div className="daily-notebook-print-session-meta">
      <div>
        <strong>الحصة:</strong> {row.sessionNumber ?? '—'}
        {row.pairPosition ? ` (${row.pairPosition}/2)` : ''}
      </div>
      <div>
        <strong>الوقت:</strong> {row.startTime || '—'}
      </div>
      <div>
        <strong>المدة:</strong> {row.durationMinutes || '—'} د
      </div>
      <div>
        <strong>المكان:</strong> {row.venue || '—'}
      </div>
    </div>
  );
}

function PrintStatus({ row }: { row: DailyNotebookPrintRow }) {
  return (
    <div className="daily-notebook-print-status">
      <strong>{row.executionStatus}</strong>
      {row.executionStatus === 'مؤجلة' && <span>تحتاج إعادة برمجة</span>}
      {row.executionNote && <span>{row.executionNote}</span>}
      {!row.executionNote && row.executionStatus !== 'مؤجلة' && <span>—</span>}
    </div>
  );
}

export const DailyNotebookPrintDocument: React.FC<DailyNotebookPrintDocumentProps> = ({
  model,
}) => (
  <section className="daily-notebook-print-root" dir="rtl" aria-label="وثيقة الكراس اليومي للطباعة">
    <div className="daily-notebook-print-page">
      <header className="daily-notebook-print-header">
        <div className="daily-notebook-print-government">
          <div>الجمهورية الجزائرية الديمقراطية الشعبية</div>
          <div>وزارة التربية الوطنية</div>
        </div>
        <h1>سجل التنفيذ اليومي للأستاذ</h1>
        <p>التربية البدنية والرياضية</p>
        <div className="daily-notebook-print-identity">
          <div>
            <span>المؤسسة</span>
            <strong>{model.header.institution}</strong>
          </div>
          <div>
            <span>الأستاذ(ة)</span>
            <strong>{model.header.teacher}</strong>
          </div>
          <div>
            <span>الموسم الدراسي</span>
            <strong>{model.header.academicYear}</strong>
          </div>
          <div>
            <span>المستوى</span>
            <strong>{model.header.level}</strong>
          </div>
          <div>
            <span>القسم</span>
            <strong>{model.header.className}</strong>
          </div>
          <div>
            <span>الميدان</span>
            <strong>{model.header.domain}</strong>
          </div>
        </div>
        <div className="daily-notebook-print-week">
          <strong>الأسبوع المحدد:</strong> {model.weekStart} — {model.weekEnd}
        </div>
      </header>

      {model.rows.length > 0 ? (
        <table className="daily-notebook-print-table">
          <caption>الكراس اليومي — الحصص المبرمجة والمنفذة في الأسبوع المحدد</caption>
          <colgroup>
            <col className="daily-notebook-print-col-date" />
            <col className="daily-notebook-print-col-session" />
            <col className="daily-notebook-print-col-learning" />
            <col className="daily-notebook-print-col-content" />
            <col className="daily-notebook-print-col-memo" />
            <col className="daily-notebook-print-col-notes" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">التاريخ</th>
              <th scope="col">القسم / التوقيت</th>
              <th scope="col">التعلمات</th>
              <th scope="col">محتوى التعلم</th>
              <th scope="col">المذكرة</th>
              <th scope="col">الملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.sessionId}>
                <td>
                  <PrintDate row={row} />
                </td>
                <td>
                  <div className="daily-notebook-print-class-name">{model.header.className}</div>
                  <PrintSessionMeta row={row} />
                </td>
                <td>
                  <span className="daily-notebook-print-type">{row.sessionType}</span>
                  <strong className="daily-notebook-print-objective-label">الهدف التعلمي:</strong>
                  <div className="daily-notebook-print-objective">{row.objective}</div>
                  <div className="daily-notebook-print-learning-meta">
                    <span>الميدان: {row.domainLabel}</span>
                    <span>المقطع: {row.sectionLabel}</span>
                    {row.pairPosition && <span>الهدف المشترك — الحصة {row.pairPosition} من 2</span>}
                  </div>
                </td>
                <td className="daily-notebook-print-content">
                  {row.learningContent
                    ? row.learningContent
                        .split('\n')
                        .map((line, index) => (
                          <div key={`${row.sessionId}-content-${index}`}>{line}</div>
                        ))
                    : '—'}
                </td>
                <td className="daily-notebook-print-memo">
                  <strong>{row.memoExists ? 'موجودة' : 'غير منشأة'}</strong>
                </td>
                <td>
                  <PrintStatus row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="daily-notebook-print-empty">لا توجد حصص مبرمجة في الأسبوع المحدد.</div>
      )}

      <footer className="daily-notebook-print-footer">
        <div>إمضاء الأستاذ(ة): ____________________</div>
        <div>الإدارة: ____________________</div>
        <div>تأشيرة المفتش(ة): ____________________</div>
      </footer>
    </div>
  </section>
);
