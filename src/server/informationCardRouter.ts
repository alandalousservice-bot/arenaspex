import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { cardSaveSchema, CardError, readCard, saveCard, submitCard, reviewCard, readDossier } from './informationCardService.js';
import { TransferError } from './assignmentTransferService.js';
import { requireRole } from './middleware/requireAuth.js';
import { currentAcademicYearId } from './accountAccess.js';

export const informationCardRouter = Router();
const run = (work: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await work(req, res, next); }
  catch (error) {
    if (error instanceof CardError) return void res.status(error.status).json({ error: error.message });
    if (error instanceof TransferError) return void res.status(409).json({ error: error.message });
    next(error);
  }
};
informationCardRouter.get('/teacher/information-card', requireRole('teacher'), run(async (req, res) => { res.json(await readCard(req.user!, req.user!.id)); }));
informationCardRouter.put('/teacher/information-card', requireRole('teacher'), run(async (req, res) => {
  const parsed = cardSaveSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.errors[0].message });
  res.json(await saveCard(req.user!, req.user!.id, parsed.data));
}));
informationCardRouter.post('/teacher/information-card/submit', requireRole('teacher'), run(async (req, res) => {
  const parsed = z.object({ revision: z.number().int().positive() }).strict().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: 'رقم نسخة المسودة مطلوب.' });
  res.json(await submitCard(req.user!, req.user!.id, parsed.data.revision));
}));
informationCardRouter.get('/inspector/teachers/:teacherId/information-card', requireRole('inspector'), run(async (req, res) => { res.json(await readCard(req.user!, req.params.teacherId)); }));
informationCardRouter.get('/inspector/teachers/:teacherId/information-card/print', requireRole('inspector'), run(async (req, res) => {
  const card = await readCard(req.user!, req.params.teacherId);
  const submissionId = req.query.view === 'current' ? undefined : typeof req.query.submissionId === 'string' ? req.query.submissionId : card.submission?.id;
  const submission = submissionId ? card.history.find((row) => row.id === submissionId) : null;
  if (submissionId && !submission) return void res.status(404).json({ error: 'الإرسال غير موجود.' });
  res.json({ snapshot: submission?.snapshot || card.current, submissionId: submission?.id || null });
}));
informationCardRouter.post('/inspector/teachers/:teacherId/information-card/review', requireRole('inspector'), run(async (req, res) => {
  const parsed = z.object({ submissionId: z.string().min(1), decision: z.enum(['VERIFIED', 'NEEDS_CORRECTION']), reason: z.string().trim().max(1000).optional() }).strict().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: 'قرار المراجعة غير صحيح.' });
  res.json(await reviewCard(req.user!, req.params.teacherId, parsed.data.submissionId, parsed.data.decision, parsed.data.reason));
}));
informationCardRouter.get('/inspector/teachers/:teacherId/supervision-dossier', requireRole('inspector'), run(async (req, res) => {
  const year = String(req.query.academicYearId || currentAcademicYearId());
  if (!/^\d{4}-\d{4}$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) return void res.status(400).json({ error: 'السنة الدراسية غير صحيحة.' });
  res.json(await readDossier(req.user!, req.params.teacherId, year));
}));
