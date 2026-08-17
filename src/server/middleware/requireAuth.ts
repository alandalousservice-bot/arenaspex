/**
 * SPEX - Auth Middleware
 * حماية المسارات: التحقق من الجلسة، وفرض الصلاحيات حسب الدور
 */
import type { Request, Response, NextFunction } from 'express';
import { getSessionTokenFromRequest, verifySession } from '../auth.js';
import { prisma } from '../prismaClient.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: string; districtId: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getSessionTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول للوصول إلى هذا المورد.' });
  }
  const payload = verifySession(token);
  if (!payload) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول من جديد.' });
  }

  // نتحقق من وجود المستخدم فعلاً وأن حسابه ما زال نشطاً (وليس مجرد الثقة بمحتوى التوكن)
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.status === 'inactive') {
    return res.status(401).json({ error: 'الحساب غير موجود أو معطّل.' });
  }

  req.user = { id: user.id, role: user.role, districtId: user.districtId };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'لا تملك الصلاحية الكافية للقيام بهذا الإجراء.' });
    }
    next();
  };
}
