/**
 * SPEX - Lesson Plan Export Service
 * تصدير مذكرة الحصة البيداغوجية إلى ملف Word حقيقي (.docx) أو PDF (عبر معاينة طباعة منسقة)
 * يعتمد على بيانات LessonPlan الحالية مباشرة دون تكرار بيانات المنهاج.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle
} from 'docx';
import { LessonPlan } from '../types/spex';

// -----------------------------------------------------------------------
// Word (.docx) Export — دعم كامل للعربية واتجاه الكتابة من اليمين لليسار
// -----------------------------------------------------------------------

function rtlParagraph(text: string, opts: { bold?: boolean; size?: number; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; color?: string } = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    heading: opts.heading,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size,
        color: opts.color,
        rightToLeft: true
      })
    ]
  });
}

function sectionTitle(text: string) {
  return rtlParagraph(text, { bold: true, size: 26, heading: HeadingLevel.HEADING_2, color: '1D4ED8' });
}

function bulletList(items: string[]) {
  if (!items || items.length === 0) return [rtlParagraph('—')];
  return items.map(
    (item) =>
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        bullet: { level: 0 },
        children: [new TextRun({ text: item, rightToLeft: true, size: 22 })]
      })
  );
}

function infoTable(rows: [string, string][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' }
    },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { fill: 'EFF6FF' },
              children: [rtlParagraph(label, { bold: true, size: 20 })]
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [rtlParagraph(value || '—', { size: 20 })]
            })
          ]
        })
    )
  });
}

export function buildLessonPlanDocx(lp: LessonPlan): Document {
  const children: (Paragraph | Table)[] = [];

  children.push(
    rtlParagraph('مذكرة الحصة البيداغوجية', { bold: true, size: 32, heading: HeadingLevel.TITLE, color: '1E3A8A' }),
    rtlParagraph(`${lp.fieldName} — ${lp.sessionTitle}`, { size: 22, color: '475569' })
  );

  children.push(
    infoTable([
      ['المؤسسة', lp.institutionName],
      ['الأستاذ', lp.teacherName],
      ['المفتش', lp.inspectorName || '—'],
      ['المستوى / القسم', `${lp.levelName} — ${lp.className}`],
      ['التاريخ', lp.date],
      ['المدة الزمنية', `${lp.durationMinutes} دقيقة`],
      ['نوع الحصة', lp.sessionTypeNumber || lp.sessionType],
      ['المرجع في التوزيع السنوي', lp.annualSessionRef || '—'],
      ['الكفاءة الختامية للميدان', lp.competencyTitle],
      ['المقطع التعليمي', lp.segmentTitle]
    ])
  );

  children.push(sectionTitle('الأهداف'));
  children.push(rtlParagraph('الهدف العام للحصة:', { bold: true, size: 22 }));
  children.push(rtlParagraph(lp.generalObjective, { size: 22 }));
  children.push(
    ...([
      ['الهدف الحركي / المهاري', lp.proceduralObjectives.motor],
      ['الهدف المعرفي', lp.proceduralObjectives.cognitive],
      ['الهدف الوجداني', lp.proceduralObjectives.affective],
      ['الهدف التواصلي', lp.proceduralObjectives.communication],
      ['الهدف الشخصي والاجتماعي', lp.proceduralObjectives.personalSocial]
    ] as [string, string | undefined][])
      .filter(([, v]) => v)
      .map(([label, v]) => rtlParagraph(`${label}: ${v}`, { size: 20 }))
  );

  children.push(sectionTitle('الوسائل والتجهيزات'));
  children.push(...bulletList(lp.equipmentNeeded));

  children.push(sectionTitle('المرحلة التحضيرية (الإحماء)'));
  children.push(rtlParagraph(`المدة: ${lp.warmupPhase.duration}`, { bold: true, size: 20 }));
  if (lp.warmupPhase.pedagogicalWarmupGame?.title) {
    children.push(rtlParagraph(`اللعبة التربوية: ${lp.warmupPhase.pedagogicalWarmupGame.title}`, { size: 20 }));
    children.push(rtlParagraph(lp.warmupPhase.pedagogicalWarmupGame.rules, { size: 20 }));
  }
  children.push(rtlParagraph(`الإحماء العام: ${lp.warmupPhase.generalWarmup}`, { size: 20 }));
  children.push(rtlParagraph(`الإحماء الخاص: ${lp.warmupPhase.specificWarmup}`, { size: 20 }));
  children.push(rtlParagraph(`التوجيه والتنظيم: ${lp.warmupPhase.organization}`, { size: 20 }));

  children.push(sectionTitle('المرحلة الرئيسية (التعلمية)'));
  children.push(rtlParagraph(`المدة: ${lp.mainPhase.duration}`, { bold: true, size: 20 }));
  children.push(rtlParagraph(`الوضعية المشكلة: ${lp.mainPhase.problemSituation}`, { size: 20 }));
  [lp.mainPhase.learningSituation1, lp.mainPhase.learningSituation2].forEach((sit, i) => {
    children.push(rtlParagraph(`الموقف التعلمي ${i + 1}: ${sit.title}`, { bold: true, size: 20 }));
    children.push(rtlParagraph(sit.description, { size: 20 }));
    children.push(rtlParagraph(`الجرعة: ${sit.dosing} — معيار النجاح: ${sit.criteria}`, { size: 20, color: '475569' }));
  });
  children.push(rtlParagraph(`التطبيق الموجه: ${lp.mainPhase.guidedApplication.title}`, { bold: true, size: 20 }));
  children.push(rtlParagraph(lp.mainPhase.guidedApplication.description, { size: 20 }));

  children.push(sectionTitle('المرحلة الختامية (الرجوع للهدوء)'));
  children.push(rtlParagraph(`المدة: ${lp.coolDownPhase.duration}`, { bold: true, size: 20 }));
  children.push(rtlParagraph(`الأنشطة: ${lp.coolDownPhase.activities}`, { size: 20 }));
  children.push(rtlParagraph(`التقييم والحوار: ${lp.coolDownPhase.assessmentAndDialogue}`, { size: 20 }));

  children.push(sectionTitle('قواعد الأمن والسلامة'));
  children.push(...bulletList(lp.safetyRules));

  if (lp.teacherNotes || lp.executionNote) {
    children.push(sectionTitle('ملاحظات الأستاذ'));
    if (lp.teacherNotes) children.push(rtlParagraph(lp.teacherNotes, { size: 20 }));
    if (lp.executionNote) children.push(rtlParagraph(`ملاحظة التنفيذ: ${lp.executionNote}`, { size: 20, color: '92400E' }));
  }

  return new Document({
    sections: [{ properties: {}, children }]
  });
}

export async function exportLessonPlanToWord(lp: LessonPlan): Promise<void> {
  const doc = buildLessonPlanDocx(lp);
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `مذكرة-${sanitizeFileName(lp.sessionTitle)}.docx`);
}

// -----------------------------------------------------------------------
// PDF Export — نافذة معاينة مطبعية منسقة بالكامل، يحفظها المستخدم كـ PDF
// عبر مربع طباعة المتصفح (يضمن دعماً كاملاً وسليماً للعربية RTL دون تعقيد مكتبات الخطوط)
// -----------------------------------------------------------------------

export function exportLessonPlanToPdf(lp: LessonPlan): void {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لتصدير المذكرة كملف PDF.');
    return;
  }

  const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const list = (items: string[]) => `<ul>${(items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>مذكرة الحصة - ${esc(lp.sessionTitle)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; line-height: 1.6; }
  h1 { font-size: 20px; color: #1e3a8a; margin-bottom: 4px; }
  h2 { font-size: 15px; color: #1d4ed8; border-bottom: 2px solid #dbeafe; padding-bottom: 4px; margin-top: 22px; }
  .subtitle { color: #475569; font-size: 13px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12.5px; }
  td { border: 1px solid #e2e8f0; padding: 6px 10px; vertical-align: top; }
  td.label { background: #eff6ff; font-weight: bold; width: 28%; }
  ul { margin: 4px 0; padding-inline-start: 22px; }
  .phase-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; }
  .muted { color: #64748b; font-size: 12px; }
  .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; }
</style>
</head>
<body>
  <h1>مذكرة الحصة البيداغوجية</h1>
  <div class="subtitle">${esc(lp.fieldName)} — ${esc(lp.sessionTitle)}</div>

  <table>
    <tr><td class="label">المؤسسة</td><td>${esc(lp.institutionName)}</td><td class="label">التاريخ</td><td>${esc(lp.date)}</td></tr>
    <tr><td class="label">الأستاذ</td><td>${esc(lp.teacherName)}</td><td class="label">المدة</td><td>${lp.durationMinutes} دقيقة</td></tr>
    <tr><td class="label">المستوى / القسم</td><td>${esc(lp.levelName)} — ${esc(lp.className)}</td><td class="label">نوع الحصة</td><td>${esc(lp.sessionTypeNumber || lp.sessionType)}</td></tr>
    <tr><td class="label">الكفاءة الختامية</td><td colspan="3">${esc(lp.competencyTitle)}</td></tr>
    <tr><td class="label">المقطع التعليمي</td><td colspan="3">${esc(lp.segmentTitle)}</td></tr>
  </table>

  <h2>الأهداف</h2>
  <p><strong>الهدف العام:</strong> ${esc(lp.generalObjective)}</p>
  <ul>
    ${lp.proceduralObjectives.motor ? `<li><strong>حركي:</strong> ${esc(lp.proceduralObjectives.motor)}</li>` : ''}
    ${lp.proceduralObjectives.cognitive ? `<li><strong>معرفي:</strong> ${esc(lp.proceduralObjectives.cognitive)}</li>` : ''}
    ${lp.proceduralObjectives.affective ? `<li><strong>وجداني:</strong> ${esc(lp.proceduralObjectives.affective)}</li>` : ''}
    ${lp.proceduralObjectives.communication ? `<li><strong>تواصلي:</strong> ${esc(lp.proceduralObjectives.communication)}</li>` : ''}
    ${lp.proceduralObjectives.personalSocial ? `<li><strong>شخصي واجتماعي:</strong> ${esc(lp.proceduralObjectives.personalSocial)}</li>` : ''}
  </ul>

  <h2>الوسائل والتجهيزات</h2>
  ${list(lp.equipmentNeeded)}

  <h2>المرحلة التحضيرية (الإحماء)</h2>
  <div class="phase-block">
    <div class="muted">المدة: ${esc(lp.warmupPhase.duration)}</div>
    ${lp.warmupPhase.pedagogicalWarmupGame?.title ? `<p><strong>اللعبة التربوية:</strong> ${esc(lp.warmupPhase.pedagogicalWarmupGame.title)} — ${esc(lp.warmupPhase.pedagogicalWarmupGame.rules)}</p>` : ''}
    <p><strong>الإحماء العام:</strong> ${esc(lp.warmupPhase.generalWarmup)}</p>
    <p><strong>الإحماء الخاص:</strong> ${esc(lp.warmupPhase.specificWarmup)}</p>
    <p><strong>التوجيه والتنظيم:</strong> ${esc(lp.warmupPhase.organization)}</p>
  </div>

  <h2>المرحلة الرئيسية (التعلمية)</h2>
  <div class="phase-block">
    <div class="muted">المدة: ${esc(lp.mainPhase.duration)}</div>
    <p><strong>الوضعية المشكلة:</strong> ${esc(lp.mainPhase.problemSituation)}</p>
    <p><strong>الموقف 1 — ${esc(lp.mainPhase.learningSituation1.title)}:</strong> ${esc(lp.mainPhase.learningSituation1.description)}<br/>
    <span class="muted">الجرعة: ${esc(lp.mainPhase.learningSituation1.dosing)} — معيار النجاح: ${esc(lp.mainPhase.learningSituation1.criteria)}</span></p>
    <p><strong>الموقف 2 — ${esc(lp.mainPhase.learningSituation2.title)}:</strong> ${esc(lp.mainPhase.learningSituation2.description)}<br/>
    <span class="muted">الجرعة: ${esc(lp.mainPhase.learningSituation2.dosing)} — معيار النجاح: ${esc(lp.mainPhase.learningSituation2.criteria)}</span></p>
    <p><strong>التطبيق الموجه — ${esc(lp.mainPhase.guidedApplication.title)}:</strong> ${esc(lp.mainPhase.guidedApplication.description)}</p>
  </div>

  <h2>المرحلة الختامية</h2>
  <div class="phase-block">
    <div class="muted">المدة: ${esc(lp.coolDownPhase.duration)}</div>
    <p><strong>الأنشطة:</strong> ${esc(lp.coolDownPhase.activities)}</p>
    <p><strong>التقييم والحوار:</strong> ${esc(lp.coolDownPhase.assessmentAndDialogue)}</p>
  </div>

  <h2>قواعد الأمن والسلامة</h2>
  ${list(lp.safetyRules)}

  ${lp.teacherNotes || lp.executionNote ? `<h2>ملاحظات الأستاذ</h2>
  <div class="note">
    ${lp.teacherNotes ? `<p>${esc(lp.teacherNotes)}</p>` : ''}
    ${lp.executionNote ? `<p><strong>ملاحظة التنفيذ:</strong> ${esc(lp.executionNote)}</p>` : ''}
  </div>` : ''}

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function sanitizeFileName(name: string): string {
  return (name || 'مذكرة-حصة').replace(/[\\/:*?"<>|]/g, '').slice(0, 60).trim() || 'مذكرة-حصة';
}
