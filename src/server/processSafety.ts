/**
 * SPEX - Process Safety Net
 * آخر خط دفاع على مستوى العملية: أي وعد مرفوض لم يلتقطه أحد (خطأ في كود طرف ثالث،
 * فشل تحميل محرك Prisma في الخلفية، ...) يُسجَّل بدل أن يُسقِط خادم المنصة كلياً —
 * سلوك Node الافتراضي منذ الإصدار 15 هو إنهاء العملية فوراً عند unhandledRejection.
 *
 * هذا لا يغني عن المعالجة المنتظمة للأخطاء (asyncHandler + معالج الأخطاء العام)،
 * بل يمنع كارثة "الخادم كله توقف بسبب طلب واحد" في الحالات غير المتوقعة.
 */

let installed = false;

export function installProcessSafetyNet(): void {
  if (installed) return;
  installed = true;

  process.on('unhandledRejection', (reason) => {
    console.error('⚠️ [process] وعد مرفوض غير معالج (بقي الخادم يعمل):', reason);
  });

  process.on('uncaughtException', (err) => {
    // لا نخرج من العملية إلا في الأخطاء الحرجة الفادحة؛ الأخطاء العادية تُسجَّل
    console.error('🔥 [process] استثناء غير ملتقط (بقي الخادم يعمل):', err);
  });
}
