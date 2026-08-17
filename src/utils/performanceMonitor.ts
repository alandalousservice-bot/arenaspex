/**
 * SPEX - Performance & Monitoring Utility
 * قياس أداء الواجهة واستجابة API ورصد الأخطاء
 */

export interface PerformanceMetric {
  name: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;

  /**
   * Measure the execution time of an async operation
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = performance.now() - start;
      this.recordMetric(name, durationMs, metadata);
      return result;
    } catch (error) {
      const durationMs = performance.now() - start;
      this.recordMetric(`${name}_ERROR`, durationMs, { ...metadata, error });
      this.reportError(error, { context: name });
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, durationMs: number, metadata?: Record<string, unknown>) {
    const metric: PerformanceMetric = {
      name,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    if (process.env.NODE_ENV !== 'production' && durationMs > 500) {
      console.warn(`⚡ [Performance Alert] ${name} took ${metric.durationMs}ms`, metadata);
    }
  }

  /**
   * Report application error (Sentry compatible wrapper)
   */
  reportError(error: unknown, contextInfo?: Record<string, unknown>) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;

    if (process.env.NODE_ENV !== 'production') {
      console.error('🚨 [SPEX Error Monitor]:', errMessage, { contextInfo, stack: errStack });
    }

    // Window Sentry integration hook if available
    const win = typeof window !== 'undefined' ? (window as unknown as { Sentry?: { captureException: (err: unknown, opts?: unknown) => void } }) : undefined;
    if (win?.Sentry) {
      win.Sentry.captureException(error, { extra: contextInfo });
    }
  }

  /**
   * Get all captured performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

export const performanceMonitor = new PerformanceMonitorService();
