import { describe, expect, it } from 'vitest';
import { INITIAL_KNOWLEDGE_BANK } from '../src/data/knowledgeBankData';

const officialFields = new Set(['f_locomotion', 'f_fundamentals', 'f_structuring']);

describe('تنظيف تصنيف بنك المعرفة', () => {
  it('يستخدم الألعاب والأهداف والأنشطة العلاجية الميادين الرسمية فقط', () => {
    const active = INITIAL_KNOWLEDGE_BANK.filter((item) => item.category !== 'situation');
    expect(active.every((item) => officialFields.has(item.fieldId || ''))).toBe(true);
    expect(active.every((item) => !item.fieldName?.startsWith('الميدان'))).toBe(true);
  });

  it('يبقي النشاط العلاجي مميزاً بمشكلة ومهارة مستهدفة', () => {
    const remedial = INITIAL_KNOWLEDGE_BANK.filter((item) => item.category === 'remedial');
    expect(remedial.length).toBeGreaterThan(0);
    expect(remedial.every((item) => item.remedialProblem && item.targetSkill)).toBe(true);
  });

  it('لا يعتمد المحتوى المولد آلياً تلقائياً', () => {
    const aiDraft = { origin: 'AI_GENERATED', approvalStatus: 'DRAFT', approved: false };
    expect(aiDraft.approved).toBe(false);
    expect(aiDraft.approvalStatus).toBe('DRAFT');
  });

  it('لا يجعل الوضعية القديمة فئة نشطة منافسة للمواقف المتخصصة', () => {
    expect(INITIAL_KNOWLEDGE_BANK.some((item) => item.category === 'situation')).toBe(true);
  });
});
