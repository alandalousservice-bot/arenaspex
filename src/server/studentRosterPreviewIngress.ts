import express, { type Request, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import {
  MAX_STUDENT_ROSTER_PDF_BYTES,
  reservePdfiumJob,
  type PdfiumJobPermit,
} from '../services/studentRosterPdfImport.service.js';

const PDF_PREVIEW_RATE_WINDOW_MS = 5 * 60 * 1000;
const PDF_PREVIEW_RATE_LIMIT = 8;
const PDF_PREVIEW_RATE_MESSAGE = 'طلبات تحليل القوائم كثيرة حالياً. يرجى الانتظار قليلاً ثم إعادة المحاولة.';
const PDF_PREVIEW_BUSY_MESSAGE = 'يتم تحليل قوائم أخرى حالياً. يرجى إعادة المحاولة بعد لحظات.';
const permits = new WeakMap<Request, PdfiumJobPermit>();

function releaseRequestPermit(req: Request): void {
  const permit = permits.get(req);
  if (!permit) return;
  permits.delete(req);
  permit.release();
}

export function takeStudentRosterPdfPermit(req: Request): PdfiumJobPermit | undefined {
  const permit = permits.get(req);
  if (permit) permits.delete(req);
  return permit;
}

export function releaseUnconsumedStudentRosterPdfPermit(req: Request): void {
  releaseRequestPermit(req);
}

export function createStudentRosterPreviewIngress(options: {
  requireAuth: RequestHandler;
  requireOperationalAccount: RequestHandler;
  requireTeacher: RequestHandler;
  limit?: number;
  rawParser?: RequestHandler;
}): RequestHandler[] {
  const limiter = rateLimit({
    windowMs: PDF_PREVIEW_RATE_WINDOW_MS,
    limit: options.limit ?? PDF_PREVIEW_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || 'missing-authenticated-user',
    handler: (_req, res) => res.status(429).json({ error: PDF_PREVIEW_RATE_MESSAGE }),
  });

  const rejectOversizedContentLength: RequestHandler = (req, res, next) => {
    if (!req.is('application/pdf')) return next();
    const rawLength = req.get('content-length');
    if (rawLength && /^\d+$/.test(rawLength) && Number(rawLength) > MAX_STUDENT_ROSTER_PDF_BYTES) {
      return res.status(413).json({ error: 'الملف أكبر من الحجم المسموح.' });
    }
    next();
  };

  const reservePdfiumCapacity: RequestHandler = (req, res, next) => {
    if (!req.is('application/pdf')) return next();
    const permit = reservePdfiumJob();
    if (!permit) return res.status(503).json({ error: PDF_PREVIEW_BUSY_MESSAGE, code: 'PARSER_BUSY' });
    permits.set(req, permit);
    req.once('aborted', () => releaseRequestPermit(req));
    res.once('finish', () => releaseRequestPermit(req));
    res.once('close', () => {
      if (!res.writableEnded) releaseRequestPermit(req);
    });
    next();
  };

  return [
    options.requireAuth,
    options.requireOperationalAccount,
    options.requireTeacher,
    limiter,
    rejectOversizedContentLength,
    reservePdfiumCapacity,
    options.rawParser || express.raw({ type: 'application/pdf', limit: '12mb' }),
  ];
}
