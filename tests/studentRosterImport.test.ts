import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { extractEducationalGroupName, parseStudentRosterWorkbook, rosterPreviewSummary } from '../src/services/studentRosterImport.service';

function workbookBuffer() {
  const rows = [
    ['الجمهورية الجزائرية', '', '', ''],
    ['الفوج التربوي : أولى ابتدائي 1', '', '', ''],
    ['الفصل الأول 2025/2026', '', '', ''],
    ['matricule', 'nom', 'prenom', 'date_n', '00', 'obs'],
    ['رقم التعريف', 'اللقب', 'الاسم', 'تاريخ الميلاد', 'العلامة', 'الملاحظات'],
    ['1234567890123456', 'بن علي', 'أحمد', '2018-01-02', 18, 'جيد'],
    ['0000000000000007', 'قاسم', 'ليلى', '02/03/2017', 16, ''],
    ['', '', '', '', '', ''],
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Feuil1');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['الفوج التربوي : ثانية ابتدائي 1'], ['matricule', 'nom', 'prenom'], ['9', 'سالم', 'نور']
  ]), 'المستوى الثاني');
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('استيراد قوائم التلاميذ', () => {
  it('يستخرج اسم الفوج دون المادة أو الرموز اللاحقة', () => {
    expect(extractEducationalGroupName('الفوج التربوي : رابعة إبتدائي 1 مادة : ت البدنية والرياضية 1400001 20253')).toBe('رابعة إبتدائي 1');
    expect(extractEducationalGroupName('الفوج التربوي: رابعة ابتدائي 1')).toBe('رابعة ابتدائي 1');
    expect(extractEducationalGroupName('الفوج التربوي : رابعة ابتدائي 1   مادة:')).toBe('رابعة ابتدائي 1');
  });

  it('يدعم استخراج أسماء الأقسام للمستويات من الأولى إلى الخامسة', () => {
    for (const grade of ['أولى', 'ثانية', 'ثالثة', 'رابعة', 'خامسة']) {
      expect(extractEducationalGroupName(`الفوج التربوي : ${grade} ابتدائي 1 مادة : ت البدنية`)).toBe(`${grade} ابتدائي 1`);
    }
  });

  it('يتعرف على الرؤوس، المستويات، الأوراق المتعددة ويهمل العلامات والملاحظات', () => {
    const previews = parseStudentRosterWorkbook(workbookBuffer());
    expect(previews).toHaveLength(2);
    expect(previews[0].grade).toBe(1);
    expect(previews[1].grade).toBe(2);
    expect(previews[0].students[0]).toMatchObject({ matricule: '1234567890123456', lastName: 'بن علي', firstName: 'أحمد', birthDate: '2018-01-02' });
    expect((previews[0].students[0] as any).score).toBeUndefined();
    expect((previews[0].students[0] as any).obs).toBeUndefined();
    expect(rosterPreviewSummary(previews)).toMatchObject({ worksheets: 2, students: 3, invalidRows: 0 });
  });

  it('يحافظ على رقم التعريف الطويل كسلسلة نصية', () => {
    const preview = parseStudentRosterWorkbook(workbookBuffer())[0];
    expect(preview.students[0].matricule).toBe('1234567890123456');
    expect(typeof preview.students[0].matricule).toBe('string');
  });

  it('يطلب اختيار المستوى عند غياب بيانات المستوى', () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['matricule', 'nom', 'prenom'], ['1', 'لقب', 'اسم']]), 'قائمة');
    const preview = parseStudentRosterWorkbook(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer)[0];
    expect(preview.needsGradeSelection).toBe(true);
  });
});
