import crypto from 'crypto';
import { prisma } from './prismaClient.js';

function slugPart(value: string) {
  return value
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
