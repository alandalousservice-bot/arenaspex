import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { init, type WrappedPdfiumModule } from '@embedpdf/pdfium';
import {
  normalizeImportedClassName,
  normalizeExcelMatricule,
  normalizeRosterSchoolYear,
  type ParsedRosterStudent,
  type RosterWorksheetPreview,
} from './studentRosterImport.service.js';

export const MAX_STUDENT_ROSTER_PDF_BYTES = 12 * 1024 * 1024;

export class StudentRosterPdfImportError extends Error {
  constructor(
    readonly code:
      | 'EMPTY_FILE'
      | 'FILE_TOO_LARGE'
      | 'INVALID_PDF'
      | 'SCANNED_PDF'
      | 'INVALID_STRUCTURE'
      | 'PARSER_BUSY',
    message: string
  ) {
    super(message);
    this.name = 'StudentRosterPdfImportError';
  }
}

export interface StudentRosterPdfPreview {
  pageCount: number;
  schoolYear?: string;
  previews: RosterWorksheetPreview[];
  pageDiagnostics: PdfPageDiagnostic[];
}

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

interface PdfiumGlyph {
  text: string;
  index: number;
  left: number;
  right: number;
  bottom: number;
  top: number;
}

type PdfiumRuntime = WrappedPdfiumModule['pdfium'] & {
  _malloc(size: number): number;
  _free(pointer: number): void;
  HEAPU8: Uint8Array;
};

const require = createRequire(path.join(process.cwd(), 'package.json'));
let pdfiumPromise: Promise<WrappedPdfiumModule> | undefined;
let pdfiumQueue: Promise<void> = Promise.resolve();
const MAX_ADMITTED_PDFIUM_JOBS = 3;
let admittedPdfiumJobs = 0;

export interface PdfiumJobPermit {
  release(): void;
  consume(): boolean;
}

export function reservePdfiumJob(): PdfiumJobPermit | undefined {
  if (admittedPdfiumJobs >= MAX_ADMITTED_PDFIUM_JOBS) return undefined;
  admittedPdfiumJobs += 1;
  let released = false;
  let consumed = false;
  return {
    consume() {
      if (released || consumed) return false;
      consumed = true;
      return true;
    },
    release() {
      if (released) return;
      released = true;
      admittedPdfiumJobs -= 1;
    },
  };
}

function getPdfium(): Promise<WrappedPdfiumModule> {
  pdfiumPromise ??= init({
    wasmBinary: readFileSync(require.resolve('@embedpdf/pdfium/pdfium.wasm')),
  }).then((pdfium) => {
    pdfium.PDFiumExt_Init();
    pdfium.FPDF_InitLibrary();
    return pdfium;
  });
  return pdfiumPromise;
}

export function runPdfiumJob<T>(operation: () => Promise<T>, permit?: PdfiumJobPermit): Promise<T> {
  const reservation = permit || reservePdfiumJob();
  if (!reservation || !reservation.consume())
    return Promise.reject(new StudentRosterPdfImportError(
      'PARSER_BUSY',
      'يتم تحليل قوائم أخرى حالياً. يرجى إعادة المحاولة بعد لحظات.'
    ));
  const result = pdfiumQueue.then(operation, operation);
  pdfiumQueue = result.then(
    () => { reservation.release(); },
    () => { reservation.release(); }
  );
  return result;
}

function glyphsToTextItems(glyphs: PdfiumGlyph[], pageNumber: number): PositionedItem[] {
  const sorted = [...glyphs].sort(
    (a, b) => (b.bottom + b.top) / 2 - (a.bottom + a.top) / 2 || a.left - b.left
  );
  const lines: PdfiumGlyph[][] = [];
  for (const glyph of sorted) {
    const y = (glyph.bottom + glyph.top) / 2;
    const line = lines.find((candidate) => {
      const center = candidate.reduce((sum, item) => sum + (item.bottom + item.top) / 2, 0) / candidate.length;
      return Math.abs(center - y) <= 2.5;
    });
    if (line) line.push(glyph);
    else lines.push([glyph]);
  }

  return lines.flatMap((line) => {
    const visual = [...line].sort((a, b) => a.left - b.left);
    const runs: PdfiumGlyph[][] = [];
    for (const glyph of visual) {
      const run = runs.at(-1);
      const previous = run?.at(-1);
      const gap = previous ? glyph.left - previous.right : Number.POSITIVE_INFINITY;
      const previousHeight = previous ? previous.top - previous.bottom : 0;
      const tolerance = Math.max(2.2, Math.min(5, Math.max(previousHeight, glyph.top - glyph.bottom) * 0.45));
      if (run && previous && gap <= tolerance && gap >= -tolerance * 2 && glyph.text !== ' ')
        run.push(glyph);
      else runs.push([glyph]);
    }
    return runs.map((run) => {
      const logical = [...run].sort((a, b) => a.index - b.index);
      const left = Math.min(...run.map((item) => item.left));
      const right = Math.max(...run.map((item) => item.right));
      return {
        text: logical.map((item) => item.text).join(''),
        x: left,
        y: run.reduce((sum, item) => sum + (item.bottom + item.top) / 2, 0) / run.length,
        width: Math.max(0, right - left),
        height: run.reduce((sum, item) => sum + item.top - item.bottom, 0) / run.length,
        pageNumber,
      };
    }).filter((item) => item.text.trim());
  });
}

