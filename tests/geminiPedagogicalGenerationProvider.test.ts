import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiPedagogicalGenerationProvider } from '../src/services/providers/geminiPedagogicalGeneration.provider';
import { resolveConfiguredPedagogicalGenerationProvider } from '../src/services/providers/pedagogicalGenerationProviderResolver';

const context = {
  intent: 'GENERATE_FOR_OBJECTIVE',
  gradeId: 'lvl_p1',
  gradeName: 'السنة الأولى',
  domainId: 'f_fundamentals',
  domainName: 'الحركات القاعدية',
  finalCompetencyId: 'fc_lvl_p1_f_fundamentals',
  finalCompetency: 'كفاءة',
  objectiveIds: ['G1-D2-OBJ-01'],
  objectiveLabels: ['هدف'],
  objectiveRequirements: [],
  objectiveExecutionContent: [],
  lessonType: 'LEARNING',
  motorSkills: [],
  requirements: [],
  equipment: [],
  availableEquipment: [],
  durationMinutes: 40,
  studentCount: null,
  groupingPreference: '',
  difficulty: 'متوسط',
  recentSituationIds: [],
  recentSituationTitles: [],
  sourceSituationId: null,
  teacherInstruction: '',
} as any;

const candidate = {
  title: 'موقف',
  description: 'وصف',
  shortDescription: 'مختصر',
  pedagogicalIdea: 'فكرة',
  organization: 'أفواج',
  equipment: [],
  instructions: 'تعليمات',
  learnerInstruction: 'أنجز',
  executionSteps: ['خطوة'],
  executionConditions: 'شروط',
  successCriteria: 'نجاح',
  observationIndicators: 'مؤشرات',
  variants: 'تنويع',
  durationMinutes: 40,
  studentCountGuidance: 'أفواج',
  grouping: 'أفواج',
  phase: 'المرحلة الرئيسية',
  motorSkills: [],
  requirements: [],
  difficulty: 'متوسط',
  tags: [],
  safetyNotes: [],
  proposedRelationType: 'DIRECT',
  servedObjectiveIds: ['G1-D2-OBJ-01'],
  servedObjectiveLabels: ['هدف'],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('governed Gemini provider', () => {
  it('resolves Gemini without selecting OpenAI and preserves canonical fields', async () => {
    vi.stubEnv('PEDAGOGICAL_GENERATION_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    expect(resolveConfiguredPedagogicalGenerationProvider()).toBeInstanceOf(
      GeminiPedagogicalGenerationProvider
    );
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: JSON.stringify(candidate) }] } }],
            }),
            { status: 200 }
          )
        )
    );
    const result = await new GeminiPedagogicalGenerationProvider().generateAsync(context);
    expect(result.gradeId).toBe(context.gradeId);
    expect(result.domainId).toBe(context.domainId);
    expect(result.servedObjectiveIds).toEqual(context.objectiveIds);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('generateContent');
  });

  it('fails safely when Gemini configuration is missing', () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    expect(() => new GeminiPedagogicalGenerationProvider()).toThrow('GENERATION_API_KEY_MISSING');
  });

  it('fails safely on malformed structured output', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ candidates: [{ content: { parts: [{ text: '{bad' }] } }] }),
            { status: 200 }
          )
        )
    );
    await expect(new GeminiPedagogicalGenerationProvider().generateAsync(context)).rejects.toThrow(
      SyntaxError
    );
  });
});
