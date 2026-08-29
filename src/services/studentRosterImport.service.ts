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

export interface ExcelMatriculeCell {
  t?: string;
  v?: unknown;
  w?: string;
  z?: string;
}

export interface RosterWorksheetPreview {
  worksheet: string;
  grade?: number;
  groupName?: string;
  needsGradeSelection: boolean;
  students: ParsedRosterStudent[];
  invalidRows: ParsedRosterStudent[];
}

const normalize = (value: unknown) =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' et ')
    .replace(/[._:/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const compact = (value: unknown) =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, ' ')
    .trim();

const matriculeHeaders = ['matricule', 'رقم التعريف', 'رقم التسجيل', 'registration number'];
const lastNameHeaders = ['nom', 'اللقب', 'family name', 'last name', 'surname'];
const firstNameHeaders = ['prenom', 'prénom', 'الاسم', 'first name', 'given name'];
const combinedNameHeaders = [
  'nom et prenom',
  'nom et prénom',
  'nom & prénom',
  'nom complet',
  'full name',
  'الاسم واللقب',
  'اللقب والاسم',
  'اسم ولقب التلميذ',
  'اسم التلميذ ولقبه',
  'الاسم الكامل',
  'التلميذ',
  'élève',
  'eleve',
];

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
  const marker = text.match(
    /(?:الفوج\s*التربوي|القسم|groupe\s*p[ée]dagogique|group[eé]|classe|class)\s*[:：-]?\s*/i
  );
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

function splitCombinedName(value: unknown, order: 'first-last' | 'last-first') {
  const fullName = compact(value);
  const words = fullName.split(' ').filter(Boolean);
  if (words.length < 2) return { firstName: fullName, lastName: fullName };
  const first = words[0];
  const rest = words.slice(1).join(' ');
  return order === 'first-last'
    ? { firstName: first, lastName: rest }
    : { firstName: rest, lastName: first };
}

function normalizeDigits(value: string): string {
  return [...value]
    .map((character) => {
      const code = character.codePointAt(0);
      if (code !== undefined && code >= 0x0660 && code <= 0x0669)
        return String.fromCharCode(0x30 + code - 0x0660);
      if (code !== undefined && code >= 0x06f0 && code <= 0x06f9)
        return String.fromCharCode(0x30 + code - 0x06f0);
      return character;
    })
    .join('');
}

function expandScientificInteger(value: string): string | undefined {
  const match = value.match(/^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
  if (!match || match[1] === '-') return undefined;
  const digits = `${match[2]}${match[3] || ''}`.replace(/^0+(?=\d)/, '');
  const exponent = BigInt(match[4]);
  const decimalPlaces = BigInt((match[3] || '').length);
  const decimalShift = exponent - decimalPlaces;
  if (decimalShift >= 0n) {
    let suffix = '';
    for (let index = 0n; index < decimalShift; index += 1n) suffix += '0';
    return `${digits}${suffix}`;
  }
  const removed = -decimalShift;
  if (removed > BigInt(digits.length)) {
    if ([...digits].some((character) => character !== '0')) return undefined;
    return '0';
  }
  let removedCount = 0;
  for (let index = 0n; index < removed; index += 1n) removedCount += 1;
  const cut = digits.length - removedCount;
  if ([...digits.slice(cut)].some((character) => character !== '0')) return undefined;
  return digits.slice(0, cut).replace(/^0+(?=\d)/, '') || '0';
}

function precisionError() {
  return 'رقم التسجيل محفوظ كرقم في Excel وقد فقد دقته. يرجى تحويل عمود رقم التسجيل إلى نص ثم إعادة إدخال الرقم الأصلي.';
}

export function normalizeExcelMatricule(cell: ExcelMatriculeCell | unknown): {
  value: string;
  error?: string;
} {
  if (cell === null || cell === undefined || cell === '') return { value: '' };
  if (typeof cell === 'number') {
    if (!Number.isSafeInteger(cell)) return { value: '', error: precisionError() };
    return {
      value: cell.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 }),
    };
  }
  const source = (cell && typeof cell === 'object' ? cell : {}) as ExcelMatriculeCell;
  if (source.t === 'n' || typeof source.v === 'number') {
    if (typeof source.v !== 'number' || !Number.isSafeInteger(source.v))
      return { value: '', error: precisionError() };
    return {
      value: source.v.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 }),
    };
  }
  const text = compact(source.t === 's' || source.t === 'str' ? source.v : cell);
  if (!text) return { value: '' };
  const digits = normalizeDigits(text);
  if (/^\d+$/.test(digits)) return { value: digits };
  if (/^[+-]?[\d.]+[eE][+-]?\d+$/.test(text)) {
    const expanded = expandScientificInteger(text);
    return expanded ? { value: expanded } : { value: '', error: precisionError() };
  }
  return { value: '', error: 'رقم التسجيل يجب أن يكون رقماً صحيحاً محفوظاً كنص.' };
}

