import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const mockExportWord = vi.hoisted(() => vi.fn());
vi.mock('../src/services/lessonPlanWordExport.service', () => ({
  exportLessonPlanToWord: mockExportWord,
}));

import { exportLessonPlanToWord } from '../src/services/lessonPlanExport.service';

const lightService = readFileSync('src/services/lessonPlanExport.service.ts', 'utf8');
const heavyService = readFileSync('src/services/lessonPlanWordExport.service.ts', 'utf8');
const view = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');

describe('P2-3B action-level DOCX loading', () => {
  it('keeps the DOCX dependency behind the action boundary', () => {
    expect(lightService).not.toMatch(/from ['"]docx['"]/);
    expect(lightService).toContain("await import('./lessonPlanWordExport.service')");
    expect(heavyService).toContain("from 'docx'");
    expect(view).toContain('handleWordExport');
    expect(view).toContain('onClick={() => void handleWordExport(plan)}');
    expect(view).toContain('exportLessonPlanToPdf(plan)');
  });

  it('invokes the dynamically loaded exporter and preserves failures for the UI boundary', async () => {
    const plan = { id: 'plan-1' } as Parameters<typeof exportLessonPlanToWord>[0];
    mockExportWord.mockResolvedValueOnce(undefined);
    await exportLessonPlanToWord(plan);
    expect(mockExportWord).toHaveBeenCalledWith(plan);

    mockExportWord.mockRejectedValueOnce(new Error('load failed'));
    await expect(exportLessonPlanToWord(plan)).rejects.toThrow('load failed');
    expect(view).toContain('تعذر تصدير المذكرة بصيغة Word. حاول مرة أخرى.');
  });

  it('keeps the existing semantic DOCX generator and print path separate', () => {
    expect(heavyService).toContain('buildLessonPlanDocx');
    expect(heavyService).toContain('Packer.toBlob');
    expect(lightService).toContain('renderLessonMemoHtml');
    expect(lightService).toContain('exportLessonPlanToPdf');
    expect(lightService).not.toContain('Packer');
  });
});