function nationalIdAnchorItems(glyphs: PdfiumGlyph[], pageNumber: number): PositionedItem[] {
  const digitGlyphs = glyphs.filter((glyph) => /^\d$/.test(normalizeDigits(glyph.text)));
  const lines: PdfiumGlyph[][] = [];
  for (const glyph of [...digitGlyphs].sort((a, b) =>
    (b.bottom + b.top) / 2 - (a.bottom + a.top) / 2
  )) {
    const y = (glyph.bottom + glyph.top) / 2;
    const line = lines.find((candidate) => {
      const center = candidate.reduce((sum, item) => sum + (item.bottom + item.top) / 2, 0) / candidate.length;
      return Math.abs(center - y) <= 3;
    });
    if (line) line.push(glyph);
    else lines.push([glyph]);
  }
  return lines.flatMap((line) => {
    const sorted = [...line].sort((a, b) => a.left - b.left);
    const runs: PdfiumGlyph[][] = [];
    for (const glyph of sorted) {
      const run = runs.at(-1);
      const previous = run?.at(-1);
      const gap = previous ? glyph.left - previous.right : Number.POSITIVE_INFINITY;
      if (run && previous && gap <= 5 && gap >= -5) run.push(glyph);
      else runs.push([glyph]);
    }
    return runs.filter((run) => run.length >= 14 && run.length <= 18).map((run) => {
      const left = Math.min(...run.map((item) => item.left));
      const right = Math.max(...run.map((item) => item.right));
      return {
        text: run.sort((a, b) => a.left - b.left).map((item) => normalizeDigits(item.text)).join(''),
        x: left,
        y: run.reduce((sum, item) => sum + (item.bottom + item.top) / 2, 0) / run.length,
        width: right - left,
        height: run.reduce((sum, item) => sum + item.top - item.bottom, 0) / run.length,
        pageNumber,
      };
    });
  });
}

type PositionedItem = PdfTextItem;

export interface PdfVisualLine {
  y: number;
  items: PdfTextItem[];
}

type TextLine = PdfVisualLine;

export interface PdfPageDiagnostic {
  pageNumber: number;
  headingDetected: boolean;
  grade?: number;
  section?: string;
  headerAnchors: number;
  rowsDetected: number;
  continuation: boolean;
}

interface ColumnAnchor {
  key:
    | 'order'
    | 'nationalId'
    | 'localRegistration'
    | 'lastName'
    | 'firstName'
    | 'birthDate'
    | 'gender'
    | 'repetition'
    | 'subgroup'
    | 'status'
    | 'notes'
    | 'age';
  x: number;
  left: number;
  right: number;
}

interface PageGeometry {
  width: number;
  height: number;
  columns: ColumnAnchor[];
}