function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  const text = compact(value);
  if (!text) return undefined;
  const iso = text.match(/^(\d{4})[-/]([01]?\d)[-/]([0-3]?\d)/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const dmy = text.match(/^([0-3]?\d)[-/]([01]?\d)[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return undefined;
}

export function parseStudentRosterWorkbook(input: Buffer | Uint8Array): RosterWorksheetPreview[] {
  const workbook = XLSX.read(input, {
    type: 'buffer',
    cellDates: true,
    cellText: true,
    cellNF: true,
    bookVBA: false,
  });
  return workbook.SheetNames.map((worksheet) => {
    const sheet = workbook.Sheets[worksheet];
    // Use the displayed cell text so identifiers keep formatting and leading
    // zeros instead of being coerced through JavaScript's unsafe number range.
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalize);
      const hasSeparateNames =
        findColumn(headers, lastNameHeaders) >= 0 && findColumn(headers, firstNameHeaders) >= 0;
      return hasSeparateNames || findColumn(headers, combinedNameHeaders) >= 0;
    });
    if (headerIndex < 0)
      return { worksheet, needsGradeSelection: true, students: [], invalidRows: [] };
    const headers = rows[headerIndex].map(normalize);
    const matriculeIndex = findColumn(headers, matriculeHeaders);
    const lastNameIndex = findColumn(headers, lastNameHeaders);
    const firstNameIndex = findColumn(headers, firstNameHeaders);
    const combinedNameIndex = findColumn(headers, combinedNameHeaders);
    const combinedHeader = combinedNameIndex >= 0 ? headers[combinedNameIndex] : '';
    const combinedOrder = /(?:اللقب والاسم|^nom et prenom|^nom complet|^full name)/i.test(
      combinedHeader
    )
      ? 'last-first'
      : 'first-last';
    const birthDateIndex = findColumn(headers, [
      'date_n',
      'date naissance',
      'تاريخ الميلاد',
      'birth date',
    ]);
    const metadata = rows.slice(0, headerIndex).flat();
    const grade = detectGrade(metadata) || detectGrade([worksheet]);
    const groupName = detectGroup(metadata) || detectGroup([worksheet]);
    const students: ParsedRosterStudent[] = [];
    const invalidRows: ParsedRosterStudent[] = [];
    for (let index = headerIndex + 1; index < rows.length; index += 1) {
      const row = rows[index];
      const matriculeCell =
        matriculeIndex >= 0
          ? sheet[XLSX.utils.encode_cell({ r: index, c: matriculeIndex })]
          : undefined;
      const normalizedMatricule = normalizeExcelMatricule(
        matriculeCell || (matriculeIndex >= 0 ? row[matriculeIndex] : undefined)
      );
      const matricule = normalizedMatricule.value;
      const separateLastName = lastNameIndex >= 0 ? compact(row[lastNameIndex]) : '';
      const separateFirstName = firstNameIndex >= 0 ? compact(row[firstNameIndex]) : '';
      const combined =
        separateLastName || separateFirstName
          ? { firstName: separateFirstName, lastName: separateLastName }
          : splitCombinedName(row[combinedNameIndex], combinedOrder);
      const lastName = combined.lastName;
      const firstName = combined.firstName;
      if (!matricule && !lastName && !firstName) continue;
      if (
        (matricule &&
          matriculeHeaders.some((header) => normalize(header) === normalize(matricule))) ||
        (lastName && lastNameHeaders.some((header) => normalize(header) === normalize(lastName))) ||
        (firstName &&
          firstNameHeaders.some((header) => normalize(header) === normalize(firstName))) ||
        (combinedNameIndex >= 0 &&
          combinedNameHeaders.some(
            (header) => normalize(header) === normalize(row[combinedNameIndex])
          ))
      )
        continue;
      const needsReview: string[] = [];
      if (normalizedMatricule.error) needsReview.push(normalizedMatricule.error);
      if (!lastName || !firstName) needsReview.push('الاسم أو اللقب مفقود');
      const rawBirthDate = birthDateIndex >= 0 ? row[birthDateIndex] : undefined;
      const birthDate = normalizeDate(rawBirthDate);
      if (rawBirthDate && !birthDate) needsReview.push('تاريخ الميلاد غير صالح');
      const student = {
        matricule,
        lastName,
        firstName,
        birthDate,
        grade,
        groupName,
        rowNumber: index + 1,
        needsReview: needsReview.length ? needsReview : undefined,
      };
      (needsReview.length ? invalidRows : students).push(student);
    }
    return { worksheet, grade, groupName, needsGradeSelection: !grade, students, invalidRows };
  });
}

export function rosterPreviewSummary(previews: RosterWorksheetPreview[]) {
  return previews.reduce(
    (summary, preview) => ({
      worksheets: summary.worksheets + 1,
      students: summary.students + preview.students.length,
      invalidRows: summary.invalidRows + preview.invalidRows.length,
      needsGradeSelection: summary.needsGradeSelection + (preview.needsGradeSelection ? 1 : 0),
    }),
    { worksheets: 0, students: 0, invalidRows: 0, needsGradeSelection: 0 }
  );
}

export function findCrossClassMatriculeConflicts(
  previews: readonly RosterWorksheetPreview[]
): string[] {
  const classByMatricule = new Map<string, string>();
  const conflicts = new Set<string>();
  for (const preview of previews) {
    const classKey = preview.groupName || preview.worksheet;
    for (const student of preview.students) {
      const matricule = normalizeExcelMatricule(student.matricule).value;
      if (!matricule) continue;
      const previousClass = classByMatricule.get(matricule);
      if (previousClass && previousClass !== classKey) conflicts.add(matricule);
      else if (!previousClass) classByMatricule.set(matricule, classKey);
    }
  }
  return [...conflicts];
}
