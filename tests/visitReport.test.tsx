import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { assertReportComplete, validateReportContent } from '../src/server/visitReportService';
import { VisitReportPrintPages } from '../src/components/dashboard/inspector/VisitReportPrint';
import { DECISION_LABELS, GUIDANCE_SECTIONS, TENURE_LEGAL_TEXT, type ReportContext, type ReportContent, type ReportDocument } from '../src/types/visitReport';
const context: ReportContext = { teacher: { name: 'أستاذ اصطناعي', birthDate: '1990-01-02', birthPlace: 'مكان اصطناعي', qualification: 'شهادة اصطناعية' }, location: { school: 'مدرسة اصطناعية', directorate: 'مديرية اصطناعية', district: 'مقاطعة اصطناعية', municipality: 'بلدية اصطناعية' }, inspector: { id: 'A', name: 'مفتش اصطناعي' }, visit: { id: 'V', date: '2026-10-07', academicYear: '2026-2027', subject: 'التربية البدنية والرياضية', className: 'الثالثة', level: '3', pupilCount: 24, durationMinutes: 45 } };
function report(type: 'GUIDANCE' | 'TENURE', content: ReportContent = {}): ReportDocument { return { id: 'R', visitId: 'V', reportType: type, status: 'DRAFT', authorId: 'A', content, mark: null, revision: 0, finalSnapshot: null, finalizedAt: null, finalizedById: null, createdAt: '2026-10-07', updatedAt: '2026-10-07' }; }
const lesson = { level: '3', className: '3A', domain: 'الحركات القاعدية', objective: 'هدف اصطناعي' };
const tenure: ReportContent = { practicalLessons: [lesson], directorName: 'مدير', directorSchool: 'مدرسة', teacherMemberName: 'عضو', teacherMemberSchool: 'مدرسة', oralExamination: 'شفوي', culturalValue: 'ثقافة', pedagogicalValue: 'تربية', observations: 'ملاحظات', finalAssessment: 'تقدير', decision: 'POSTPONE' };
describe('official VisitReport content and print contract', () => {
  it('Guidance official independent domain and source sections persist; no invented headings/labels', () => {
    const content = Object.fromEntries(GUIDANCE_SECTIONS.flatMap((s) => s.fields.filter(([, , kind]) => kind !== 'number').map(([key]) => [key, 'نص اصطناعي'])));
    expect(validateReportContent('GUIDANCE', content)).toEqual(content);
    const html = renderToStaticMarkup(<VisitReportPrintPages report={report('GUIDANCE', { domain: 'ميدان مستقل', ...content })} context={context} />);
    for (const label of ['ظروف التفتيش', 'التدرج في التعلم ومراحل الحصة', 'دفتر اليومي', 'مراقبة أعمال التلاميذ', 'الإرشادات التربوية', 'التوجيهات التربوية', 'الخلاصة', 'بالأرقام']) expect(html).toContain(label);
    expect(html).toContain('الميدان'); expect(html).not.toContain('الميدان / موضوع الساعة'); expect(html).not.toContain('الجوانب البيداغوجية'); expect((html.match(/class="vr-page"/g) || [])).toHaveLength(2);
  });
  it.each([1, 2])('Tenure accepts %i PE practical lessons without scoring fields', (n) => {
    const content = { ...tenure, practicalLessons: Array.from({ length: n }, () => lesson) };
    expect(validateReportContent('TENURE', content)).toEqual(content); expect(() => assertReportComplete('TENURE', content, 0)).not.toThrow();
    const html = renderToStaticMarkup(<VisitReportPrintPages report={report('TENURE', content)} context={context} />);
    expect(html).toContain('التربية البدنية والرياضية'); expect(html).not.toContain('الدرس الأول في اللغة العربية'); expect(html).not.toContain('مواد الإيقاظ'); expect(html).not.toContain('/40'); expect((html.match(/class="vr-page"/g) || [])).toHaveLength(2); expect(html).toContain('vr-tenure-observations'); expect(html).toContain('الاختبار الشفوي');
  });
  it('Tenure incomplete drafts are allowed, finalization rejects zero lessons and absent final mark', () => {
    expect(validateReportContent('TENURE', {})).toEqual({}); expect(() => assertReportComplete('TENURE', { ...tenure, practicalLessons: [] }, 14)).toThrow(); expect(() => assertReportComplete('TENURE', tenure, null)).toThrow(); expect(() => validateReportContent('TENURE', { ...tenure, practicalLessons: [lesson, lesson, lesson] })).toThrow();
  });
  it.each(['score', 'mark', 'practicalMark', 'oralMark', 'total40'])('rejects invented %s fields and any per-lesson scores', (key) => {
    expect(() => validateReportContent('TENURE', { [key]: 16 })).toThrow(); expect(() => validateReportContent('TENURE', { practicalLessons: [{ ...lesson, [key]: 16 }] })).toThrow();
  });
  it.each(Object.keys(DECISION_LABELS))('committee %s decision remains explicit regardless of mark', (decision) => {
    const content = validateReportContent('TENURE', { ...tenure, decision }); expect(content.decision).toBe(decision); expect(() => assertReportComplete('TENURE', content, 0)).not.toThrow(); expect(content).not.toHaveProperty('calculatedMark');
  });
  it('null print mark stays blank; explicit zero prints; viewing print leaves the report draft', () => {
    const draft = report('GUIDANCE'); const before = JSON.stringify(draft); const empty = renderToStaticMarkup(<VisitReportPrintPages report={draft} context={context} />); expect(empty).not.toContain('16.5'); expect(JSON.stringify(draft)).toBe(before); expect(draft.status).toBe('DRAFT');
    const zero = renderToStaticMarkup(<VisitReportPrintPages report={{ ...draft, mark: 0 }} context={context} />); expect(zero).toContain('بالأرقام:</b><span>0</span>');
  });
  it('FINAL print resolves frozen identity/content/mark/legal text rather than current mutable values', () => {
    const final = { ...report('TENURE', tenure), status: 'FINAL' as const, mark: 20, finalSnapshot: { context, content: tenure, mark: 0, legalText: TENURE_LEGAL_TEXT, sourceVersion: '1' } };
    const html = renderToStaticMarkup(<VisitReportPrintPages report={final} context={{ ...context, teacher: { name: 'CHANGED_PRIVATE_PROFILE' } }} />); expect(html).toContain('أستاذ اصطناعي'); expect(html).not.toContain('CHANGED_PRIVATE_PROFILE'); expect(html).toContain('0 /20'); expect(html).toContain('820/و.ت.و/أ.خ.و/'); expect(html).toContain('قرار السيد مدير التربية');
  });
});
