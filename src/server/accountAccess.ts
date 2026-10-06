export function currentAcademicYearId(now = new Date()): string {
  const year = now.getUTCFullYear();
  const startYear = now.getUTCMonth() >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function academicYearAccessExpiry(now = new Date()): Date {
  const startYear = Number(currentAcademicYearId(now).slice(0, 4));
  return new Date(Date.UTC(startYear + 1, 6, 31, 23, 59, 59, 999));
}

export function isAccountAccessExpired(expiresAt: Date | null | undefined, now = new Date()) {
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}
