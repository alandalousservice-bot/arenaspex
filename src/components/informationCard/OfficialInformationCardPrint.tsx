import React, { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CardSnapshot } from '../../types/informationCard';
import './informationCardPrint.css';

export const safeCardPhoto = (value: string) => /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(value) ? value : '';
const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
export function OfficialInformationCardPrint({ snapshot, onClose }: { snapshot: CardSnapshot; onClose?: () => void }) {
  const fit = () => {
    document.querySelectorAll<HTMLElement>('.ic-fill, .ic-cell-value, .ic-other').forEach((element) => {
      let size = Number.parseFloat(getComputedStyle(element).fontSize);
      while ((element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1) && size > 8) { size -= .5; element.style.fontSize = `${size}px`; }
    });
  };
  useLayoutEffect(() => { void document.fonts.ready.then(fit); }, [snapshot]);
  const printPage = async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.ic-photo img')).map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); })));
    fit(); window.print();
  };
  const { identity: person, extra } = snapshot;
  const value = (key: string) => typeof extra[key] === 'string' ? String(extra[key]) : '';
  const fill = (text: string, date = false) => <span className="ic-fill">{date ? displayDate(text) : text}</span>;
  const line = (label: string, text: string, date = false) => <div className="ic-line"><b>{label}</b>{fill(text, date)}</div>;
  const box = (top: number, label: string, text: string, date = false) => <div className="ic-box" style={{ top: `${top}mm` }}><b>{label}</b>{fill(text, date)}</div>;
  return createPortal(<div className="ic-print-root" dir="rtl">
    <div className="ic-print-actions"><button onClick={() => void printPage()}>طباعة بطاقة المعلومات</button>{onClose && <button onClick={onClose}>إغلاق المعاينة</button>}</div>
    <article className="ic-official-page" aria-label="بطاقة معلومات شخصية - الاستمارة الرسمية">
      <header className="ic-government"><b>الجمهورية الجزائرية الديمقراطية الشعبية</b><br /><b>وزارة التربية الوطنية</b></header>
      <div className="ic-directorate"><b>{person.directorate}</b><br /><b>مفتشية التعليم الابتدائي التربية البدنية والرياضية</b><br /><b>{person.district}</b></div>
      <div className="ic-year"><b>السنة الدراسية</b><span>{person.academicYear.replace('-', ' / ')}</span></div>
      <h1 className="ic-title">بطاقة معلومات شخصية</h1>
      <div className="ic-photo">{safeCardPhoto(person.avatar) && <img src={safeCardPhoto(person.avatar)} alt="" />}</div>
      <div className="ic-personal">
        <div className="ic-line"><b>اللقب :</b>{fill(person.lastName)}<b>اللقب الفتوة:</b>{fill(value('maidenSurname'))}</div>
        {line('الاسم :', person.firstName)}
        <div className="ic-line"><b>تاريخ و مكان الازدياد:</b>{fill([displayDate(person.birthDate), value('birthPlace')].filter(Boolean).join(' - '))}<b>الولاية:</b>{fill(value('birthWilaya'))}</div>
        {line('الحالة العائلية:', value('maritalStatus'))}{line('الإطار :', value('cadre'))}
        {line('مكان العمل:( المؤسسة الام)', person.institution)}{line('مكان العمل: (تكملة نصاب)', value('supplementaryWorkplace'))}
        <div className="ic-line"><b>تاريخ التعيين بالمؤسسة :</b>{fill(value('institutionAppointmentDate'), true)}<b>رقم التعيين :</b>{fill(value('appointmentNumber'))}</div>
        <div className="ic-status"><b>الوضعية الادارية:</b>{['مرسم(ة)', 'متربص(ة)', 'متعاقد(ة)', 'مستخلف(ة)'].map((status) => <span key={status} className={value('administrativeStatus') === status ? 'ic-selected' : ''}>{status}</span>)}</div>
        <div className="ic-address">{line('العنوان الشخصي:', value('address'))}{line('رقم الهاتف :', person.phone)}</div>
      </div>
      {box(85, 'تاريخ ورقم قرار اول تعيين في التعليم', [displayDate(value('firstAppointmentDate')), value('firstAppointmentNumber')].filter(Boolean).join(' / '))}
      {box(102, 'تاريخ اول تنصيب', value('firstInstallationDate'), true)}
      {box(119, 'رقم تأشيرة المراقب المالي', value('financialVisaNumber'))}
      {box(135.5, 'تاريخ التربص', value('probationDate'), true)}
      {box(152.2, 'تاريخ الترسيم', value('tenureDate'), true)}
      <div className="ic-box ic-classification"><div className="ic-line"><b>الصنف :</b>{fill(value('category'))}<b>القسم :</b>{fill(value('section'))}</div>{line('الدرجة:', value('grade'))}{line('تاريخ السريان :', value('effectiveDate'), true)}</div>
      <div className="ic-box ic-inspection">{line('تاريخ آخر تفتيش :', value('lastInspectionDate'), true)}<div className="ic-line"><b>النقطة :</b>{fill(value('inspectionMark'))}<b>/ 20</b></div></div>
      <h2 className="ic-qualification-title">المؤهلات</h2>
      <table className="ic-qualifications"><thead><tr><th>الشهادة</th><th>مصدرها</th><th>تاريخها</th></tr></thead><tbody>{Array.from({ length: 5 }, (_, index) => { const row = extra.qualifications[index]; return <tr key={index}><td><span className="ic-cell-value">{row?.certificate || ''}</span></td><td><span className="ic-cell-value">{row?.issuer || ''}</span></td><td><span className="ic-cell-value">{displayDate(row?.date || '')}</span></td></tr>; })}</tbody></table>
      <div className="ic-emails">{line('البريد الالكتروني للمؤسسة:', value('institutionEmail'))}{line('البريد الالكتروني الخاص :', person.email)}</div>
      <h2 className="ic-other-title">معلومات اخرى</h2><div className="ic-other">{value('otherInformation')}</div>
      <div className="ic-signature-date">{fill(value('signaturePlace'))}<b>في :</b>{fill(value('signatureDate'), true)}</div>
      <div className="ic-note"><b>ملاحظة :</b><br /><b>ترفق هذه البطاقة بالتوزيع الأسبوعي.</b><br /><b>صورة شمسية</b></div>
      <b className="ic-signature">التوقيع</b>
    </article>
  </div>, document.body);
}