const normalizeText = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/ـ/g, '')
    .replace(/[،؛:：]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeDigits = (value: string) =>
  [...value]
    .map((character) => {
      const code = character.codePointAt(0);
      if (code !== undefined && code >= 0x0660 && code <= 0x0669)
        return String.fromCharCode(0x30 + code - 0x0660);
      if (code !== undefined && code >= 0x06f0 && code <= 0x06f9)
        return String.fromCharCode(0x30 + code - 0x06f0);
      return character;
    })
    .join('');

const gradeLabels: Array<{ grade: number; label: string; pattern: RegExp }> = [
  { grade: 1, label: 'الأولى', pattern: /(?:الأولى|أولى|اولى|الاولى)/i },
  { grade: 2, label: 'الثانية', pattern: /(?:الثانية|ثانية|الثانيه)/i },
  { grade: 3, label: 'الثالثة', pattern: /(?:الثالثة|ثالثة|الثالثه)/i },
  { grade: 4, label: 'الرابعة', pattern: /(?:الرابعة|رابعة|الرابعه)/i },
  { grade: 5, label: 'الخامسة', pattern: /(?:الخامسة|خامسة|الخامسه)/i },
];

const headerMatchers: Record<ColumnAnchor['key'], RegExp[]> = {
  order: [/^الترتيب$/, /^رقم\s*الترتيب$/, /^ordre$/i, /^order$/i],
  nationalId: [
    /^رقم\s*التعريف$/,
    /^رقم\s*تعريف$/,
    /^المعرف$/,
    /^identifiant$/i,
    /^(?:national\s*)?id(?:\s*(?:number|no\.?))?$/i,
  ],
  localRegistration: [
    /^رقم\s*التسجيل$/,
    /^رقم\s*التسجيل\s*المحلي$/,
    /^matricule$/i,
    /^(?:local\s*)?registration(?:\s*(?:number|no\.?))?$/i,
  ],
  lastName: [/^اللقب$/, /^النسب$/, /^nom$/, /^surname$/i, /^last\s*name$/i],
  firstName: [
    /^الاسم$/,
    /^الاسم\s*الشخصي$/,
    /^prenom$/i,
    /^prénom$/i,
    /^first\s*name$/i,
    /^given\s*name$/i,
  ],
  birthDate: [
    /^تاريخ\s*الميلاد$/,
    /^تاريخ\s*الازدياد$/,
    /^date\s*de\s*naissance$/i,
    /^birth\s*date$/i,
    /^date\s*of\s*birth$/i,
  ],
  gender: [/^الجنس$/, /^sexe$/i, /^gender$/i],
  repetition: [/^الإعادة$/, /^اعادة$/, /^redoublement$/i, /^repetition$/i],
  subgroup: [/^الفوج\s*الفرعي$/, /^الفوج$/, /^sous\s*groupe$/i, /^subgroup$/i],
  status: [/^الصفة$/, /^statut$/i, /^status$/i],
  notes: [/^الملاحظات$/, /^ملاحظات$/, /^observations?$/i, /^notes?$/i],
  age: [/^السن$/, /^العمر$/, /^âge$/i, /^age$/i],
};

const headerWords: Record<ColumnAnchor['key'], string[][]> = {
  order: [['الترتيب'], ['رقم', 'الترتيب'], ['ordre'], ['order']],
  nationalId: [
    ['رقم', 'التعريف'],
    ['رقم', 'تعريف'],
    ['المعرف'],
    ['identifiant'],
    ['national', 'id'],
    ['id'],
  ],
  localRegistration: [
    ['رقم', 'التسجيل'],
    ['رقم', 'التسجيل', 'المحلي'],
    ['matricule'],
    ['registration'],
  ],
  lastName: [['اللقب'], ['النسب'], ['nom'], ['surname'], ['last', 'name']],
  firstName: [
    ['الاسم'],
    ['الاسم', 'الشخصي'],
    ['prénom'],
    ['prenom'],
    ['first', 'name'],
    ['given', 'name'],
  ],
  birthDate: [
    ['تاريخ', 'الميلاد'],
    ['تاريخ', 'الازدياد'],
    ['date', 'de', 'naissance'],
    ['birth', 'date'],
    ['date', 'of', 'birth'],
  ],
  gender: [['الجنس'], ['sexe'], ['gender']],
  repetition: [['الإعادة'], ['اعادة'], ['redoublement'], ['repetition']],
  subgroup: [['الفوج', 'الفرعي'], ['الفوج'], ['subgroup']],
  status: [['الصفة'], ['statut'], ['status']],
  notes: [['الملاحظات'], ['ملاحظات'], ['observations'], ['notes']],
  age: [['السن'], ['العمر'], ['âge'], ['age']],
};

export function buildPdfVisualLines(items: PdfTextItem[]): PdfVisualLine[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextLine[] = [];
  for (const item of sorted) {
    const tolerance = Math.max(1.5, Math.min(5, item.height * 0.35));
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (line) {
      line.items.push(item);
      line.y = line.items.reduce((sum, current) => sum + current.y, 0) / line.items.length;
    } else lines.push({ y: item.y, items: [item] });
  }
  return lines
    .map((line) => ({ ...line, items: line.items.sort((a, b) => a.x - b.x) }))
    .sort((a, b) => b.y - a.y);
}

function lineText(line: TextLine, direction: 'ltr' | 'rtl' = 'ltr'): string {
  const items = direction === 'rtl' ? [...line.items].reverse() : line.items;
  return normalizeText(items.map((item) => item.text).join(' '));
}

/** Return visually ordered candidate lines without blindly reversing a whole PDF page. */
function lineTextCandidates(line: TextLine): string[] {
  const leftToRight = [...line.items].sort((a, b) => a.x - b.x);
  const runs: PositionedItem[][] = [];
  for (const item of leftToRight) {
    const previous = runs.at(-1)?.at(-1);
    const gap = previous ? item.x - (previous.x + previous.width) : Number.POSITIVE_INFINITY;
    const threshold = Math.max(1.5, Math.min(14, Math.max(previous?.height || 0, item.height) * 0.85));
    if (previous && gap <= threshold) runs.at(-1)!.push(item);
    else runs.push([item]);
  }
  const text = (items: PositionedItem[]) => items.map((item) => item.text).join('');
  const orderedRuns = runs.map(text);
  const reversedGlyphRuns = runs.map((run) => [...run].reverse().map((item) => item.text).join(''));
  return [
    lineText(line),
    lineText(line, 'rtl'),
    orderedRuns.join(' '),
    [...orderedRuns].reverse().join(' '),
    reversedGlyphRuns.join(' '),
    [...reversedGlyphRuns].reverse().join(' '),
    orderedRuns.join(''),
    reversedGlyphRuns.join(''),
  ].map((candidate) => normalizeDigits(normalizeText(candidate)));
}

export function reconstructPdfVisualLine(line: PdfVisualLine): string[] {
  return lineTextCandidates(line);
}

function findHeading(
  lines: TextLine[]
): { grade: number; gradeLabel: string; section: string; groupName: string; schoolYear?: string } | null {
  const headingLines = lines.filter((line) => line.y >= 0);
  const candidates = headingLines.flatMap(lineTextCandidates);
  for (let index = 0; index < headingLines.length - 1; index += 1) {
    const first = lineTextCandidates(headingLines[index]);
    const second = lineTextCandidates(headingLines[index + 1]);
    for (let direction = 0; direction < Math.min(first.length, second.length); direction += 1) {
      candidates.push(`${first[direction]} ${second[direction]}`);
    }
  }
  for (const candidate of candidates) {
    const arabicGrade = gradeLabels.find((entry) => entry.pattern.test(candidate));
    const numericGrade = normalizeDigits(candidate).match(
      /(?:grade\s*|primary\s*|class\s*)?([1-5])\s*(?:ap|primary|ابتدائي)/i
    );
    const gradeNumber = arabicGrade?.grade || Number(numericGrade?.[1]) || 0;
    const gradeLabel = arabicGrade?.label || ['','الأولى','الثانية','الثالثة','الرابعة','الخامسة'][gradeNumber];
    const hasArabicHeadingTokens = /قائمة/.test(candidate) && /التلاميذ/.test(candidate) && /السنة/.test(candidate);
    const hasEnglishHeadingTokens = /student\s*list/i.test(candidate) && /(?:grade|primary|class)/i.test(candidate);
    if (!gradeNumber || (!hasArabicHeadingTokens && !hasEnglishHeadingTokens)) continue;
    const yearMatch = normalizeDigits(candidate).match(/(20\d{2})\s*[-/–:：]\s*(20\d{2})/);
    const endBeforeYear = yearMatch ? candidate.slice(0, yearMatch.index) : candidate;
    const gradeIndex = arabicGrade?.pattern.exec(endBeforeYear)?.index ?? numericGrade?.index ?? 0;
    const afterGrade = endBeforeYear.slice(gradeIndex);
    const sectionMatch = normalizeDigits(afterGrade).match(/(?:ابتدائي|ابتدائى|ابتدائية)[^\d]{0,24}(\d{1,2})\b/i)
      || normalizeDigits(afterGrade).match(/(?:section|class|group)\s*(?:no\.?\s*)?(\d{1,2})\b/i)
      || normalizeDigits(afterGrade).match(/\b(\d{1,2})\b/)
      || normalizeDigits(candidate.slice(Math.max(0, gradeIndex - 24), gradeIndex + 48)).match(/\b(\d{1,2})\b/);
    if (!sectionMatch) continue;
    const section = sectionMatch[1].padStart(2, '0');
    return {
      grade: gradeNumber,
      gradeLabel,
      section,
      groupName: `السنة ${gradeLabel} ابتدائي ${section}`,
      schoolYear: yearMatch ? `${yearMatch[1]}-${yearMatch[2]}` : undefined,
    };
  }
  return null;
}

export function recognizeStudentRosterHeading(
  lines: PdfVisualLine[]
): ReturnType<typeof findHeading> {
  return findHeading(lines);
}

function headerLabelMatch(value: string, key: ColumnAnchor['key']): boolean {
  const normalized = normalizeText(value).replace(/[：:]/g, '').trim();
  return headerMatchers[key].some((pattern) => pattern.test(normalized));
}

function detectHeaderGeometry(lines: TextLine[]): ColumnAnchor[] | null {
  for (const line of lines) {
    const items = [...line.items].sort((a, b) => a.x - b.x);
    const found: ColumnAnchor[] = [];
    for (const key of Object.keys(headerWords) as ColumnAnchor['key'][]) {
      let best: PositionedItem[] | null = null;
      for (let start = 0; start < items.length && !best; start += 1) {
        for (let length = 1; length <= Math.min(12, items.length - start); length += 1) {
          const span = items.slice(start, start + length);
          const variants = [
            span.map((item) => item.text).join(' '),
            span.map((item) => item.text).join(''),
            [...span].reverse().map((item) => item.text).join(' '),
            [...span].reverse().map((item) => item.text).join(''),
            span.map((item) => [...item.text].reverse().join('')).join(''),
            [...span].reverse().map((item) => [...item.text].reverse().join('')).join(''),
          ];
          if (variants.some((variant) => headerLabelMatch(variant, key))) {
            best = span;
            break;
          }
        }
      }
      if (!best) continue;
      const left = Math.min(...best.map((item) => item.x));
      const right = Math.max(...best.map((item) => item.x + item.width));
      const center = (left + right) / 2;
      if (!found.some((column) => Math.abs(column.x - center) < 4))
        found.push({ key, x: center, left, right });
    }
    const required: ColumnAnchor['key'][] = [
      'order',
      'nationalId',
      'lastName',
      'firstName',
      'birthDate',
    ];
    if (required.every((key) => found.some((column) => column.key === key))) return found;
  }
  return null;
}

function sameGeometry(previous: PageGeometry, width: number, height: number): boolean {
  if (
    Math.abs(previous.width - width) > 2 ||
    Math.abs(previous.height - height) > 2
  )
    return false;
  return previous.columns.every((column) =>
    Number.isFinite(column.x) && column.x >= 0 && column.x <= width
  );
}

function sameColumnGeometry(previous: PageGeometry, next: PageGeometry): boolean {
  const required: ColumnAnchor['key'][] = ['order', 'nationalId', 'lastName', 'firstName'];
  return required.every((key) => {
    const before = previous.columns.find((column) => column.key === key);
    const after = next.columns.find((column) => column.key === key);
    return Boolean(before && after && Math.abs(before.x / previous.width - after.x / next.width) <= 0.04);
  });
}

function positionClusters<T extends { x: number }>(items: T[], tolerance: number) {
  const clusters: Array<{ x: number; items: T[] }> = [];
  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    const cluster = clusters.find((candidate) => Math.abs(candidate.x - item.x) <= tolerance);
    if (!cluster) clusters.push({ x: item.x, items: [item] });
    else {
      cluster.items.push(item);
      cluster.x = cluster.items.reduce((sum, current) => sum + current.x, 0) / cluster.items.length;
    }
  }
  return clusters;
}

