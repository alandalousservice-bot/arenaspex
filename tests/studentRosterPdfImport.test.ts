import { describe, expect, it } from 'vitest';
import {
  canonicalClassIdentityKey,
  normalizeRosterSchoolYear,
} from '../src/services/studentRosterImport.service';
import {
  MAX_STUDENT_ROSTER_PDF_BYTES,
  parseStudentRosterPdf,
  reservePdfiumJob,
  StudentRosterPdfImportError,
} from '../src/services/studentRosterPdfImport.service';

interface Cell {
  x: number;
  y: number;
  text: string;
}

function makePage(cells: Cell[]): string {
  return cells
    .map(
      ({ x, y, text }) =>
        `BT /F1 9 Tf 1 0 0 1 ${x} ${y} Tm (${text.replace(/[\\()]/g, '\\$&')}) Tj ET`
    )
    .join('\n');
}

function makePdf(pageContents: string[]): Buffer {
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageContents.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pageContents.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  pageContents.forEach((content, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const stream = Buffer.from(content, 'ascii');
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${stream.length} >>\nstream\n${content}\nendstream`;
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'ascii');
}

function heading(grade: number, section: string, year = '2026-2027'): Cell[] {
  return [{ x: 100, y: 790, text: `Student List Grade ${grade} Primary Section ${section} ${year}` }];
}

const headers: Cell[] = [
  { x: 510, y: 710, text: 'Order' },
  { x: 365, y: 710, text: 'National ID' },
  { x: 280, y: 710, text: 'Registration' },
  { x: 200, y: 710, text: 'Last Name' },
  { x: 105, y: 710, text: 'First Name' },
  { x: 25, y: 710, text: 'Birth Date' },
];

function studentRow(order: number, id = `110172000000${String(order).padStart(4, '0')}`): Cell[] {
  const y = 680 - (order - 1) * 18;
  return [
    { x: 520, y, text: String(order) },
    { x: 365, y, text: id },
    { x: 285, y, text: String(2000 + order) },
    { x: 200, y, text: 'Ben Ali' },
    { x: 105, y, text: 'Mohamed Anes' },
    { x: 25, y, text: '2018-01-02' },
  ];
}

function makeRosterPage(
  orders: number[],
  options: { grade?: number; section?: string; includeHeader?: boolean } = {}
) {
  const cells = [
    ...(options.grade && options.section ? heading(options.grade, options.section) : []),
    ...(options.includeHeader === false ? [] : headers),
    ...orders.flatMap((order) => studentRow(order)),
  ];
  return makePage(cells);
}

describe('position-aware text PDF roster parser', () => {
  it('parses a one-page class and preserves full national identity over local registration', async () => {
    const pdf = makePdf([makeRosterPage([1, 2, 3], { grade: 1, section: '01' })]);
    const result = await parseStudentRosterPdf(pdf);
    expect(result.pageCount).toBe(1);
    expect(result.schoolYear).toBe('2026-2027');
    expect(result.previews).toHaveLength(1);
    expect(result.previews[0]).toMatchObject({ grade: 1, section: '01', groupName: 'السنة الأولى ابتدائي 01' });
    expect(result.previews[0].students).toHaveLength(3);
    expect(result.previews[0].students[0]).toMatchObject({
      matricule: '1101720000000001',
      lastName: 'Ben Ali',
      firstName: 'Mohamed Anes',
      birthDate: '2018-01-02',
      grade: 1,
      schoolYear: '2026-2027',
    });
  });

  it('continues one class across a page without repeated title or column header', async () => {
    const result = await parseStudentRosterPdf(
      makePdf([
        makeRosterPage(Array.from({ length: 15 }, (_, i) => i + 1), {
          grade: 4,
          section: '01',
        }),
        makeRosterPage(Array.from({ length: 5 }, (_, i) => i + 16), { includeHeader: false }),
      ])
    );
    expect(result.previews).toHaveLength(1);
    expect(result.previews[0].students).toHaveLength(20);
    expect(result.previews[0].students.at(-1)?.matricule).toBe('1101720000000020');
  });

  it('keeps distinct sections of the same grade as separate classes', async () => {
    const result = await parseStudentRosterPdf(
      makePdf([
        makeRosterPage([1, 2], { grade: 1, section: '01' }),
        makeRosterPage([1, 2], { grade: 1, section: '02' }),
      ])
    );
    expect(result.previews.map((item) => item.section)).toEqual(['01', '02']);
    expect(result.previews.map((item) => item.students.length)).toEqual([2, 2]);
  });

  it('prefills confidently detected metadata and marks unidentified metadata for review', async () => {
    const detected = await parseStudentRosterPdf(makePdf([makeRosterPage([1], { grade: 3, section: '04' })]));
    expect(detected.previews[0]).toMatchObject({
      grade: 3,
      section: '04',
      schoolYear: '2026-2027',
      metadataStatus: 'DETECTED',
    });

    const unidentified = await parseStudentRosterPdf(makePdf([makeRosterPage([1]) ]));
    expect(unidentified.previews[0]).toMatchObject({
      metadataStatus: 'NEEDS_REVIEW',
    });
    expect(unidentified.previews[0].grade).toBeUndefined();
    expect(unidentified.previews[0].section).toBeUndefined();
    expect(unidentified.previews[0].schoolYear).toBeUndefined();
  });

  it('normalizes year separators and considers section 01 and 1 identical', () => {
    expect(normalizeRosterSchoolYear('2026 / 2027')).toBe('2026-2027');
    expect(normalizeRosterSchoolYear('2026-2028')).toBeUndefined();
    expect(canonicalClassIdentityKey('lvl_p1', 'السنة الأولى ابتدائي 01')).toBe(
      canonicalClassIdentityKey('lvl_p1', 'أولى ابتدائي 1')
    );
  });

  it('returns a controlled scanned-PDF message when no text layer exists', async () => {
    await expect(parseStudentRosterPdf(makePdf(['']))).rejects.toMatchObject({
      code: 'SCANNED_PDF',
      message: expect.stringContaining('صور ممسوحة'),
    });
  });

  it('rejects corrupt and oversized PDF payloads before parsing', async () => {
    await expect(parseStudentRosterPdf(Buffer.from('not a pdf'))).rejects.toMatchObject({
      code: 'INVALID_PDF',
    });
    const oversized = Buffer.alloc(MAX_STUDENT_ROSTER_PDF_BYTES + 1);
    oversized.write('%PDF-');
    await expect(parseStudentRosterPdf(oversized)).rejects.toBeInstanceOf(
      StudentRosterPdfImportError
    );
    await expect(parseStudentRosterPdf(oversized)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
    });
  });

  it('releases a pre-body queue reservation when PDF validation fails', async () => {
    const permit = reservePdfiumJob();
    expect(permit).toBeDefined();
    await expect(parseStudentRosterPdf(Buffer.from('not a pdf'), permit)).rejects.toMatchObject({
      code: 'INVALID_PDF',
    });
    const available = [reservePdfiumJob(), reservePdfiumJob(), reservePdfiumJob()];
    expect(available.every(Boolean)).toBe(true);
    available.forEach((entry) => entry?.release());
  });
});
