/** Runtime Prisma must use the pooled DATABASE_URL exactly as configured. */
export function getRuntimeDatabaseUrl(databaseUrl: string): string {
  return databaseUrl;
}
