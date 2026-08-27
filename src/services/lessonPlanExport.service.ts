import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { LessonPlan } from '../types/spex';
import { getLessonMemoPresentation } from './lessonPlan.generator.service';

const rtl = (text: string, bold = false) =>
  new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: text || '', bold, rightToLeft: true, size: 22 })],
  });
const border = { style: BorderStyle.SINGLE, size: 4, color: '64748B' };
const cell = (text: string, bold = false) =>
  new TableCell({
    children: [rtl(text, bold)],
    borders: { top: border, bottom: border, left: border, right: border },
  });

/** يحافظ على وظيفة التصدير الموجودة، لكن يصدر القالب الموحد فقط. */
export function buildLessonPlanDocx(plan: LessonPlan): Document {
  const model = getLessonMemoPresentation(plan);
  const rows = model.rows;
  const metadata: [string, string][] = [
    ...model.details,
    ['الكفاءة الختامية', model.competency],
    ['الهدف التعلمي', model.objective],
  ];
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metadata.map(
      ([label, value]) => new TableRow({ children: [cell(label, true), cell(value)] })
    ),
  });
  const lessonTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ['المراحل', 'محتوى التعلم والإنجاز', 'الوقت', 'التوجيهات'].map((value) =>
          cell(value, true)
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              cell(row.phaseLabel, true),
              cell(row.content),
              cell(`${row.source.durationMinutes} د`),
              cell(row.source.guidance),
            ],
          })
      ),
    ],
  });
  return new Document({
    sections: [
      {
        children: [
          rtl('مذكرة حصة تعلمية', true),
          metaTable,
          lessonTable,
          rtl(`الأستاذ: ${model.footer.teacherName}`),
          ...(model.footer.inspectorName ? [rtl(`المفتش: ${model.footer.inspectorName}`)] : []),
        ],
      },
    ],
  });
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export async function exportLessonPlanToWord(plan: LessonPlan): Promise<void> {
  download(
    await Packer.toBlob(buildLessonPlanDocx(plan)),
    `مذكرة-${plan.sessionGlobalNumber || ''}.docx`
  );
}

const escapeHtml = (text: string) =>
  (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function exportLessonPlanToPdf(plan: LessonPlan): void {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) return;
  const model = getLessonMemoPresentation(plan);
  const metadata = [
    ...model.details,
    ['الكفاءة الختامية', model.competency],
    ['الهدف التعلمي', model.objective],
  ];
  const rows = model.rows;
  printWindow.document.write(
    `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مذكرة حصة تعلمية</title><style>@page{size:A4 portrait;margin:14mm}body{font-family:Tahoma,Arial,sans-serif;color:#111}h1{text-align:center;font-size:18px;color:#064e3b}table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px;page-break-inside:auto}th,td{border:1px solid #444;padding:7px;vertical-align:top}th{background:#e2e8f0}tr{page-break-inside:avoid}.meta th{width:18%;background:#f1f5f9}.footer{display:flex;justify-content:space-between;margin-top:28px;border-top:1px solid #94a3b8;padding-top:12px;font-weight:bold}</style></head><body><h1>مذكرة حصة تعلمية</h1><table class="meta">${metadata.map(([l, v]) => `<tr><th>${escapeHtml(l)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table><table><thead><tr><th>المراحل</th><th>محتوى التعلم والإنجاز</th><th>الوقت</th><th>التوجيهات</th></tr></thead><tbody>${rows.map((r) => `<tr><th>${escapeHtml(r.phaseLabel)}</th><td>${escapeHtml(r.content)}</td><td>${r.source.durationMinutes} د</td><td>${escapeHtml(r.source.guidance)}</td></tr>`).join('')}</tbody></table><div class="footer"><span>الأستاذ: ${escapeHtml(model.footer.teacherName)}</span>${model.footer.inspectorName ? `<span>المفتش: ${escapeHtml(model.footer.inspectorName)}</span>` : ''}</div></body></html>`
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
