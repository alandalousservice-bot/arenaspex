import OpenAI from 'openai';
import type {
  GeneratedPedagogicalSituationCandidate,
  PedagogicalGenerationContext,
  PedagogicalGenerationProvider,
} from '../pedagogicalGeneration.service';

const candidateSchema = {
  type: 'object',
  additionalProperties: false,
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
  properties: {
    objectiveText: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    shortDescription: { type: 'string' },
    pedagogicalIdea: { type: 'string' },
    organization: { type: 'string' },
    equipment: { type: 'array', items: { type: 'string' } },
    instructions: { type: 'string' },
    learnerInstruction: { type: 'string' },
    executionSteps: { type: 'array', items: { type: 'string' } },
    executionConditions: { type: 'string' },
    successCriteria: { type: 'string' },
    observationIndicators: { type: 'string' },
    variants: { type: 'string' },
    durationMinutes: { type: ['number', 'null'] },
    studentCountGuidance: { type: 'string' },
    grouping: { type: 'string' },
    phase: { type: 'string' },
    motorSkills: { type: 'array', items: { type: 'string' } },
    requirements: { type: 'array', items: { type: 'string' } },
    difficulty: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    safetyNotes: { type: 'array', items: { type: 'string' } },
    proposedRelationType: { type: 'string', enum: ['DIRECT', 'INTEGRATIVE', 'ASSESSMENT'] },
    servedObjectiveIds: { type: 'array', items: { type: 'string' } },
    servedObjectiveLabels: { type: 'array', items: { type: 'string' } },
  },
} as const;

const promptFor = (context: PedagogicalGenerationContext) =>
  JSON.stringify({
    instruction:
      'أنشئ موقفا تربويا عمليا بالعربية لتربية بدنية ورياضية في المدرسة الابتدائية الجزائرية. التزم بالسياق المرجعي ولا تخترع معرفات أو كفاءات أو معايير.',
    context: {
      gradeId: context.gradeId,
      domainId: context.domainId,
      finalCompetencyId: context.finalCompetencyId,
      finalCompetency: context.finalCompetency,
      objectiveIds: context.objectiveIds,
      objectiveLabels: context.objectiveLabels,
      requirements: context.requirements,
      motorSkills: context.motorSkills,
      lessonType: context.lessonType,
      assessmentScope: context.assessmentScope,
      durationMinutes: context.durationMinutes,
      studentCount: context.studentCount,
      equipment: context.availableEquipment,
      groupingPreference: context.groupingPreference,
      difficulty: context.difficulty,
      recentSituationTitles: context.recentSituationTitles,
      sourceSituation: context.sourceSituation,
    },
    rules: [
      'أعد JSON وفق المخطط فقط',
      'لا تذكر معلومات تقنية أو مزودا',
      'اجعل معيار النجاح قابلا للملاحظة',
      'لا تغيّر المعرفات المرجعية',
    ],
  });

type ProviderFailureClassification =
  | 'AUTH'
  | 'BILLING_QUOTA'
  | 'RATE_LIMIT'
  | 'MODEL_ACCESS'
  | 'BAD_REQUEST'
  | 'STRUCTURED_OUTPUT_SCHEMA'
  | 'REFUSAL'
  | 'INCOMPLETE_RESPONSE'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'PROVIDER_5XX'
  | 'RESPONSE_EXTRACTION'
  | 'UNKNOWN';

const errorMetadata = (error: unknown) => {
  const value = error as Record<string, unknown>;
  const status = typeof value?.status === 'number' ? value.status : null;
  const code = typeof value?.code === 'string' ? value.code : null;
  const type = typeof value?.type === 'string' ? value.type : null;
  const param = typeof value?.param === 'string' ? value.param : null;
  const requestId =
    typeof value?.request_id === 'string'
      ? value.request_id
      : typeof value?.requestId === 'string'
        ? value.requestId
        : null;
  return { status, code, type, param, requestId };
};

export function classifyOpenAIProviderFailure(error: unknown): ProviderFailureClassification {
  const { status, code, type } = errorMetadata(error);
  const marker = `${String(code || '')} ${String(type || '')}`.toLowerCase();
  if (status === 401) return 'AUTH';
  if (status === 429)
    return marker.includes('quota') || marker.includes('billing') ? 'BILLING_QUOTA' : 'RATE_LIMIT';
  if (status && status >= 500) return 'PROVIDER_5XX';
  if (marker.includes('quota') || marker.includes('billing') || marker.includes('insufficient'))
    return 'BILLING_QUOTA';
  if (marker.includes('model') || marker.includes('not_found') || marker.includes('model_not'))
    return 'MODEL_ACCESS';
  if (marker.includes('schema') || marker.includes('structured')) return 'STRUCTURED_OUTPUT_SCHEMA';
  if (status === 400) return 'BAD_REQUEST';
  const errorName = String((error as Record<string, unknown>)?.name || '').toLowerCase();
  if (
    marker.includes('timeout') ||
    marker.includes('timed_out') ||
    marker.includes('etimedout') ||
    errorName.includes('timeout')
  )
    return 'TIMEOUT';
  if (marker.includes('network') || marker.includes('econn') || marker.includes('fetch'))
    return 'NETWORK';
  return 'UNKNOWN';
}

