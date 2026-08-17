/**
 * SPEX - Async Error Safety
 * Express 4 لا يلتقط الوعود المرفوضة من معالجات async تلقائياً — أي رفض غير معالج
 * (مثل انقطاع قاعدة البيانات لحظياً) كان يُسقِط العملية بأكملها (Node يسقط العملية
 * عند unhandledRejection افتراضياً)، فتتعطل المنصة كلها بسبب طلب واحد فاشل.
 *
 * الحل هنا: نلفّ كل المعالجات المسجلة على الراوترات بغلاف يمرر الخطأ إلى next()
 * فيصل إلى معالج الأخطاء العام ويُرجع 500 JSON للطلب الفاشل فقط.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AnyHandler = (req: Request, res: Response, next: NextFunction) => unknown;

/** يلف معالجاً واحداً: يمرر أي رفض وعد إلى معالج أخطاء Express بدل إسقاط العملية */
export function asyncHandler(fn: AnyHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function wrapIfPlainHandler(handle: any): any {
  // معالجات الأخطاء (4 وسائط) أو الراوترات الفرعية المركّبة لا تُلفّ
  if (typeof handle !== 'function') return handle;
  if (handle.length === 4) return handle; // error-handling middleware
  if (handle.name === 'router' || handle.stack) return handle; // mounted sub-router
  return function wrappedAsyncHandler(this: unknown, req: Request, res: Response, next: NextFunction) {
    try {
      const result = handle(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

/**
 * يلف جميع المعالجات المسجلة حالياً على الراوتر (المسارات + وسائط use)
 * يُستدعى بعد تعريف كل المسارات مباشرة قبل التصدير.
 */
export function wrapRouterAsyncErrors(router: any): void {
  const stack = router?.stack;
  if (!Array.isArray(stack)) return;

  for (const layer of stack) {
    if (layer.route) {
      // طبقات المسارات: لكل فعل (get/post/...) معالجه الخاص في route.stack
      for (const routeLayer of layer.route.stack ?? []) {
        routeLayer.handle = wrapIfPlainHandler(routeLayer.handle);
      }
    } else if (layer.handle) {
      // وسائط أضيفت عبر router.use(fn)
      layer.handle = wrapIfPlainHandler(layer.handle);
    }
  }
}