function normalizedDigitsIn(item: PositionedItem): string {
  return normalizeDigits(normalizeText(item.text)).replace(/[^0-9]/g, '');
}

function inferDataDrivenGeometry(lines: TextLine[], width: number, height: number): PageGeometry | null {
  const visibleItems = lines
    .filter((line) => line.y > height * 0.025 && line.y < height * 0.9)
    .flatMap((line) => line.items);
  const idItems = visibleItems.filter((item) => {
    const digits = normalizedDigitsIn(item);
    return digits.length >= 14 && digits.length <= 18;
  });
  const idClusters = positionClusters(idItems.map((item) => ({ x: item.x + item.width / 2, item })), 12)
    .sort((a, b) => b.items.length - a.items.length);
  const idCluster = idClusters[0];
  if (!idCluster || idCluster.items.length < 3) return null;
  const idX = idCluster.x;

  const shortNumbers = visibleItems
    .filter((item) => {
      const digits = normalizedDigitsIn(item);
      return digits.length > 0 && digits.length <= 3 && Number(digits) >= 1 && Number(digits) <= 100;
    })
    .map((item) => ({ x: item.x + item.width / 2, y: item.y, value: Number(normalizedDigitsIn(item)), item }));
  const orderClusters = positionClusters(shortNumbers, 12)
    .filter((cluster) => Math.abs(cluster.x - idX) > 22)
    .map((cluster) => {
      const ordered = [...cluster.items].sort((a, b) => b.y - a.y);
      let longestSequence = 0;
      let currentSequence = 0;
      let previousValue = Number.NaN;
      let previousY = Number.NaN;
      for (const item of ordered) {
        const verticallyAdjacent = !Number.isFinite(previousY) || previousY - item.y <= height * 0.12;
        currentSequence = item.value === previousValue + 1 && verticallyAdjacent ? currentSequence + 1 : 1;
        longestSequence = Math.max(longestSequence, currentSequence);
        previousValue = item.value;
        previousY = item.y;
      }
      return { ...cluster, longestSequence };
    })
    .sort((a, b) => b.longestSequence - a.longestSequence || b.items.length - a.items.length);
  const orderCluster = orderClusters[0];
  if (!orderCluster || orderCluster.longestSequence < Math.min(3, idCluster.items.length)) return null;

  const rowCenters = [...idCluster.items]
    .sort((a, b) => b.item.y - a.item.y)
    .filter((entry, index, array) => index === 0 || Math.abs(entry.item.y - array[index - 1].item.y) > 2.5);
  const rowBounds = rowCenters.map((center, index) => {
    const previousGap = index ? rowCenters[index - 1].item.y - center.item.y : Number.POSITIVE_INFINITY;
    const nextGap = index + 1 < rowCenters.length ? center.item.y - rowCenters[index + 1].item.y : Number.POSITIVE_INFINITY;
    const radius = Math.min(12, Math.max(3.5, Math.min(previousGap, nextGap) / 2));
    return { y: center.item.y, min: center.item.y - radius, max: center.item.y + radius };
  });
  const arabicPositions = rowBounds.flatMap((row, rowIndex) => {
    const rowItems = visibleItems.filter(
      (item) => item.y >= row.min && item.y <= row.max && /\p{Script=Arabic}/u.test(item.text)
    );
    const perRow: Array<{ x: number; length: number; rowIndex: number }> = [];
    for (const item of rowItems) {
      const arabic = normalizeText(item.text).replace(/[^\p{Script=Arabic}]/gu, '');
      if (arabic.length < 2) continue;
      perRow.push({ x: item.x + item.width / 2, length: arabic.length, rowIndex });
    }
    return perRow;
  });
  const arabicClusters = positionClusters(arabicPositions, 22)
    .map((cluster) => ({
      ...cluster,
      rowCoverage: new Set(cluster.items.map((item) => item.rowIndex)).size,
      chars: cluster.items.reduce((sum, item) => sum + item.length, 0),
    }))
    .sort((a, b) => b.items.length - a.items.length || b.chars - a.chars);
  const nameClusters = arabicClusters.filter((cluster) => cluster.x < idX - 16 && cluster.items.length >= Math.max(3, rowCenters.length / 3)).slice(0, 2);
  if (nameClusters.length < 2) return null;
  const [firstNameCluster, lastNameCluster] = [...nameClusters].sort((a, b) => a.x - b.x);
  if (lastNameCluster.x - firstNameCluster.x < 18) return null;

  const columns: ColumnAnchor[] = [
    { key: 'order', x: orderCluster.x, left: orderCluster.x - 6, right: orderCluster.x + 6 },
    { key: 'nationalId', x: idX, left: idX - 6, right: idX + 6 },
    { key: 'firstName', x: firstNameCluster.x, left: firstNameCluster.x - 8, right: firstNameCluster.x + 8 },
    { key: 'lastName', x: lastNameCluster.x, left: lastNameCluster.x - 8, right: lastNameCluster.x + 8 },
  ];
  const registrationCandidates = positionClusters(
    shortNumbers.filter((item) => item.x < idX - 12 && item.x > lastNameCluster.x + 12),
    12
  ).sort((a, b) => b.items.length - a.items.length);
  if (registrationCandidates[0]?.items.length >= Math.max(3, rowCenters.length / 3)) {
    const x = registrationCandidates[0].x;
    columns.push({ key: 'localRegistration', x, left: x - 6, right: x + 6 });
  }

  const dateItems = visibleItems
    .filter((item) => item.x + item.width / 2 < firstNameCluster.x - 12 && /[0-9٠-٩۰-۹]/.test(item.text))
    .map((item) => ({ x: item.x + item.width / 2, item }));
  const dateCandidates = positionClusters(dateItems, 16)
    .map((cluster) => ({
      ...cluster,
      validDates: rowBounds.filter((row) => {
        const rowItems = visibleItems.filter((item) => item.y >= row.min && item.y <= row.max &&
          Math.abs(item.x + item.width / 2 - cluster.x) <= 18);
        const value = rowItems.sort((a, b) => a.x - b.x).map((item) => item.text).join('');
        return Boolean(normalizeBirthDate(value));
      }).length,
    }))
    .sort((a, b) => b.validDates - a.validDates);
  if (dateCandidates[0]?.validDates >= Math.max(3, rowCenters.length / 3)) {
    const x = dateCandidates[0].x;
    columns.push({ key: 'birthDate', x, left: x - 8, right: x + 8 });
  }

  return { width, height, columns };
}

