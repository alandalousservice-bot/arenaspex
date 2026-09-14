import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getObjectiveBank } from '../src/data/objectiveBankRegistry';
import {
  buildPedagogicalGenerationContext,
  generatePedagogicalSituationAsync,
} from '../src/services/pedagogicalGeneration.service';
import { resolveConfiguredPedagogicalGenerationProvider } from '../src/services/providers/pedagogicalGenerationProviderResolver';

const create = vi.fn();
vi.mock('openai', () => ({
  default: class OpenAI {
    responses = { create };
    constructor(_options: unknown) {}
  },
}));

const objectiveId = getObjectiveBank('lvl_p1', 'f_locomotion')[0].id;
const request = {
  intent: 'GENERATE_FOR_OBJECTIVE' as const,
  gradeId: 'lvl_p1',
  domainId: 'f_locomotion',
  objectiveIds: [objectiveId],
  finalCompetencyId: 'fc_lvl_p1_f_locomotion',
  lessonType: 'LEARNING' as const,
  motorSkills: ['الجري'],
  requirements: [],
  equipment: ['أقماع'],
  durationMinutes: 45,
  studentCount: 20,
  recentSituationIds: [],
  availableEquipment: ['أقماع'],
};

const responseCandidate = (overrides: Record<string, unknown> = {}) => ({
  title: 'مسار الجري',
  description: 'وضعية جري',
  shortDescription: 'جري منظم',
  pedagogicalIdea: 'تنظيم الجري',
  organization: 'أفواج',
  equipment: ['أقماع'],
  instructions: 'انطلق عند الإشارة',
  learnerInstruction: 'أنجز المسار',
  executionSteps: ['ينطلق المتعلم', 'يعود بهدوء'],
  executionConditions: 'مسار آمن',
  successCriteria: 'ينجز بدقة',
  observationIndicators: 'التحكم في المسار',
  variants: 'تقليل المسافة',
  durationMinutes: 45,
  studentCountGuidance: 'أفواج',
  grouping: 'أفواج',
  phase: 'الرئيسية',
  motorSkills: ['الجري'],
  requirements: [],
  difficulty: 'متوسط',
  tags: [],
  safetyNotes: ['احترام المسافة'],
  proposedRelationType: 'DIRECT',
  servedObjectiveIds: ['wrong-id'],
  servedObjectiveLabels: ['اختبار'],
  ...overrides,
});

describe('OpenAI pedagogical provider boundary', () => {
  beforeEach(() => {
    create.mockReset();
    process.env.OPENAI_API_KEY = 'test-only';
    process.env.OPENAI_PEDAGOGICAL_MODEL = 'configured-test-model';
  });
  it('uses Responses Structured Outputs with store=false and reattaches canonical identity', async () => {
    create.mockResolvedValue({ output_text: JSON.stringify(responseCandidate()) });
    const { OpenAIPedagogicalGenerationProvider } =
      await import('../src/services/providers/openaiPedagogicalGeneration.provider');
    const result = await generatePedagogicalSituationAsync(
      request,
      new OpenAIPedagogicalGenerationProvider()
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        store: false,
        text: { format: expect.objectContaining({ type: 'json_schema', strict: true }) },
      })
    );
    expect(result.candidate.gradeId).toBe(request.gradeId);
    expect(result.candidate.servedObjectiveIds).toEqual([objectiveId]);
  });
  it('does not resolve deterministic provider in production without explicit configuration', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.PEDAGOGICAL_GENERATION_PROVIDER;
    delete process.env.PEDAGOGICAL_GENERATION_ALLOW_LOCAL;
    expect(resolveConfiguredPedagogicalGenerationProvider()).toBeNull();
    process.env.NODE_ENV = previous;
  });
  it('rejects provider output that fails the canonical candidate contract', async () => {
    create.mockResolvedValue({
      output_text: JSON.stringify(responseCandidate({ executionSteps: [] })),
    });
    const { OpenAIPedagogicalGenerationProvider } =
      await import('../src/services/providers/openaiPedagogicalGeneration.provider');
    await expect(
      generatePedagogicalSituationAsync(request, new OpenAIPedagogicalGenerationProvider())
    ).rejects.toThrow('GENERATION_EXECUTION_INCOMPLETE');
  });
  it('passes only minimized canonical context to the provider prompt', () => {
    const context = buildPedagogicalGenerationContext(request);
    expect(context).not.toHaveProperty('studentIds');
    expect(context).not.toHaveProperty('teacherId');
  });
});
