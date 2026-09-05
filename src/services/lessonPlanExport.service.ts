import { LessonPlan } from '../types/spex';
import { generateLessonMemoDocument, LessonMemoDocument } from './lessonPlan.generator.service';

export async function exportLessonPlanToWord(plan: LessonPlan): Promise<void> {
  const { exportLessonPlanToWord: exportWord } = await import('./lessonPlanWordExport.service');
  await exportWord(plan);
}

export function renderLessonMemoHtml(model: LessonMemoDocument): string {
  const escape = (text: string) =>
    (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const metadata: [string, string][] = [
    ['المؤسسة', model.header.institution],
    ['المستوى', model.header.grade],
    ['الميدان', model.header.field],
    ['الوسائل', model.header.equipment.join(' – ')],
  ];
  const prep = model.preparatoryPhase;
  const final = model.finalPhase;
  const situationRows = model.mainPhase.situations
    .map(
      (situation, index) =>
        `<tr class="main-row">${index === 0 ? `<th rowspan="${model.mainPhase.situations.length}" class="phase-main">المرحلة الرئيسية</th><td rowspan="${model.mainPhase.situations.length}" class="learning-main">${escape(model.mainPhase.learningContent)}</td>` : ''}<td class="execution situation"><strong>الموقف ${String(situation.number).padStart(2, '0')}</strong><br>${escape(situation.executionContent)}</td><td>${situation.durationMinutes} د</td><td>${escape(situation.guidance)}</td></tr>`
    )
    .join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مذكرة حصة تعلمية</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#0f172a;font-family:Tajawal,Tahoma,Arial,sans-serif;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{background:#fff;border-top:8px solid #0284c7;padding:16px;box-shadow:0 12px 30px #0f172a1a}.top{display:flex;align-items:center;justify-content:space-between}.badge{background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;border-radius:999px;padding:6px 14px;font-weight:800}.title{text-align:center;flex:1}.title h1{margin:0;color:#0f766e;font-size:22px}.title p{margin:2px 0;color:#475569}.meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:13px 0}.meta div{display:grid;grid-template-columns:9rem 1fr;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden}.meta strong{background:#f0f9ff;color:#0369a1;padding:6px}.meta span{padding:6px;background:#fff}.competency{background:#eef2ff;border:1px solid #c7d2fe;border-right:5px solid #4338ca;padding:8px;margin:7px 0}.objective{background:#fdf2f8;border:1px solid #fbcfe8;border-right:5px solid #be185d;padding:8px;margin:7px 0}.label{font-weight:800}.memo{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}.memo th,.memo td{border:1px solid #94a3b8;padding:7px;vertical-align:top}.memo thead th{background:#1e293b;color:#fff}.phase-prep{background:#dbeafe;color:#1e40af}.phase-main{background:#fed7aa;color:#7c2d12}.learning-main{background:#fffaf3}.phase-final{background:#dcfce7;color:#166534}.main-row{background:#fffaf3}.situation strong{color:#9a3412}.footer{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.signature{border:1px solid #a7f3d0;background:#ecfdf5;color:#047857;border-radius:8px;padding:10px;font-weight:800;min-height:42px}.signature.inspector{background:#fffbeb;border-color:#fcd34d;color:#b45309}tr{page-break-inside:avoid}@media screen and (max-width:700px){body{background:#fff}.sheet{padding:10px;box-shadow:none}.meta{grid-template-columns:1fr}.memo{font-size:10px}.memo th,.memo td{padding:5px}}</style></head><body><main class="sheet"><div class="top"><div class="badge">الحصة ${escape(model.header.sessionNumber)}</div><div class="title"><h1>مذكرة حصة تعلمية</h1><p>التربية البدنية والرياضية</p></div><div class="badge">${escape(model.header.durationMinutes.toString())} دقيقة</div></div><div class="meta">${metadata.map(([label, value]) => `<div><strong>${escape(label)}</strong><span>${escape(value)}</span></div>`).join('')}</div><div class="competency"><span class="label">الكفاءة الختامية:</span> ${escape(model.header.competency)}</div><div class="objective"><span class="label">الهدف التعليمي:</span> ${escape(model.header.objective)}</div><table class="memo"><thead><tr><th>المراحل</th><th>محتوى التعلم</th><th>محتوى الإنجاز</th><th>الوقت</th><th>التوجيهات</th></tr></thead><tbody><tr><th class="phase-prep">المرحلة التحضيرية</th><td>${escape(prep.learningContent)}</td><td>${escape(prep.executionContent)}</td><td>${prep.durationMinutes} د</td><td>${escape(prep.guidance)}</td></tr>${situationRows}<tr><th class="phase-final">المرحلة الختامية</th><td>${escape(final.learningContent)}</td><td>${escape(final.executionContent)}</td><td>${final.durationMinutes} د</td><td>${escape(final.guidance)}</td></tr></tbody></table><div class="footer"><div class="signature inspector">المفتش: ${escape(model.signatures.inspectorName)}</div><div class="signature">الأستاذ: ${escape(model.signatures.teacherName)}</div></div></main></body></html>`;
}

export function exportLessonPlanToPdf(plan: LessonPlan): void {
  const printWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!printWindow) return;
  const compactPrintCss =
    '<style>.sheet{padding:12px}.meta{gap:5px;margin:8px 0}.meta strong,.meta span{padding:4px 6px}.competency,.objective{padding:6px;margin:4px 0}.memo{margin-top:8px}.footer{margin-top:10px;gap:8px;padding-top:8px;page-break-inside:avoid}.signature{padding:8px;min-height:36px}</style>';
  printWindow.document.write(
    renderLessonMemoHtml(generateLessonMemoDocument(plan)).replace(
      '</head>',
      `${compactPrintCss}</head>`
    )
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
