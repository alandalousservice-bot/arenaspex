import type {
  GeneratedPedagogicalSituationCandidate,
  PedagogicalGenerationContext,
  PedagogicalGenerationProvider,
} from '../pedagogicalGeneration.service.js';
import { configuredGeminiModel } from './geminiRuntimeConfig.js';

const candidateSchema = {
  type: 'OBJECT',
  properties: {
    objectiveText: { type: 'STRING' },
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    shortDescription: { type: 'STRING' },
    pedagogicalIdea: { type: 'STRING' },
    organization: { type: 'STRING' },
    equipment: { type: 'ARRAY', items: { type: 'STRING' } },
    instructions: { type: 'STRING' },
    learnerInstruction: { type: 'STRING' },
    executionSteps: { type: 'ARRAY', items: { type: 'STRING' } },
    executionConditions: { type: 'STRING' },
    successCriteria: { type: 'STRING' },
    observationIndicators: { type: 'STRING' },
    variants: { type: 'STRING' },
    durationMinutes: { type: 'INTEGER', nullable: true },
    studentCountGuidance: { type: 'STRING' },
    grouping: { type: 'STRING' },
    phase: { type: 'STRING' },
    motorSkills: { type: 'ARRAY', items: { type: 'STRING' } },
    requirements: { type: 'ARRAY', items: { type: 'STRING' } },
    difficulty: { type: 'STRING' },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    safetyNotes: { type: 'ARRAY', items: { type: 'STRING' } },
    proposedRelationType: { type: 'STRING' },
    servedObjectiveIds: { type: 'ARRAY', items: { type: 'STRING' } },
    servedObjectiveLabels: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'title',
    'description',
    'shortDescription',
    'pedagogicalIdea',
    'organization',
    'equipment',
    'instructions',
    'learnerInstruction',
    'executionSteps',
    'executionConditions',
    'successCriteria',
    'observationIndicators',
    'variants',
    'durationMinutes',
    'studentCountGuidance',
    'grouping',
    'phase',
    'motorSkills',
    'requirements',
    'difficulty',
    'tags',
    'safetyNotes',
    'proposedRelationType',
    'servedObjectiveIds',
    'servedObjectiveLabels',
  ],
} as const;

const objectiveSchema = {
  type: 'OBJECT',
  properties: { objectiveText: { type: 'STRING' } },
  required: ['objectiveText'],
} as const;

const safeContext = (context: PedagogicalGenerationContext) => ({
  gradeId: context.gradeId,
  domainId: context.domainId,
  finalCompetencyId: context.finalCompetencyId,
  finalCompetency: context.finalCompetency,
  objectiveIds: context.objectiveIds,
  objectiveLabels: context.objectiveLabels,
  objectiveRequirements: context.objectiveRequirements,
  objectiveExecutionContent: context.objectiveExecutionContent,
  requirements: context.requirements,
  motorSkills: context.motorSkills,
  lessonType: context.lessonType,
  assessmentScope: context.assessmentScope,
  durationMinutes: context.durationMinutes,
  equipment: context.availableEquipment,
  groupingPreference: context.groupingPreference,
  difficulty: context.difficulty,
  teacherInstruction: context.teacherInstruction,
});

export class GeminiPedagogicalGenerationProvider implements PedagogicalGenerationProvider {
  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly model = configuredGeminiModel()
  ) {
    if (!apiKey) throw new Error('GENERATION_API_KEY_MISSING');
  }

  generate(_context: PedagogicalGenerationContext): GeneratedPedagogicalSituationCandidate {
    throw new Error('GENERATION_ASYNC_REQUIRED');
  }

  async generateAsync(
    context: PedagogicalGenerationContext
  ): Promise<GeneratedPedagogicalSituationCandidate> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.GEMINI_PEDAGOGICAL_TIMEOUT_MS) || 45000
    );
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey!)}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: JSON.stringify({
                      instruction:
                        context.intent === 'GENERATE_OBJECTIVE' ||
                        context.intent === 'REFORMULATE_OBJECTIVE'
                          ? 'أعد صياغة هدف تربوي واحد بالعربية فقط داخل JSON بالمخطط المحدد.'
                          : 'أعد موقفًا تربويًا بالعربية وفق السياق المرجعي فقط. أعد JSON مطابقًا للمخطط، ولا تغيّر أي معرف canonical.',
                      context: safeContext(context),
                    }),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
              responseSchema:
                context.intent === 'GENERATE_OBJECTIVE' ||
                context.intent === 'REFORMULATE_OBJECTIVE'
                  ? objectiveSchema
                  : candidateSchema,
            },
          }),
        }
      );
      if (!response.ok) throw new Error(`GEMINI_HTTP_${response.status}`);
      const body = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();
      if (!text) throw new Error('GENERATION_EMPTY_RESPONSE');
      const raw = JSON.parse(text) as Omit<
        GeneratedPedagogicalSituationCandidate,
        'gradeId' | 'domainId' | 'finalCompetencyId' | 'situationType' | 'lessonType' | 'governance'
      >;
      return {
        ...raw,
        gradeId: context.gradeId,
        domainId: context.domainId,
        finalCompetencyId: context.finalCompetencyId,
        situationType: 'PEDAGOGICAL_SITUATION',
        lessonType: context.lessonType,
        servedObjectiveIds: [...context.objectiveIds],
        servedObjectiveLabels: [...context.objectiveLabels],
        proposedRelationType:
          context.lessonType === 'INTEGRATIVE'
            ? 'INTEGRATIVE'
            : context.lessonType === 'DIAGNOSTIC' || context.lessonType === 'SUMMATIVE'
              ? 'ASSESSMENT'
              : 'DIRECT',
        governance: {
          visibility: 'PERSONAL',
          approvalStatus: 'PERSONAL',
          productionEligibility: 'REVIEW_ONLY',
          autoPublic: false,
          autoApproved: false,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
