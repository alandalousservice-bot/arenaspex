import * as XLSX from 'xlsx';

export interface ParsedRosterStudent {
  matricule: string;
  lastName: string;
  firstName: string;
  birthDate?: string;
  grade?: number;
  groupName?: string;
  schoolYear?: string;
  rowNumber: number;
  needsReview?: string[];
}

export interface RosterWorksheetPreview {
  worksheet: string;
  grade?: number;
  groupName?: string;
  needsGradeSelection: boolean;
  students: ParsedRosterStudent[];
  invalidRows: ParsedRosterStudent[];
}

const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const compact = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

const gradePatterns: Array<[number, RegExp]> = [
  [1, /(الأولى|أولى|اولى|premi[eè]re|1\s*ap|1[eè]re)/i],
  [2, /(الثانية|ثانية|ثانيه|deuxi[eè]me|2\s*ap)/i],
  [3, /(الثالثة|ثالثة|ثالثه|troisi[eè]me|3\s*ap)/i],
  [4, /(الرابعة|رابعة|رابعه|quatri[eè]me|4\s*ap)/i],
  [5, /(الخامسة|خامسة|خامسه|cinqui[eè]me|5\s*ap)/i],
];

function detectGrade(values: unknown[]): number | undefined {
  const text = values.map(compact).filter(Boolean).join(' ');
  return gradePatterns.find(([, pattern]) => pattern.test(text))?.[0];
}

export function extractEducationalGroupName(value: unknown): string | undefined {
  const text = compact(value).replace(/\s+/g, ' ');
  if (!text) return undefined;
  const marker = text.match(/(?:الفوج\s*التربوي|groupe\s*p[ée]dagogique|group[eé])\s*[:：-]?\s*/i);
  if (!marker || marker.index === undefined) return undefined;
  const remainder = text.slice(marker.index + marker[0].length);
  const stop = remainder.search(/\s+(?:مادة|المادة|الفصل|السنة\s*الدراسية)\s*[:：-]?\s*/i);
  const group = (stop >= 0 ? remainder.slice(0, stop) : remainder).trim();
  return group || undefined;
}

function detectGroup(values: unknown[]): string | undefined {
  for (const value of values) {
    const group = extractEducationalGroupName(value);
    if (group) return group;
  }
  return undefined;
}

function findColumn(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.some((name) => normalize(header) === normalize(name)));
}

function normalizeMatricule(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return compact(value).replace(/\.0$/, '');
}

function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = compact(value);
  if (!text) return undefined;
  const iso = text.match(/^(\d{4})[-/]([01]?\d)[-/]([0-3]?\d)/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const dmy = text.match(/^([0-3]?\d)[\/-]([01]?\d)[\/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return undefined;
}

export function parseStudentRosterWorkbook(input: Buffer | Uint8Array): RosterWorksheetPreview[] {
  const workbook = XLSX.read(input, { type: 'buffer', cellDates: true, cellNF: false, cellText: true, bookVBA: false });
  return workbook.SheetNames.map((worksheet) => {
    const sheet = workbook.Sheets[worksheet];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalize);
      return findColumn(headers, ['matricule', 'رقم التعريف', 'رقم التسجيل', 'registration number']) >= 0 &&
        findColumn(headers, ['nom', 'اللقب', 'family name', 'last name']) >= 0 &&
        findColumn(headers, ['prenom', 'prénom', 'الاسم', 'first name']) >= 0;
    });
    if (headerIndex < 0) return { worksheet, needsGradeSelection: true, students: [], invalidRows: [] };
    const headers = rows[headerIndex].map(normalize);
    const matriculeIndex = findColumn(headers, ['matricule', 'رقم التعريف', 'رقم التسجيل', 'registration number']);
    const lastNameIndex = findColumn(headers, ['nom', 'اللقب', 'family name', 'last name']);
    const firstNameIndex = findColumn(headers, ['prenom', 'prénom', 'الاسم', 'first name']);
    const birthDateIndex = findColumn(headers, ['date_n', 'date naissance', 'تاريخ الميلاد', 'birth date']);
    const metadata = rows.slice(0, headerIndex).flat();
    const grade = detectGrade(metadata) || detectGrade([worksheet]);
    const groupName = detectGroup(metadata) || detectGroup([worksheet]);
    const students: ParsedRosterStudent[] = [];
    const invalidRows: ParsedRosterStudent[] = [];
    for (let index = headerIndex + 1; index < rows.length; index += 1) {
      const row = rows[index];
      const matricule = normalizeMatricule(row[matriculeIndex]);
      const lastName = compact(row[lastNameIndex]);
      const firstName = compact(row[firstNameIndex]);
      if (!matricule && !lastName && !firstName) continue;
      if (['matricule', 'رقم التعريف', 'رقم التسجيل'].includes(normalize(matricule)) && ['nom', 'اللقب'].includes(normalize(lastName))) continue;
      const needsReview: string[] = [];
      if (!matricule) needsReview.push('رقم التعريف مفقود');
      if (!lastName || !firstName) needsReview.push('الاسم أو اللقب مفقود');
      const rawBirthDate = birthDateIndex >= 0 ? row[birthDateIndex] : undefined;
      const birthDate = normalizeDate(rawBirthDate);
      if (rawBirthDate && !birthDate) needsReview.push('تاريخ الميلاد غير صالح');
      const student = { matricule, lastName, firstName, birthDate, grade, groupName, rowNumber: index + 1, needsReview: needsReview.length ? needsReview : undefined };
      (needsReview.length ? invalidRows : students).push(student);
    }
    return { worksheet, grade, groupName, needsGradeSelection: !grade, students, invalidRows };
  });
}

export function rosterPreviewSummary(previews: RosterWorksheetPreview[]) {
  return previews.reduce((summary, preview) => ({
    worksheets: summary.worksheets + 1,
    students: summary.students + preview.students.length,
    invalidRows: summary.invalidRows + preview.invalidRows.length,
    needsGradeSelection: summary.needsGradeSelection + (preview.needsGradeSelection ? 1 : 0),
  }), { worksheets: 0, students: 0, invalidRows: 0, needsGradeSelection: 0 });
}
