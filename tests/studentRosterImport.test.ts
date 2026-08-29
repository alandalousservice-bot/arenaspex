import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  canonicalClassIdentityKey,
  extractEducationalGroupName,
  extractClassSection,
  normalizeExcelMatricule,
  parseStudentRosterWorkbook,
  rosterPreviewSummary,
} from '../src/services/studentRosterImport.service';

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
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ['الفوج التربوي : ثانية ابتدائي 1'],
      ['matricule', 'nom', 'prenom'],
      ['9', 'سالم', 'نور'],
    ]),
    'المستوى الثاني'
  );
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function singleSheetBuffer(rows: unknown[][], name = 'القائمة') {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('استيراد قوائم التلاميذ', () => {
  it('يستخرج اسم الفوج دون المادة أو الرموز اللاحقة', () => {
    expect(
      extractEducationalGroupName(
        'الفوج التربوي : رابعة إبتدائي 1 مادة : ت البدنية والرياضية 1400001 20253'
      )
    ).toBe('رابعة إبتدائي 1');
    expect(extractEducationalGroupName('الفوج التربوي: رابعة ابتدائي 1')).toBe('رابعة ابتدائي 1');
    expect(extractEducationalGroupName('الفوج التربوي : رابعة ابتدائي 1   مادة:')).toBe(
      'رابعة ابتدائي 1'
    );
  });

  it('يدعم استخراج أسماء الأقسام للمستويات من الأولى إلى الخامسة', () => {
    for (const grade of ['أولى', 'ثانية', 'ثالثة', 'رابعة', 'خامسة']) {
      expect(
        extractEducationalGroupName(`الفوج التربوي : ${grade} ابتدائي 1 مادة : ت البدنية`)
      ).toBe(`${grade} ابتدائي 1`);
    }
  });

  it('يتعرف على الرؤوس، المستويات، الأوراق المتعددة ويهمل العلامات والملاحظات', () => {
    const previews = parseStudentRosterWorkbook(workbookBuffer());
    expect(previews).toHaveLength(2);
    expect(previews[0].grade).toBe(1);
    expect(previews[1].grade).toBe(2);
    expect(previews[0].students[0]).toMatchObject({
      matricule: '1234567890123456',
      lastName: 'بن علي',
      firstName: 'أحمد',
      birthDate: '2018-01-02',
    });
    expect((previews[0].students[0] as any).score).toBeUndefined();
    expect((previews[0].students[0] as any).obs).toBeUndefined();
    expect(rosterPreviewSummary(previews)).toMatchObject({
      worksheets: 2,
      students: 3,
      invalidRows: 0,
    });
  });

  it('يحافظ على رقم التعريف الطويل كسلسلة نصية', () => {
    const preview = parseStudentRosterWorkbook(workbookBuffer())[0];
    expect(preview.students[0].matricule).toBe('1234567890123456');
    expect(typeof preview.students[0].matricule).toBe('string');
  });

  it('يحوّل العرض العلمي الآمن إلى أرقام عشرية قبل المعاينة', () => {
    expect(
      normalizeExcelMatricule({ t: 'n', v: 1101720000000000, w: '1.10172E+15', z: 'General' })
    ).toEqual({ value: '1101720000000000' });
    expect(normalizeExcelMatricule({ t: 's', v: '1.10172E+15' })).toEqual({
      value: '1101720000000000',
    });
  });

  it('لا يمرر أنماط العرض العلمي الإنتاجية إلى duplicate detection', () => {
    const productionPatterns = [
      '1.10172E+15',
      '1.10182E+15',
      '1.00162E+15',
      '1.10162E+15',
      '1.10152E+15',
      '1.00142E+15',
      '1.00172E+15',
      '1.00152E+15',
    ];
    for (const pattern of productionPatterns) {
      const result = normalizeExcelMatricule({ t: 's', v: pattern });
      expect(result.error).toBeUndefined();
      expect(result.value).toMatch(/^\d+$/);
    }
  });

  it('يرفض الرقم الرقمي الذي فقد دقته ولا يعامله كرقم تسجيل فارغ', () => {
    const result = normalizeExcelMatricule({
      t: 'n',
      v: 110172123456789010,
      w: '1.10172E+17',
      z: 'General',
    });
    expect(result.value).toBe('');
    expect(result.error).toContain('فقد دقته');
  });

  it('يضع الصف ذي الرقم الرقمي غير الآمن في المراجعة بدل استيراده', () => {
    const precisionLostNumericValue = JSON.parse('110172123456789012') as number;
    const preview = parseStudentRosterWorkbook(
      singleSheetBuffer([
        ['matricule', 'Nom', 'Prénom'],
        [1101720000000000, 'Benali', 'Mohamed'],
        [precisionLostNumericValue, 'Bouzid', 'Amine'],
      ])
    )[0];
    expect(preview.students).toHaveLength(1);
    expect(preview.students[0].matricule).toBe('1101720000000000');
    expect(preview.invalidRows).toHaveLength(1);
    expect(preview.invalidRows[0].matricule).toBe('');
    expect(preview.invalidRows[0].needsReview?.[0]).toContain('فقد دقته');
  });

  it('يطلب اختيار المستوى عند غياب بيانات المستوى', () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['matricule', 'nom', 'prenom'],
        ['1', 'لقب', 'اسم'],
      ]),
      'قائمة'
    );
    const preview = parseStudentRosterWorkbook(
      XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    )[0];
    expect(preview.needsGradeSelection).toBe(true);
  });

  it('يدعم الاسم واللقب بالعربية دون matricule ويستخرج القسم', () => {
    const preview = parseStudentRosterWorkbook(
      singleSheetBuffer([
        ['القسم: السنة الأولى أ'],
        ['الاسم واللقب'],
        ['محمد بن علي'],
        ['أمينة بوزيد'],
        [''],
      ])
    )[0];
    expect(preview.groupName).toBe('السنة الأولى أ');
    expect(preview.students).toHaveLength(2);
    expect(preview.students[0]).toMatchObject({
      firstName: 'محمد',
      lastName: 'بن علي',
      matricule: '',
    });
  });

  it('يدعم أعمدة اللقب والاسم العربية المنفصلة', () => {
    const preview = parseStudentRosterWorkbook(
      singleSheetBuffer([
        ['القسم', 'اللقب', 'الاسم'],
        ['السنة الثانية أ', 'قاسمي', 'ياسين'],
      ])
    )[0];
    expect(preview.students).toHaveLength(1);
    expect(preview.students[0]).toMatchObject({ lastName: 'قاسمي', firstName: 'ياسين' });
  });

  it('يستورد ثلاثة تلاميذ من قسم عربي واحد', () => {
    const preview = parseStudentRosterWorkbook(
      singleSheetBuffer([
        ['القسم: السنة الأولى أ'],
        ['matricule', 'اللقب', 'الاسم'],
        ['001', 'بن علي', 'محمد'],
        ['002', 'بوزيد', 'أمينة'],
        ['003', 'قاسمي', 'ياسين'],
      ])
    )[0];
    expect(preview.groupName).toBe('السنة الأولى أ');
    expect(preview.students).toHaveLength(3);
    expect(preview.students.map(({ firstName, lastName }) => `${firstName} ${lastName}`)).toEqual([
      'محمد بن علي',
      'أمينة بوزيد',
      'ياسين قاسمي',
    ]);
  });

  it('يدعم رؤوس الفرنسية مع التطبيع والاسم المركب', () => {
    const separate = parseStudentRosterWorkbook(
      singleSheetBuffer([
        ['Nom', 'Prénom'],
        ['Dupont', 'Jean'],
      ])
    )[0];
    const combined = parseStudentRosterWorkbook(
      singleSheetBuffer([['Nom & prénom'], ['Martin Claire']])
    )[0];
    expect(separate.students[0]).toMatchObject({ lastName: 'Dupont', firstName: 'Jean' });
    expect(combined.students[0]).toMatchObject({ lastName: 'Martin', firstName: 'Claire' });
  });

  it('يحافظ على الأوراق المتعددة، الأصفار البادئة، والصفوف الفارغة', () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['matricule', 'Nom', 'Prénom'],
        ['001245', 'Benali', 'Mohamed'],
        ['', '', ''],
      ]),
      'السنة الأولى أ'
    );
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['matricule', 'Nom', 'Prénom'],
        ['00009', 'Bouzid', 'Amine'],
      ]),
      'السنة الأولى ب'
    );
    const previews = parseStudentRosterWorkbook(
      XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    );
    expect(previews).toHaveLength(2);
    expect(previews.flatMap((preview) => preview.students)).toHaveLength(2);
    expect(previews[0].students[0].matricule).toBe('001245');
    expect(previews[1].students[0].matricule).toBe('00009');
  });

  it('يحافظ على هوية الأقسام العشرة ولا يسقط رقم الشعبة', () => {
    const classNames = [
      'أولى ابتدائي 1',
      'أولى ابتدائي 2',
      'ثانية ابتدائي 1',
      'ثانية ابتدائي 2',
      'ثالثة ابتدائي 1',
      'ثالثة ابتدائي 2',
      'رابعة ابتدائي 1',
      'رابعة ابتدائي 2',
      'خامسة ابتدائي 1',
      'خامسة ابتدائي 2',
    ];
    const book = XLSX.utils.book_new();
    classNames.forEach((className, index) => {
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['matricule', 'Nom', 'Prénom'],
          [`${index + 1}`, `لقب${index + 1}`, `اسم${index + 1}`],
        ]),
        className
      );
    });
    const previews = parseStudentRosterWorkbook(
      XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    );
    expect(previews).toHaveLength(10);
    expect(previews.map((preview) => preview.grade)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(previews.map((preview) => preview.section)).toEqual([
      '1',
      '2',
      '1',
      '2',
      '1',
      '2',
      '1',
      '2',
      '1',
      '2',
    ]);
    expect(new Set(previews.map((preview) => preview.groupName)).size).toBe(10);
    expect(
      new Set(
        previews.map((preview) =>
          canonicalClassIdentityKey(`lvl_p${preview.grade}`, preview.groupName)
        )
      ).size
    ).toBe(10);
  });

  it('يجمع 350 تلميذاً في عشرة أقسام دون دمج الشعب', () => {
    const classNames = [
      'أولى ابتدائي 1',
      'أولى ابتدائي 2',
      'ثانية ابتدائي 1',
      'ثانية ابتدائي 2',
      'ثالثة ابتدائي 1',
      'ثالثة ابتدائي 2',
      'رابعة ابتدائي 1',
      'رابعة ابتدائي 2',
      'خامسة ابتدائي 1',
      'خامسة ابتدائي 2',
    ];
    const book = XLSX.utils.book_new();
    classNames.forEach((className, classIndex) => {
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['matricule', 'Nom', 'Prénom'],
          ...Array.from({ length: 35 }, (_, studentIndex) => [
            `${classIndex + 1}${String(studentIndex + 1).padStart(2, '0')}`,
            `لقب${classIndex + 1}-${studentIndex + 1}`,
            `اسم${classIndex + 1}-${studentIndex + 1}`,
          ]),
        ]),
        className
      );
    });
    const previews = parseStudentRosterWorkbook(
      XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    );
    expect(previews).toHaveLength(10);
    expect(previews.reduce((total, preview) => total + preview.students.length, 0)).toBe(350);
    expect(previews.map((preview) => preview.students.length)).toEqual(Array(10).fill(35));
  });

  it('يطبع 01 و02 والأرقام العربية كمفاتيح 1 و2 متكافئة', () => {
    expect(extractClassSection('أولى ابتدائي 01')).toBe('1');
    expect(extractClassSection('أولى ابتدائي ٠٢')).toBe('2');
    expect(canonicalClassIdentityKey('lvl_p1', 'أولى ابتدائي 01')).toBe(
      canonicalClassIdentityKey('lvl_p1', 'أولى ابتدائي ١')
    );
  });
});
