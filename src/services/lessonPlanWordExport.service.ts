import {
  AlignmentType,
  BorderStyle,
  Document,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { LessonPlan } from '../types/spex';
import {
  generateLessonMemoDocument,
  type LessonMemoDocument,
} from './lessonPlan.generator.service';

const rtl = (text: string, bold = false) =>
  new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: text || '', bold, rightToLeft: true, size: 22 })],
  });
const border = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
const cell = (text: string, bold = false, fill?: string, rowSpan?: number) =>
  new TableCell({
    rowSpan,
    children: [rtl(text, bold)],
    shading: fill ? { type: ShadingType.SOLID, fill } : undefined,
    borders: { top: border, bottom: border, left: border, right: border },
  });

function documentRows(model: LessonMemoDocument) {
  const result: TableRow[] = [
    new TableRow({
      children: [
        cell('المرحلة التحضيرية', true, 'DBEAFE'),
        cell(model.preparatoryPhase.learningContent, true, 'EFF6FF'),
        cell(model.preparatoryPhase.executionContent),
        cell(`${model.preparatoryPhase.durationMinutes} د`),
        cell(model.preparatoryPhase.guidance),
      ],
    }),
  ];
  model.mainPhase.situations.forEach((situation, index) => {
    result.push(
      new TableRow({
        children: [
          ...(index === 0
            ? [cell('المرحلة الرئيسية', true, 'FED7AA', model.mainPhase.situations.length)]
            : []),
          ...(index === 0
            ? [
                cell(
                  model.mainPhase.learningContent,
                  true,
                  'FFF7ED',
                  model.mainPhase.situations.length
                ),
              ]
            : []),
          cell(
            `الموقف ${String(situation.number).padStart(2, '0')}\n${situation.executionContent}`
          ),
          cell(`${situation.durationMinutes} د`),
          cell(situation.guidance),
        ],
      })
    );
  });
  result.push(
    new TableRow({
      children: [
        cell('المرحلة الختامية', true, 'DCFCE7'),
        cell(model.finalPhase.learningContent, true, 'F0FDF4'),
        cell(model.finalPhase.executionContent),
        cell(`${model.finalPhase.durationMinutes} د`),
        cell(model.finalPhase.guidance),
      ],
    })
  );
  return result;
}

/** Builds the rich DOCX counterpart from the same normalized memo document. */
export function buildLessonPlanDocx(plan: LessonPlan): Document {
  const model = generateLessonMemoDocument(plan);
  const metadata: [string, string][] = [
    ['المؤسسة', model.header.institution],
    ['المستوى', model.header.grade],
    ['الميدان', model.header.field],
    ['الوسائل', model.header.equipment.join(' – ')],
  ];
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metadata.map(
      ([label, value]) => new TableRow({ children: [cell(label, true, 'E0F2FE'), cell(value)] })
    ),
  });
  const lessonTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ['المراحل', 'محتوى التعلم', 'محتوى الإنجاز', 'الوقت', 'التوجيهات'].map((value) =>
          cell(value, true, '1E293B')
        ),
      }),
      ...documentRows(model),
    ],
  });
  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 15840, height: 12240, orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          rtl(`الحصة ${model.header.sessionNumber}`, true),
          rtl('مذكرة حصة تعلمية', true),
          rtl('التربية البدنية والرياضية'),
          metaTable,
          lessonTable,
          rtl(`المفتش: ${model.signatures.inspectorName}`),
          rtl(`الأستاذ: ${model.signatures.teacherName}`),
        ],
      },
    ],
  });
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportLessonPlanToWord(plan: LessonPlan): Promise<void> {
  download(
    await Packer.toBlob(buildLessonPlanDocx(plan)),
    `مذكرة-${plan.sessionGlobalNumber || ''}.docx`
  );
}
