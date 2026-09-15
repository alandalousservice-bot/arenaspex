const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

/** Single server-side authority for every Gemini runtime path. */
export function configuredGeminiModel(explicit?: string): string {
  return explicit?.trim() || process.env.GEMINI_PEDAGOGICAL_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}
