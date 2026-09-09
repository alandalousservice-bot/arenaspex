export type DbLifecycleEventName =
  | 'db.lifecycle.instance_start'
  | 'db.lifecycle.instance_shutdown'
  | 'db.prisma.retry_started'
  | 'db.prisma.retry_succeeded'
  | 'db.prisma.retry_failed'
  | 'db.prisma.disconnect_started'
  | 'db.prisma.disconnect_completed'
  | 'db.prisma.disconnect_failed'
  | 'db.probe.success'
  | 'db.probe.failure';

type SafeEventDetails = {
  signal?: 'SIGTERM' | 'SIGINT';
  attempt?: number;
  errorName?: string;
  errorCode?: string;
};

type RuntimeMetadata = {
  timestamp?: () => string;
  processId?: number;
  processUptimeSeconds?: () => number;
  environment?: string;
  renderServiceId?: string;
  renderInstanceId?: string;
  renderGitCommit?: string;
};

type SignalProcess = object & {
  once(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
  removeListener(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
};

type TelemetryWriter = (line: string) => void;

const registeredSignalProcesses = new WeakSet<object>();
let instanceStartEmitted = false;

function optionalIdentifier(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function safeErrorMetadata(
  error: unknown
): Pick<SafeEventDetails, 'errorName' | 'errorCode'> {
  if (!error || typeof error !== 'object') return {};
  const candidate = error as { name?: unknown; code?: unknown };
  return {
    errorName: typeof candidate.name === 'string' ? candidate.name : undefined,
    errorCode:
      typeof candidate.code === 'string' || typeof candidate.code === 'number'
        ? String(candidate.code)
        : undefined,
  };
}

export function buildDbLifecycleEvent(
  event: DbLifecycleEventName,
  details: SafeEventDetails = {},
  runtime: RuntimeMetadata = {}
) {
  return {
    event,
    timestamp: runtime.timestamp?.() ?? new Date().toISOString(),
    processId: runtime.processId ?? process.pid,
    processUptimeSeconds:
      Math.round((runtime.processUptimeSeconds?.() ?? process.uptime()) * 1000) / 1000,
    environment: runtime.environment ?? process.env.NODE_ENV ?? 'development',
    serviceId: optionalIdentifier(runtime.renderServiceId ?? process.env.RENDER_SERVICE_ID),
    instanceId: optionalIdentifier(runtime.renderInstanceId ?? process.env.RENDER_INSTANCE_ID),
    gitCommit: optionalIdentifier(runtime.renderGitCommit ?? process.env.RENDER_GIT_COMMIT),
    ...details,
  };
}

export function emitDbLifecycleEvent(
  event: DbLifecycleEventName,
  details: SafeEventDetails = {},
  writer: TelemetryWriter = (line) => process.stdout.write(`${line}\n`),
  runtime: RuntimeMetadata = {}
): void {
  writer(`[DatabaseTelemetry] ${JSON.stringify(buildDbLifecycleEvent(event, details, runtime))}`);
}

export function emitInstanceStartTelemetry(writer?: TelemetryWriter): void {
  if (instanceStartEmitted) return;
  instanceStartEmitted = true;
  emitDbLifecycleEvent('db.lifecycle.instance_start', {}, writer);
}

export function registerDatabaseLifecycleSignalTelemetry(
  signalProcess: SignalProcess = process,
  writer?: TelemetryWriter,
  terminate: (signal: 'SIGTERM' | 'SIGINT') => void = (signal) => process.kill(process.pid, signal)
): void {
  if (registeredSignalProcesses.has(signalProcess)) return;
  registeredSignalProcesses.add(signalProcess);

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    const listener = () => {
      emitDbLifecycleEvent('db.lifecycle.instance_shutdown', { signal }, writer);
      signalProcess.removeListener(signal, listener);
      terminate(signal);
    };
    signalProcess.once(signal, listener);
  }
}
