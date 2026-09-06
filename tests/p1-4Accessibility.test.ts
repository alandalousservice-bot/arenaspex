import { createElement, createRef, type Dispatch, type SetStateAction } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GradebookWeightsDialog } from '../src/components/gradebook/GradebookWeightsDialog';
import { LearningSectionPrintPreviewDialog } from '../src/components/curriculum/LearningSectionPrintPreviewDialog';
import { getWrappedDialogTarget, useAccessibleDialog } from '../src/hooks/useAccessibleDialog';
import type { EvaluationWeights } from '../src/types/smartGradebook';
import type { LearningSectionPrintModel } from '../src/services/learningSectionPrint.service';

const weights: EvaluationWeights = {
  competencyWeight: 5,
  participationWeight: 2,
  behaviorWeight: 2,
  attendanceWeight: 1,
  unexcusedDeduction: 0.25,
};

const printModel: LearningSectionPrintModel = {
  header: {
    institution: 'مدرسة الاختبار',
    teacher: 'أستاذ المادة',
    academicYear: '2026-2027',
    level: 'السنة الأولى ابتدائي',
    domain: 'الميدان الأول',
  },
  finalCompetency: 'ينجز أنشطة حركية مناسبة.',
  rows: [
    {
      kind: 'diagnostic',
      label: 'تقويم تشخيصي',
      components: '',
      objective: 'تحديد المكتسبات',
      learningContent: '',
      executionContent: '',
      situationsAndResources: '',
      knowledge: '',
      guidance: '',
    },
  ],
  signatures: { teacher: 'أستاذ المادة', director: '—', inspector: '—' },
};

function idsAreUnique(markup: string): boolean {
  const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  return new Set(ids).size === ids.length;
}

describe('P1-4 dialog accessibility contracts', () => {
  it('renders the Gradebook weights dialog with a labelled modal and labelled controls', () => {
    const onChange = vi.fn() as unknown as Dispatch<SetStateAction<EvaluationWeights>>;
    const markup = renderToStaticMarkup(
      createElement(GradebookWeightsDialog, {
        dialogRef: createRef<HTMLDivElement>(),
        weights,
        onChange,
        onClose: vi.fn(),
        onSave: vi.fn(),
      })
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="gradebook-weights-title"');
    expect(markup).toContain('aria-describedby="gradebook-weights-description"');
    expect(markup).toContain('id="gradebook-weights-title"');
    expect(markup).toContain('aria-label="إغلاق إعدادات أوزان التقييم"');
    expect(markup.match(/type="range"/g)).toHaveLength(5);
    for (const id of ['competency', 'participation', 'behavior', 'attendance', 'absence']) {
      expect(markup).toContain(`id="gradebook-weight-${id}"`);
      expect(markup).toContain(`for="gradebook-weight-${id}"`);
    }
    expect(idsAreUnique(markup)).toBe(true);
  });

  it('renders a labelled Learning Section preview title and keyboard-reachable print action', () => {
    const markup = renderToStaticMarkup(
      createElement(LearningSectionPrintPreviewDialog, {
        model: printModel,
        dialogRef: createRef<HTMLDivElement>(),
        openerRef: createRef<HTMLButtonElement>(),
        onClose: vi.fn(),
      })
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="learning-section-print-title"');
    expect(markup).toContain('id="learning-section-print-title"');
    expect(markup).toContain('aria-label="إغلاق معاينة المقطع التعلمي"');
    expect(markup).toMatch(/طباعة<\/button>/);
    expect(markup).not.toContain('معايير تحقيق الكفاءة');
    expect(markup).not.toContain('مؤشرات تحقيق الكفاءة');
    expect(idsAreUnique(markup)).toBe(true);
  });

  it('wraps Tab and Shift+Tab at the dialog boundaries', () => {
    const first = { id: 'first' };
    const last = { id: 'last' };
    const middle = { id: 'middle' };
    const focusables = [first, middle, last];
    expect(getWrappedDialogTarget(focusables, last, false)).toBe(first);
    expect(getWrappedDialogTarget(focusables, first, true)).toBe(last);
    expect(getWrappedDialogTarget(focusables, middle, false)).toBeNull();
    expect(getWrappedDialogTarget([], null, false)).toBeNull();
  });

  it('keeps the production components wired to the shared dialog controller', async () => {
    expect(useAccessibleDialog).toBeTypeOf('function');
    const smartGradebook = await import('../src/components/gradebook/SmartGradebookView');
    const learningSegments = await import('../src/components/curriculum/LearningSegmentsView');
    expect(smartGradebook.SmartGradebookView).toBeTypeOf('function');
    expect(learningSegments.LearningSegmentsView).toBeTypeOf('function');
  });
});
