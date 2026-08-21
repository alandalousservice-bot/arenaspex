import { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { LessonPlan } from '../types/spex';
import { getUnifiedLessonRows } from './lessonPlan.generator.service';

const rtl = (text: string, bold = false) => new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: text || '—', bold, rightToLeft: true, size: 22 })] });
const border = { style: BorderStyle.SINGLE, size: 4, color: '64748B' };
const cell = (text: string, bold = false) => new TableCell({ children: [rtl(text, bold)], borders: { top: border, bottom: border, left: border, right: border } });

/** يحافظ على وظيفة التصدير الموجودة، لكن يصدر القالب الموحد فقط. */
export function buildLessonPlanDocx(plan: LessonPlan): Document {
  const rows = getUnifiedLessonRows(plan);
  const metadata: [string, string][] = [
    ['المؤسسة', plan.institutionName], ['المستوى', plan.levelName], ['الكفاءة الختامية', plan.competencyTitle], ['الميدان', plan.fieldName],
    ['الهدف التعليمي', plan.sessionTitle], ['الأستاذ', plan.teacherName], ['المدة', `${plan.durationMinutes} دقيقة`], ['رقم الحصة', String(plan.sessionGlobalNumber || '—')], ['الوسائل', plan.equipmentNeeded.join('، ')]
  ];
  const metaTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: metadata.map(([label, value]) => new TableRow({ children: [cell(label, true), cell(value)] })) });
  const lessonTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ children: ['المراحل', 'محتوى التعلم', 'محتوى الإنجاز', 'الوقت', 'التوجيهات'].map((value) => cell(value, true)) }),
    ...rows.map((row) => new TableRow({ children: [cell(row.phase, true), cell(row.learningContent), cell(row.executionContent), cell(`${row.durationMinutes} د`), cell(row.guidance)] }))
  ] });
  return new Document({ sections: [{ children: [rtl('مذكرة الحصة', true), metaTable, lessonTable] }] });
}

function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
export async function exportLessonPlanToWord(plan: LessonPlan): Promise<void> { download(await Packer.toBlob(buildLessonPlanDocx(plan)), `مذكرة-${plan.sessionGlobalNumber || ''}.docx`); }

const escapeHtml = (text: string) => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function exportLessonPlanToPdf(plan: LessonPlan): void {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) return;
  const rows = getUnifiedLessonRows(plan);
  const metadata = [['المؤسسة', plan.institutionName], ['المستوى', plan.levelName], ['الكفاءة الختامية', plan.competencyTitle], ['الميدان', plan.fieldName], ['الهدف التعليمي', plan.sessionTitle], ['الأستاذ', plan.teacherName], ['المدة', `${plan.durationMinutes} دقيقة`], ['رقم الحصة', String(plan.sessionGlobalNumber || '—')], ['الوسائل', plan.equipmentNeeded.join('، ')]];
  printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مذكرة الحصة</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Tahoma,Arial,sans-serif;color:#111}h1{text-align:center;font-size:18px}table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px}th,td{border:1px solid #444;padding:7px;vertical-align:top}th{background:#e2e8f0}.meta th{width:14%;background:#f1f5f9}</style></head><body><h1>مذكرة الحصة</h1><table class="meta">${metadata.map(([l,v]) => `<tr><th>${escapeHtml(l)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table><table><thead><tr><th>المراحل</th><th>محتوى التعلم</th><th>محتوى الإنجاز</th><th>الوقت</th><th>التوجيهات</th></tr></thead><tbody>${rows.map((r) => `<tr><th>${escapeHtml(r.phase)}</th><td>${escapeHtml(r.learningContent)}</td><td>${escapeHtml(r.executionContent)}</td><td>${r.durationMinutes} د</td><td>${escapeHtml(r.guidance)}</td></tr>`).join('')}</tbody></table></body></html>`);
  printWindow.document.close(); printWindow.focus(); printWindow.print();
}
