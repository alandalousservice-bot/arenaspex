import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  acknowledgeTeacherVisitReport,
  createVisitReport,
  finalizeVisitReport,
  listOwnedVisitReports,
  listTeacherSharedVisitReports,
  readTeacherSharedVisitReport,
  readVisitReport,
  ReportError,
  saveVisitReport,
  shareVisitReportWithTeacher,
} from './visitReportService.js';
import { TransferError } from './assignmentTransferService.js';
export const visitReportRouter = Router();
visitReportRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
visitReportRouter.get('/inspector/visit-reports', async (req, res, next) => {
  try {
    res.json({
      reports: await listOwnedVisitReports(
        req.user!,
        typeof req.query.teacherId === 'string' ? req.query.teacherId : undefined
      ),
    });
  } catch (e) {
    next(e);
  }
});
visitReportRouter.post('/visit-reports/:id/share', async (req, res, next) => {
  try {
    res.json({ report: await shareVisitReportWithTeacher(req.user!, req.params.id) });
  } catch (e) {
    next(e);
  }
});
visitReportRouter.get('/teacher/visit-reports', async (req, res, next) => {
  try {
    res.json({ reports: await listTeacherSharedVisitReports(req.user!) });
  } catch (e) {
    next(e);
  }
});
visitReportRouter.get('/teacher/visit-reports/:id', async (req, res, next) => {
  try {
    res.json(await readTeacherSharedVisitReport(req.user!, req.params.id));
  } catch (e) {
    next(e);
  }
});
visitReportRouter.post('/teacher/visit-reports/:id/acknowledge', async (req, res, next) => {
  try {
    res.json({ report: await acknowledgeTeacherVisitReport(req.user!, req.params.id) });
  } catch (e) {
    next(e);
  }
});
visitReportRouter.get('/pedagogical-visits/:id/report', async (req, res, next) => {
  try {
    res.json(await readVisitReport(req.user!, req.params.id));
  } catch (e) {
    next(e);
  }
});
visitReportRouter.post('/pedagogical-visits/:id/report', async (req, res, next) => {
  try {
    res.status(201).json({ report: await createVisitReport(req.user!, req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
});
visitReportRouter.post('/visit-reports/:id/save', async (req, res, next) => {
  try {
    res.json({ report: await saveVisitReport(req.user!, req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
});
visitReportRouter.post('/visit-reports/:id/finalize', async (req, res, next) => {
  try {
    res.json({ report: await finalizeVisitReport(req.user!, req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
});
visitReportRouter.use((e: Error, _req: Request, res: Response, next: NextFunction) => {
  if (e instanceof ReportError) return res.status(e.status).json({ error: e.message });
  if (e instanceof TransferError)
    return res.status(e.code === 'CONFLICT' ? 409 : 403).json({ error: e.message });
  next(e);
});
