import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CardSnapshot } from '../src/types/informationCard';
vi.mock('../src/server/prismaClient.js', () => ({ prisma: {} }));
vi.mock('react-dom', () => ({ createPortal: (children: React.ReactNode) => children }));
const { cardSaveSchema, missingCardFields } = await import('../src/server/informationCardService');
const { OfficialInformationCardPrint, safeCardPhoto } = await import('../src/components/informationCard/OfficialInformationCardPrint');
const snapshot: CardSnapshot = { identity: { id: 'T', firstName: 'أحمد', lastName: 'تجريبي', birthDate: '1990-01-01', email: 'synthetic@example.test', phone: '', avatar: '', institution: 'مدرسة اصطناعية', directorate: 'مديرية تجريبية', district: 'مقاطعة تجريبية', academicYear: '2026-2027' }, extra: { cadre: 'أستاذ', administrativeStatus: 'مرسم(ة)', qualifications: [] } };
describe('Information Card validation and official print contract', () => {
  it('accepts all official extra fields without duplicating canonical geography/email/photo', () => {
    expect(cardSaveSchema.safeParse({ revision: 0, identity: { firstName: 'أحمد', lastName: 'تجريبي', birthDate: '1990-01-01', phone: '' }, extra: { ...snapshot.extra, maidenSurname: '', supplementaryWorkplace: '', firstAppointmentDate: '', firstAppointmentNumber: '', financialVisaNumber: '', category: '', section: '', grade: '', effectiveDate: '', inspectionMark: '19.5', qualifications: [{ certificate: 'شهادة', issuer: 'جامعة', date: '2010-01-01' }] } }).success).toBe(true);
    expect(missingCardFields(snapshot)).toEqual([]);
  });
  it('rejects geographic/role/approval injection, invalid dates, marks and excessive qualifications', () => {
    const base = { revision: 0, identity: { firstName: 'أحمد', lastName: 'تجريبي', birthDate: '', phone: '' }, extra: snapshot.extra };
    for (const extra of [{ districtId: 'other' }, { role: 'admin' }, { inspectionMark: '-1' }, { inspectionMark: '20.1' }, { probationDate: '2026-02-30' }, { qualifications: Array.from({ length: 6 }, () => ({ certificate: '', issuer: '', date: '' })) }]) expect(cardSaveSchema.safeParse({ ...base, extra: { ...base.extra, ...extra } }).success).toBe(false);
    expect(missingCardFields({ ...snapshot, identity: { ...snapshot.identity, birthDate: '' } })).toContain('تاريخ الازدياد');
  });
  it('renders official labels, five qualification rows, photo/signature and blank missing values independently of digital UI', () => {
    vi.stubGlobal('document', { body: {} });
    const html = renderToStaticMarkup(<OfficialInformationCardPrint snapshot={snapshot} />);
    for (const label of ['الجمهورية الجزائرية الديمقراطية الشعبية', 'وزارة التربية الوطنية', 'بطاقة معلومات شخصية', 'اللقب الفتوة:', 'الوضعية الادارية:', 'تاريخ ورقم قرار اول تعيين في التعليم', 'رقم تأشيرة المراقب المالي', 'الشهادة', 'مصدرها', 'تاريخها', 'معلومات اخرى', 'التوقيع', 'ترفق هذه البطاقة بالتوزيع الأسبوعي.', 'صورة شمسية']) expect(html).toContain(label);
    expect((html.match(/<tr>/g) || [])).toHaveLength(6);
    expect(html).toContain('ic-photo'); expect(html).toContain('ic-signature');
    expect(html).not.toContain('غير محددة'); expect(html).not.toContain('سطيف');
    vi.unstubAllGlobals();
  });
  it('uses one-page A4 browser printing, excludes app chrome and rejects unsafe photo schemes', () => {
    const css = readFileSync('src/components/informationCard/informationCardPrint.css', 'utf8');
    expect(css).toContain('size: A4 portrait; margin: 0'); expect(css).toContain('width: 210mm; height: 297mm'); expect(css).toContain('body:has(.ic-print-root) > :not(.ic-print-root) { display: none !important; }');
    expect(safeCardPhoto('javascript:alert(1)')).toBe(''); expect(safeCardPhoto('data:text/html,unsafe')).toBe(''); expect(safeCardPhoto('https://example.test/photo.png')).not.toBe('');
  });
});
