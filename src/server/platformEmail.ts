import crypto from 'crypto';
import { prisma } from './prismaClient.js';

function slugPart(value: string) {
  const arabicMap: Record<string, string> = {
    ا: 'a',
    ب: 'b',
    ت: 't',
    ث: 'th',
    ج: 'j',
    ح: 'h',
    خ: 'kh',
    د: 'd',
    ذ: 'dh',
    ر: 'r',
    ز: 'z',
    س: 's',
    ش: 'ch',
    ص: 's',
    ض: 'd',
    ط: 't',
    ظ: 'z',
    ع: 'a',
    غ: 'gh',
    ف: 'f',
    ق: 'q',
    ك: 'k',
    ل: 'l',
    م: 'm',
    ن: 'n',
    ه: 'h',
    و: 'w',
    ي: 'y',
    ة: 'a',
    أ: 'a',
    إ: 'i',
    آ: 'a',
    ء: '',
    ئ: 'y',
    ؤ: 'w',
    ى: 'a',
  };
  const transliterated = [...value].map((char) => arabicMap[char] ?? char).join('');
  return transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
}

export async function createPlatformEmail(firstName: string, lastName: string) {
  const base = [slugPart(firstName), slugPart(lastName)].filter(Boolean).join('.') || 'user';
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = attempt === 0 ? '' : `.${crypto.randomBytes(2).toString('hex')}`;
    const platformEmail = `${base}${suffix}@spex.dz`;
    const existing = await prisma.user.findUnique({
      where: { platformEmail },
      select: { id: true },
    });
    if (!existing) return platformEmail;
  }
  return `${base}.${crypto.randomUUID().slice(0, 8)}@spex.dz`;
}
