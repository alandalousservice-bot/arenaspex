import type { KnowledgeCoreRuntime } from './knowledgeCoreRuntime.types';

export const KNOWLEDGE_CORE_RUNTIME_DIAGNOSTIC_FIELDS = Object.freeze([
  'requestedMode',
  'effectiveMode',
  'authority',
  'releaseId',
  'approvalStatus',
  'validationStatus',
  'fallbackReason',
] as const);

export type KnowledgeCoreRuntimeDiagnosticEvent = Readonly<{
  requestedMode: string;
  effectiveMode: string;
  authority: string;
  releaseId: string | null;
  approvalStatus: string;
  validationStatus: string;
  fallbackReason: string | null;
}>;

type DiagnosticWriter = (line: string) => void;

const reportedRuntimes = new WeakSet<KnowledgeCoreRuntime>();

export function buildKnowledgeCoreRuntimeDiagnostic(
  runtime: KnowledgeCoreRuntime
): KnowledgeCoreRuntimeDiagnosticEvent {
  const status = runtime.getStatus();
  return Object.freeze({
    requestedMode: status.requestedMode,
    effectiveMode: status.effectiveMode,
    authority: status.authority,
    releaseId: status.releaseId,
    approvalStatus: status.approvalStatus,
    validationStatus: status.diagnostic.validationStatus,
    fallbackReason: status.diagnostic.fallbackReason || null,
  });
}

export function emitKnowledgeCoreRuntimeDiagnosticOnce(
  runtime: KnowledgeCoreRuntime,
  write: DiagnosticWriter
): KnowledgeCoreRuntimeDiagnosticEvent {
  const event = buildKnowledgeCoreRuntimeDiagnostic(runtime);
  if (!reportedRuntimes.has(runtime)) {
    reportedRuntimes.add(runtime);
    write(`[KnowledgeCoreRuntime] ${JSON.stringify(event)}`);
  }
  return event;
}
