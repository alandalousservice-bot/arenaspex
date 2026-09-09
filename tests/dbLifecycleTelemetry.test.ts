import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDbLifecycleEvent,
  emitDbLifecycleEvent,
  emitInstanceStartTelemetry,
  registerDatabaseLifecycleSignalTelemetry,
  safeErrorMetadata,
} from '../src/server/dbLifecycleTelemetry.js';

describe('database lifecycle telemetry', () => {
  const runtime = {
    timestamp: () => '2026-09-09T00:00:00.000Z',
    processId: 42,
    processUptimeSeconds: () => 12.3456,
    environment: 'production',
    renderServiceId: 'srv-safe',
    renderInstanceId: 'instance-safe',
    renderGitCommit: 'commit-safe',
  };

  it('emits the instance-start event exactly once per process', () => {
    const lines: string[] = [];
    emitInstanceStartTelemetry((line) => lines.push(line));
    emitInstanceStartTelemetry((line) => lines.push(line));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('db.lifecycle.instance_start');
  });

  it('builds safe structured instance-start telemetry without secrets', () => {
    const event = buildDbLifecycleEvent('db.lifecycle.instance_start', {}, runtime);
    expect(event).toMatchObject({
      event: 'db.lifecycle.instance_start',
      timestamp: '2026-09-09T00:00:00.000Z',
      processId: 42,
      processUptimeSeconds: 12.346,
      environment: 'production',
      serviceId: 'srv-safe',
      instanceId: 'instance-safe',
      gitCommit: 'commit-safe',
    });
    expect(JSON.stringify(event)).not.toMatch(
      /DATABASE_URL|DIRECT_DATABASE_URL|password|token|apiKey|connectionString/i
    );
  });

  it.each(['SIGTERM', 'SIGINT'] as const)(
    'logs %s without terminating the test runner',
    (signal) => {
      const listeners = new Map<string, () => void>();
      const fakeProcess = {
        once: vi.fn((name: string, listener: () => void) => listeners.set(name, listener)),
        removeListener: vi.fn(),
      };
      const lines: string[] = [];
      const terminate = vi.fn();

      registerDatabaseLifecycleSignalTelemetry(fakeProcess, (line) => lines.push(line), terminate);
      listeners.get(signal)?.();

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('db.lifecycle.instance_shutdown');
      expect(lines[0]).toContain(`"signal":"${signal}"`);
      expect(terminate).toHaveBeenCalledWith(signal);
    }
  );

  it('registers signal handlers only once per process object', () => {
    const fakeProcess = { once: vi.fn(), removeListener: vi.fn() };
    registerDatabaseLifecycleSignalTelemetry(fakeProcess, vi.fn(), vi.fn());
    registerDatabaseLifecycleSignalTelemetry(fakeProcess, vi.fn(), vi.fn());
    expect(fakeProcess.once).toHaveBeenCalledTimes(2);
  });

  it.each([
    'db.prisma.retry_started',
    'db.prisma.retry_succeeded',
    'db.prisma.retry_failed',
    'db.prisma.disconnect_started',
    'db.prisma.disconnect_completed',
    'db.prisma.disconnect_failed',
    'db.probe.success',
    'db.probe.failure',
  ] as const)('emits %s in the shared structured format', (eventName) => {
    const lines: string[] = [];
    emitDbLifecycleEvent(eventName, { attempt: 2 }, (line) => lines.push(line), runtime);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`[DatabaseTelemetry] {"event":"${eventName}"`);
    expect(lines[0]).toContain('"processId":42');
    expect(lines[0]).toContain('"processUptimeSeconds":12.346');
  });

  it('keeps error metadata to class and safe code only', () => {
    const error = Object.assign(new Error('postgresql://user:secret@example/db'), {
      code: 'P1001',
    });
    expect(safeErrorMetadata(error)).toEqual({ errorName: 'Error', errorCode: 'P1001' });
    expect(JSON.stringify(safeErrorMetadata(error))).not.toContain('secret');
  });

  it('instruments existing behavior without changing connection policy', () => {
    const prismaSource = readFileSync('src/server/prismaClient.ts', 'utf8');
    const serverSource = readFileSync('server.ts', 'utf8');

    expect(prismaSource.match(/new PrismaClient\(/g)).toHaveLength(1);
    expect(prismaSource.match(/prismaBase\.\$disconnect\(/g)).toHaveLength(1);
    expect(prismaSource).toContain('retries = 3, baseDelayMs = 400');
    expect(prismaSource).toContain('sleep(baseDelayMs * (attempt + 1) + Math.random() * 250)');
    expect(serverSource).toContain("emitDbLifecycleEvent('db.probe.success')");
    expect(serverSource).toContain("emitDbLifecycleEvent('db.probe.failure'");
  });
});
