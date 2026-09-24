import express, { type RequestHandler } from 'express';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createStudentRosterPreviewIngress,
} from '../src/server/studentRosterPreviewIngress';
import {
  MAX_STUDENT_ROSTER_PDF_BYTES,
  reservePdfiumJob,
  runPdfiumJob,
} from '../src/services/studentRosterPdfImport.service';

const PREVIEW_PATH = '/api/students/import/preview';
const servers: http.Server[] = [];

async function createPreviewServer(limit = 8) {
  const app = express();
  const rawParser = vi.fn(express.raw({ type: 'application/pdf', limit: '12mb' }));
  const requireAuth: RequestHandler = (req, res, next) => {
    if (req.header('x-test-auth') !== 'yes') return res.status(401).end();
    req.user = {
      id: req.header('x-test-user') || 'teacher-a',
      role: req.header('x-test-role') || 'teacher',
      districtId: 'district-a',
      institutionId: 'institution-a',
      isPlatformOwner: false,
      status: req.header('x-test-status') || 'active',
      isApprovedByAdmin: req.header('x-test-approved') !== 'no',
    };
    next();
  };
  const requireOperationalAccount: RequestHandler = (req, res, next) =>
    req.user?.status === 'active' && req.user.isApprovedByAdmin
      ? next()
      : res.status(403).end();
  const requireTeacher: RequestHandler = (req, res, next) =>
    req.user?.role === 'teacher' ? next() : res.status(403).end();

  app.use(PREVIEW_PATH, ...createStudentRosterPreviewIngress({
    requireAuth,
    requireOperationalAccount,
    requireTeacher,
    limit,
    rawParser,
  }));
  app.use(express.json());
  app.post(PREVIEW_PATH, (req, res) => {
    res.json({ pdf: Buffer.isBuffer(req.body), excel: req.body?.contentBase64 || null });
  });
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unexpected test server address');
  return { url: `http://127.0.0.1:${address.port}${PREVIEW_PATH}`, rawParser };
}

function authHeaders(extra: Record<string, string> = {}) {
  return { 'x-test-auth': 'yes', ...extra };
}

function sendOversizedContentLength(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      host: parsed.hostname,
      port: Number(parsed.port),
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(MAX_STUDENT_ROSTER_PDF_BYTES + 1),
        ...authHeaders(),
      },
    }, (res) => {
      res.resume();
      res.once('end', () => resolve(res.statusCode || 0));
    });
    req.once('error', reject);
    req.end();
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

describe('teacher roster preview ingress hardening', () => {
  it('rejects unauthenticated, non-operational, and non-teacher requests before PDF parsing', async () => {
    const { url, rawParser } = await createPreviewServer();
    const body = Buffer.from('%PDF-fake');
    const unauthenticated = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/pdf' }, body });
    expect(unauthenticated.status).toBe(401);

    const pending = await fetch(url, {
      method: 'POST', headers: { ...authHeaders({ 'x-test-approved': 'no' }), 'content-type': 'application/pdf' }, body,
    });
    expect(pending.status).toBe(403);

    const nonTeacher = await fetch(url, {
      method: 'POST', headers: { ...authHeaders({ 'x-test-role': 'inspector' }), 'content-type': 'application/pdf' }, body,
    });
    expect(nonTeacher.status).toBe(403);
    expect(rawParser).not.toHaveBeenCalled();
  });

  it('rejects oversized Content-Length before invoking the PDF body parser', async () => {
    const { url, rawParser } = await createPreviewServer();
    expect(await sendOversizedContentLength(url)).toBe(413);
    expect(rawParser).not.toHaveBeenCalled();
  });

  it('applies a dedicated per-teacher preview limit and still parses Excel JSON', async () => {
    const { url, rawParser } = await createPreviewServer(2);
    const pdfHeaders = { ...authHeaders(), 'content-type': 'application/pdf' };
    for (let requestNumber = 0; requestNumber < 2; requestNumber += 1) {
      const response = await fetch(url, { method: 'POST', headers: pdfHeaders, body: Buffer.from('%PDF-test') });
      expect(response.status).toBe(200);
    }
    const limited = await fetch(url, { method: 'POST', headers: pdfHeaders, body: Buffer.from('%PDF-test') });
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toContain('طلبات تحليل القوائم');

    const excel = await fetch(url, {
      method: 'POST',
      headers: { ...authHeaders({ 'x-test-user': 'teacher-b' }), 'content-type': 'application/json' },
      body: JSON.stringify({ contentBase64: 'c3ludGhldGlj' }),
    });
    expect(excel.status).toBe(200);
    expect(await excel.json()).toEqual({ pdf: false, excel: 'c3ludGhldGlj' });
    expect(rawParser).toHaveBeenCalledTimes(3);
  });

  it('rejects PDF uploads before parsing when all bounded PDFium slots are occupied', async () => {
    const permits = [reservePdfiumJob(), reservePdfiumJob(), reservePdfiumJob()];
    expect(permits.every(Boolean)).toBe(true);
    const { url, rawParser } = await createPreviewServer();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/pdf' },
        body: Buffer.from('%PDF-test'),
      });
      expect(response.status).toBe(503);
      expect((await response.json()).code).toBe('PARSER_BUSY');
      expect(rawParser).not.toHaveBeenCalled();
    } finally {
      permits.forEach((permit) => permit?.release());
    }
  });

  it('allows only one active and two waiting PDFium jobs and releases capacity after success or failure', async () => {
    let releaseFirst!: () => void;
    let markStarted!: () => void;
    let active = 0;
    let maximumActive = 0;
    const order: string[] = [];
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const first = runPdfiumJob(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push('first-start');
      markStarted();
      await firstGate;
      order.push('first-end');
      active -= 1;
      return 'first';
    });
    await started;
    const second = runPdfiumJob(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push('second');
      active -= 1;
      return 'second';
    });
    const third = runPdfiumJob(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push('third');
      active -= 1;
      return 'third';
    });
    await expect(runPdfiumJob(async () => 'overflow')).rejects.toMatchObject({ code: 'PARSER_BUSY' });
    releaseFirst();
    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
    await expect(third).resolves.toBe('third');
    expect(maximumActive).toBe(1);
    expect(order).toEqual(['first-start', 'first-end', 'second', 'third']);

    await expect(runPdfiumJob(async () => { throw new Error('synthetic failure'); })).rejects.toThrow('synthetic failure');
    await expect(runPdfiumJob(async () => 'after failure')).resolves.toBe('after failure');
    const permit = reservePdfiumJob();
    expect(permit).toBeDefined();
    permit?.release();
  });

  it('does not log uploaded bytes or extracted roster content', async () => {
    const parser = readFileSync('src/services/studentRosterPdfImport.service.ts', 'utf8');
    const ingress = readFileSync('src/server/studentRosterPreviewIngress.ts', 'utf8');
    expect(parser).not.toMatch(/console\.(log|info|warn|error)/);
    expect(ingress).not.toMatch(/console\.(log|info|warn|error)/);
  });
});