function splitRows(lines: TextLine[], geometry: PageGeometry): PositionedItem[][] {
  const orderColumn = geometry.columns.find((column) => column.key === 'order');
  const nationalIdColumn = geometry.columns.find((column) => column.key === 'nationalId');
  if (!orderColumn && !nationalIdColumn) return [];
  const rows: PositionedItem[][] = [];
  for (const line of lines) {
    if (line.items.some((item) => item.y > geometry.height * 0.92)) continue;
    const startsByOrder = orderColumn && line.items.some((item) => {
      const center = item.x + item.width / 2;
      const text = normalizeDigits(normalizeText(item.text)).replace(/\D/g, '');
      const number = Number(text);
      return (
        Math.abs(center - orderColumn.x) <= Math.max(12, (orderColumn.right - orderColumn.left) * 1.5) &&
        Number.isInteger(number) &&
        number >= 1 &&
        number <= 100
      );
    });
    const startsByIdentity = line.items.some((item) => {
      const digits = normalizedDigitsIn(item);
      return digits.length >= 14 && digits.length <= 18;
    });
    const startsRow = startsByOrder || startsByIdentity;
    if (startsRow) rows.push([...line.items]);
    else if (rows.length) rows[rows.length - 1].push(...line.items);
  }
  return rows;
}

function studentTableLines(lines: TextLine[], geometry: PageGeometry): TextLine[] {
  if (!geometry.columns.some((column) => column.key === 'nationalId')) return lines;
  const ys = lines
    .flatMap((line) => line.items
      .filter((item) => {
        const length = normalizedDigitsIn(item).length;
        return length >= 14 && length <= 18;
      })
      .map((item) => item.y))
    .sort((a, b) => b - a);
  const uniqueYs = ys.filter((y, index) => index === 0 || Math.abs(y - ys[index - 1]) > 2.5);
  if (!uniqueYs.length) return [];
  const gaps = uniqueYs.slice(1).map((y, index) => Math.abs(uniqueYs[index] - y)).sort((a, b) => a - b);
  const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 20;
  const padding = Math.max(4, Math.min(14, medianGap / 2));
  return lines.filter((line) => line.y <= uniqueYs[0] + padding && line.y >= uniqueYs.at(-1)! - padding);
}