function logProviderFailure(
  classification: ProviderFailureClassification,
  error: unknown,
  durationMs: number,
  extra: Record<string, unknown> = {}
) {
  const metadata = errorMetadata(error);
  console.error(
    JSON.stringify({
      event: 'pedagogical_generation.provider_failure',
      provider: 'openai',
      classification,
      ...metadata,
      responseStatus: extra.responseStatus ?? null,
      incompleteReason: extra.incompleteReason ?? null,
      durationMs,
    })
  );
}

export class OpenAIPedagogicalGenerationProvider implements PedagogicalGenerationProvider {
  private readonly client: OpenAI;
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_PEDAGOGICAL_MODEL
  ) {
    if (!apiKey) throw new Error('GENERATION_API_KEY_MISSING');
    if (!model) throw new Error('GENERATION_MODEL_MISSING');
    this.client = new OpenAI({
      apiKey,
      timeout: Number(process.env.OPENAI_PEDAGOGICAL_TIMEOUT_MS) || 45000,
      maxRetries: Number(process.env.OPENAI_PEDAGOGICAL_MAX_RETRIES) || 1,
    });
  }
  generate(_context: PedagogicalGenerationContext): GeneratedPedagogicalSituationCandidate {
    throw new Error('GENERATION_ASYNC_REQUIRED');
  }
  async generateAsync(
    context: PedagogicalGenerationContext
  ): Promise<GeneratedPedagogicalSituationCandidate> {
    const startedAt = Date.now();
    let response: Awaited<ReturnType<OpenAI['responses']['create']>>;
    try {
      response = await this.client.responses.create({
        model: this.model!,
        store: false,
        input: promptFor(context),
        text: {
          format: {
            type: 'json_schema',
            name: 'pedagogical_situation_candidate',
            strict: true,
            schema: candidateSchema,
          },
        },
      });
    } catch (error) {
      logProviderFailure(classifyOpenAIProviderFailure(error), error, Date.now() - startedAt);
      throw error;
    }
    if (response.status === 'incomplete') {
      logProviderFailure('INCOMPLETE_RESPONSE', null, Date.now() - startedAt, {
        responseStatus: response.status,
        incompleteReason: response.incomplete_details?.reason ?? null,
      });
      throw new Error('GENERATION_INCOMPLETE_RESPONSE');
    }
    if (
      Array.isArray(response.output) &&
      response.output.some(
        (item) => item.type === 'message' && item.content.some((part) => part.type === 'refusal')
      )
    ) {
      logProviderFailure('REFUSAL', null, Date.now() - startedAt, {
        responseStatus: response.status,
      });
      throw new Error('GENERATION_REFUSAL');
    }
    if (!response.output_text) {
      logProviderFailure('RESPONSE_EXTRACTION', null, Date.now() - startedAt, {
        responseStatus: response.status,
      });
      throw new Error('GENERATION_EMPTY_RESPONSE');
    }
    let raw: Omit<
      GeneratedPedagogicalSituationCandidate,
      'gradeId' | 'domainId' | 'finalCompetencyId' | 'situationType' | 'lessonType' | 'governance'
    >;
    try {
      raw = JSON.parse(response.output_text) as Omit<
        GeneratedPedagogicalSituationCandidate,
        'gradeId' | 'domainId' | 'finalCompetencyId' | 'situationType' | 'lessonType' | 'governance'
      >;
    } catch (error) {
      logProviderFailure('RESPONSE_EXTRACTION', error, Date.now() - startedAt, {
        responseStatus: response.status,
      });
      throw error;
    }
    return {
      ...raw,
      gradeId: context.gradeId,
      domainId: context.domainId,
      finalCompetencyId: context.finalCompetencyId,
      situationType: 'PEDAGOGICAL_SITUATION',
      lessonType: context.lessonType,
      servedObjectiveIds: [...context.objectiveIds],
      servedObjectiveLabels: [...context.objectiveLabels],
      governance: {
        visibility: 'PERSONAL',
        approvalStatus: 'PERSONAL',
        productionEligibility: 'REVIEW_ONLY',
        autoPublic: false,
        autoApproved: false,
      },
    } as GeneratedPedagogicalSituationCandidate;
  }
}
