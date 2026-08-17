// يوفّر متغيرات البيئة السرّية التي يتطلبها src/server/auth.ts عند تحميله في الاختبارات
// (خارج وضع الإنتاج فقط - قيم اختبار وهمية لا علاقة لها بأي بيئة حقيقية).
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-key-not-for-production-use-32chars';
process.env.API_KEY_ENCRYPTION_SECRET =
  process.env.API_KEY_ENCRYPTION_SECRET || 'test-only-encryption-secret-32-characters-min';