function textInColumn(row: PositionedItem[], geometry: PageGeometry, key: ColumnAnchor['key']) {
  const column = geometry.columns.find((item) => item.key === key);
  if (!column) return '';
  const lower = geometry.columns
    .filter((item) => item.key !== key)
    .map((item) => item.x)
    .filter((x) => x < column.x);
  const higher = geometry.columns
    .filter((item) => item.key !== key)
    .map((item) => item.x)
    .filter((x) => x > column.x);
  const left = lower.length ? (Math.max(...lower) + column.x) / 2 : 0;
  const right = higher.length ? (Math.min(...higher) + column.x) / 2 : geometry.width;
  const numericColumn = key === 'nationalId' || key === 'localRegistration' || key === 'order' || key === 'birthDate';
  if (!numericColumn) {
    const textRow = row.filter((item) => {
      const digitCount = normalizedDigitsIn(item).length;
      return digitCount < 14;
    });
    const lines: PositionedItem[][] = [];
    for (const item of [...textRow].sort((a, b) => b.y - a.y)) {
      const line = lines.find((candidate) => Math.abs(candidate[0].y - item.y) <= 3);
      if (line) line.push(item);
      else lines.push([item]);
    }
    const groups = lines.flatMap((line) => {
      const lineGroups: PositionedItem[][] = [];
      for (const item of [...line].sort((a, b) => a.x - b.x)) {
        const group = lineGroups.at(-1);
        const previous = group?.at(-1);
        const gap = previous ? item.x - (previous.x + previous.width) : Number.POSITIVE_INFINITY;
        if (group && previous && gap <= 8 && gap >= -4) group.push(item);
        else lineGroups.push([item]);
      }
      return lineGroups;
    });
    const matchingGroups = groups.filter((group) => {
      const center = (Math.min(...group.map((item) => item.x)) + Math.max(...group.map((item) => item.x + item.width))) / 2;
      return center >= left && center <= right;
    });
    return matchingGroups.map((group) => {
      const rtl = group.some((item) => /\p{Script=Arabic}/u.test(item.text));
      const ordered = [...group].sort((a, b) => rtl ? b.x - a.x : a.x - b.x);
      return ordered.map((item, index) => {
        const next = ordered[index + 1];
        if (!next) return item.text;
        const gap = rtl ? item.x - (next.x + next.width) : next.x - (item.x + item.width);
        return `${item.text}${gap > 1.8 ? ' ' : ''}`;
      }).join('');
    }).join(' ').replace(/\s+/g, ' ').trim();
  }
  const rowTextItems = row.filter((item) => {
    const center = item.x + item.width / 2;
    return center >= left && center <= right;
  });
  rowTextItems.sort((a, b) => b.y - a.y || a.x - b.x);
  const values = rowTextItems
    .map((item) => item.text)
    .filter(Boolean);
  return values
    .join(numericColumn ? '' : ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBirthDate(value: string): string | undefined {
  const text = normalizeDigits(normalizeText(value));
  const iso = text.match(/(\d{4})[-/:：](\d{1,2})[-/:：](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const dmy = text.match(/(\d{1,2})[-/:：](\d{1,2})[-/:：](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return undefined;
}

function rowOrderValue(row: PositionedItem[], geometry: PageGeometry): number | undefined {
  const order = geometry.columns.find((column) => column.key === 'order');
  if (!order) return undefined;
  const values = row
    .filter((item) => Math.abs(item.x + item.width / 2 - order.x) <= Math.max(12, (order.right - order.left) * 1.5))
    .map((item) => Number(normalizedDigitsIn(item)))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 100);
  return values[0];
}

function parseStudentRows(
  rows: PositionedItem[][],
  geometry: PageGeometry,
  grade: number | undefined,
  groupName: string,
  schoolYear?: string,
  rowOffset = 0
) {
  const students: ParsedRosterStudent[] = [];
  const invalidRows: ParsedRosterStudent[] = [];
  rows.forEach((row, index) => {
    const nationalId = normalizeExcelMatricule(textInColumn(row, geometry, 'nationalId'));
    const localRegistration = normalizeExcelMatricule(
      textInColumn(row, geometry, 'localRegistration')
    );
    const matricule = nationalId.value || localRegistration.value;
    const lastName = normalizeText(textInColumn(row, geometry, 'lastName'));
    const firstName = normalizeText(textInColumn(row, geometry, 'firstName'));
    const birthDateText = textInColumn(row, geometry, 'birthDate');
    const birthDate = birthDateText ? normalizeBirthDate(birthDateText) : undefined;
    const needsReview: string[] = [];
    if (nationalId.error || localRegistration.error) needsReview.push('رقم التعريف غير صالح');
    if (!matricule) needsReview.push('رقم التعريف مفقود');
    if (!lastName || !firstName) needsReview.push('الاسم أو اللقب مفقود');
    if (birthDateText && !birthDate) needsReview.push('تاريخ الميلاد غير صالح');
    const parsed: ParsedRosterStudent = {
      matricule,
      lastName,
      firstName,
      birthDate,
      grade,
      groupName,
      schoolYear,
      rowNumber: rowOffset + index + 1,
      needsReview: needsReview.length ? needsReview : undefined,
    };
    (needsReview.length ? invalidRows : students).push(parsed);
  });
  return { students, invalidRows };
}

export async function parseStudentRosterPdf(
  input: Buffer | Uint8Array,
  permit?: PdfiumJobPermit
): Promise<StudentRosterPdfPreview> {
  if (!input.byteLength) {
    permit?.release();
    throw new StudentRosterPdfImportError('EMPTY_FILE', 'الملف فارغ.');
  }
  if (input.byteLength > MAX_STUDENT_ROSTER_PDF_BYTES) {
    permit?.release();
    throw new StudentRosterPdfImportError('FILE_TOO_LARGE', 'الملف أكبر من الحجم المسموح.');
  }
  if (input.byteLength < 5 || Buffer.from(input).subarray(0, 5).toString('ascii') !== '%PDF-') {
    permit?.release();
    throw new StudentRosterPdfImportError('INVALID_PDF', 'تعذر التعرف على بنية ملف PDF.');
  }

  return runPdfiumJob(async () => {
    const pdfium = await getPdfium();
    const runtime = pdfium.pdfium as PdfiumRuntime;
    const bytes = new Uint8Array(input);
    const dataPointer = runtime._malloc(bytes.byteLength);
    const boundsPointer = runtime._malloc(32);
    let documentHandle = 0;
    const pageHandles: number[] = [];
    const textHandles: number[] = [];
    try {
      runtime.HEAPU8.set(bytes, dataPointer);
      documentHandle = pdfium.FPDF_LoadMemDocument(dataPointer, bytes.byteLength, '');
      if (!documentHandle)
        throw new StudentRosterPdfImportError('INVALID_PDF', 'تعذر فتح ملف PDF أو أنه تالف.');
      const pageCount = pdfium.FPDF_GetPageCount(documentHandle);
      if (!pageCount) throw new StudentRosterPdfImportError('INVALID_PDF', 'ملف PDF لا يحتوي صفحات.');
    const previewsByGroup = new Map<string, RosterWorksheetPreview & { schoolYear?: string }>();
    const pageDiagnostics: PdfPageDiagnostic[] = [];
    let pageCountWithText = 0;
    let groupSequence = 0;
    let currentGroup: {
      grade?: number;
      section?: string;
      groupName: string;
      schoolYear?: string;
      pageStart: number;
    } | null = null;
    let currentGroupKey: string | null = null;
    let previousGeometry: PageGeometry | null = null;
    let documentYear: string | undefined;
    let rowOffset = 0;
    let previousLastOrder: number | undefined;

    const ensurePreview = (
      key: string,
      group: { grade?: number; section?: string; groupName: string; schoolYear?: string; pageStart: number }
    ) => {
      if (!previewsByGroup.has(key)) {
        previewsByGroup.set(key, {
          worksheet: key,
          id: key,
          source: 'pdf',
          pageStart: group.pageStart,
          pageEnd: group.pageStart,
          grade: group.grade,
          section: group.section,
          groupName: group.groupName,
          needsGradeSelection: !group.grade,
          students: [],
          invalidRows: [],
          schoolYear: group.schoolYear,
          metadataStatus: group.grade && group.section && group.schoolYear ? 'DETECTED' : 'NEEDS_REVIEW',
        });
      }
    };

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const pageNumber = pageIndex + 1;
      const pageHandle = pdfium.FPDF_LoadPage(documentHandle, pageIndex);
      if (!pageHandle) continue;
      pageHandles.push(pageHandle);
      const textHandle = pdfium.FPDFText_LoadPage(pageHandle);
      if (!textHandle) continue;
      textHandles.push(textHandle);
      const width = pdfium.FPDF_GetPageWidth(pageHandle);
      const height = pdfium.FPDF_GetPageHeight(pageHandle);
      const glyphs: PdfiumGlyph[] = [];
      const characterCount = pdfium.FPDFText_CountChars(textHandle);
      let pageText = '';
      for (let index = 0; index < characterCount; index += 1) {
        const codepoint = pdfium.FPDFText_GetUnicode(textHandle, index);
        const text = codepoint > 0 && codepoint <= 0x10ffff ? String.fromCodePoint(codepoint) : '';
        pageText += text;
        if (!text || !pdfium.FPDFText_GetCharBox(textHandle, index, boundsPointer, boundsPointer + 8, boundsPointer + 16, boundsPointer + 24)) continue;
        glyphs.push({
          text,
          index,
          left: runtime.getValue(boundsPointer, 'double'),
          right: runtime.getValue(boundsPointer + 8, 'double'),
          bottom: runtime.getValue(boundsPointer + 16, 'double'),
          top: runtime.getValue(boundsPointer + 24, 'double'),
        });
      }
      const idAnchors = nationalIdAnchorItems(glyphs, pageNumber);
      const items = [
        ...glyphsToTextItems(glyphs, pageNumber).filter((item) =>
          !/^\d+$/.test(normalizeDigits(item.text)) || !idAnchors.some((anchor) =>
            Math.abs(anchor.y - item.y) <= 3 && item.x < anchor.x + anchor.width && item.x + item.width > anchor.x
          )
        ),
        ...idAnchors,
      ];
      if (items.length) pageCountWithText += 1;
      const lines = buildPdfVisualLines(items);
      const heading = findHeading(lines.filter((line) => line.y >= height * 0.65));
      const pageYear = normalizeRosterSchoolYear(pageText);
      if (pageYear && !documentYear) documentYear = pageYear;
      const diagnostic: PdfPageDiagnostic = {
        pageNumber,
        headingDetected: Boolean(heading),
        grade: heading?.grade,
        section: heading?.section,
        headerAnchors: 0,
        rowsDetected: 0,
        continuation: !heading && Boolean(currentGroup),
      };
      const detectedColumns = detectHeaderGeometry(lines);
      diagnostic.headerAnchors = detectedColumns?.length || 0;
      const proposedGeometry = detectedColumns
        ? { width, height, columns: detectedColumns }
        : inferDataDrivenGeometry(lines, width, height);
      let geometry = proposedGeometry || previousGeometry;
      if (!geometry || !sameGeometry(geometry, width, height)) {
        pageDiagnostics.push(diagnostic);
        continue;
      }

      const dataLines = studentTableLines(lines, geometry);
      const anchorGaps = idAnchors.map((anchor, index) => index ? idAnchors[index - 1].y - anchor.y : Number.POSITIVE_INFINITY)
        .filter((gap) => Number.isFinite(gap) && gap > 2)
        .sort((a, b) => a - b);
      const anchorWindow = anchorGaps.length
        ? Math.min(6, Math.max(3, anchorGaps[Math.floor(anchorGaps.length / 2)] * 0.3))
        : 6;
      const rowItems = idAnchors.length
        ? [...idAnchors].sort((a, b) => b.y - a.y).map((anchor) =>
          items.filter((item) => Math.abs(item.y - anchor.y) <= anchorWindow)
            .sort((a, b) => a.x - b.x)
        )
        : splitRows(dataLines, geometry);
      const firstOrder = rowItems[0] ? rowOrderValue(rowItems[0], geometry) : undefined;
      const beginsNewGroup = !heading && Boolean(currentGroup) && firstOrder === 1 && (previousLastOrder || 0) > 1;
      const headingKey = heading ? `${heading.grade}|${heading.section}` : null;
      const headingMatchesCurrent = Boolean(headingKey && headingKey === currentGroupKey);
      const aboveFirstId = rowItems[0]
        ? rowItems[0].length && rowItems[0].find((item) => normalizedDigitsIn(item).length >= 14)
        : undefined;
      const firstRowY = aboveFirstId?.y ?? Number.NEGATIVE_INFINITY;
      const headerCharactersAboveFirstRow = items
        .filter((item) => item.y > firstRowY + 6 && /\p{L}/u.test(item.text))
        .reduce((count, item) => count + item.text.length, 0);
      const structuralStart = Boolean(currentGroup && firstOrder === 1 && headerCharactersAboveFirstRow >= 25);
      const startsGroup = Boolean(heading && !headingMatchesCurrent) || !currentGroup || beginsNewGroup || structuralStart;

      if (proposedGeometry && previousGeometry && !startsGroup && !sameColumnGeometry(previousGeometry, proposedGeometry)) {
        geometry = previousGeometry;
      }
      if (proposedGeometry && (startsGroup || !previousGeometry)) {
        previousGeometry = proposedGeometry;
        geometry = proposedGeometry;
      } else if (previousGeometry) geometry = previousGeometry;

      if (startsGroup) {
        rowOffset = 0;
        groupSequence += 1;
        if (heading) {
          currentGroup = { ...heading, pageStart: pageNumber };
          currentGroupKey = `group-${groupSequence}`;
          documentYear = heading.schoolYear || documentYear;
        } else {
          currentGroup = {
            groupName: `القائمة ${groupSequence} — تحتاج إلى تحديد المستوى والقسم`,
            pageStart: pageNumber,
          };
          currentGroupKey = `group-${groupSequence}`;
        }
        ensurePreview(currentGroupKey!, currentGroup);
      } else if (heading && headingKey) {
        currentGroup = { ...heading, pageStart: pageNumber };
        currentGroupKey = currentGroupKey || `group-${groupSequence}`;
        documentYear = heading.schoolYear || documentYear;
        ensurePreview(currentGroupKey, currentGroup);
      }
      if (!currentGroup || !currentGroupKey) {
        pageDiagnostics.push(diagnostic);
        continue;
      }
      diagnostic.grade = currentGroup.grade;
      diagnostic.section = currentGroup.section;
      diagnostic.continuation = !startsGroup;

      diagnostic.rowsDetected = rowItems.length;
      const target = previewsByGroup.get(currentGroupKey);
      if (!target || !rowItems.length) {
        pageDiagnostics.push(diagnostic);
        continue;
      }
      const parsed = parseStudentRows(
        rowItems,
        geometry,
        currentGroup.grade,
        currentGroup.groupName,
        currentGroup.schoolYear || documentYear,
        rowOffset
      );
      rowOffset += rowItems.length;
      target.students.push(...parsed.students);
      target.invalidRows.push(...parsed.invalidRows);
      target.pageEnd = pageNumber;
      target.schoolYear = currentGroup.schoolYear || documentYear;
      target.metadataStatus = target.grade && target.section && target.schoolYear ? 'DETECTED' : 'NEEDS_REVIEW';
      previousLastOrder = rowOrderValue(rowItems.at(-1)!, geometry) ?? previousLastOrder;
      pageDiagnostics.push(diagnostic);
    }

    if (!pageCountWithText)
      throw new StudentRosterPdfImportError(
        'SCANNED_PDF',
        'هذا الملف عبارة عن صور ممسوحة ضوئياً ولا يحتوي نصاً قابلاً للاستخراج. يرجى استخدام ملف PDF الأصلي الصادر عن الإدارة أو ملف Excel.'
      );
    const previews = [...previewsByGroup.values()];
    if (!previews.length || previews.every((preview) => !preview.students.length && !preview.invalidRows.length))
      throw new StudentRosterPdfImportError(
        'INVALID_STRUCTURE',
        'تعذر التعرف على بنية ملف PDF أو عناوين الأعمدة. يرجى مراجعة الملف أو استخدام Excel.'
      );
    for (const preview of previews) {
      preview.schoolYear ||= documentYear;
      preview.metadataStatus = preview.grade && preview.section && preview.schoolYear ? 'DETECTED' : 'NEEDS_REVIEW';
    }
      return { pageCount, schoolYear: documentYear, previews, pageDiagnostics };
    } catch (error) {
      if (error instanceof StudentRosterPdfImportError) throw error;
      throw new StudentRosterPdfImportError('INVALID_PDF', 'تعذر فتح ملف PDF أو أنه تالف.');
    } finally {
      for (const textHandle of textHandles.reverse()) pdfium.FPDFText_ClosePage(textHandle);
      for (const pageHandle of pageHandles.reverse()) pdfium.FPDF_ClosePage(pageHandle);
      if (documentHandle) pdfium.FPDF_CloseDocument(documentHandle);
      runtime._free(boundsPointer);
      runtime._free(dataPointer);
    }
  }, permit);
}

export function canonicalPdfGroupIdentity(levelId: string, groupName: string) {
  return `${levelId}|${normalizeImportedClassName(groupName).replace(/\s+(\d{1,2})$/, (_, n) => ` ${String(Number(n))}`)}`;
}
