/**
 * Identity and ordering guard for authenticated platform-store hydration.
 * A token is valid only for the account and request generation that created it.
 */
export type HydrationDomain =
  | 'weeklySchedule'
  | 'knowledgeItems'
  | 'studentRoster'
  | 'inspectionVisits'
  | 'assignedTeachers'
  | 'inspectionFeed'
  | 'initial'
  | 'directMessages';

export interface HydrationToken {
  domain: HydrationDomain;
  userId: string;
  identityGeneration: number;
  requestGeneration: number;
}

export class PlatformStoreHydrationGuard {
  private userId: string | null = null;
  private identityGeneration = 0;
  private readonly requestGenerations = new Map<HydrationDomain, number>();

  setIdentity(userId: string | null): void {
    if (this.userId === userId) return;
    this.userId = userId;
    this.identityGeneration += 1;
  }

  begin(domain: HydrationDomain): HydrationToken | null {
    if (!this.userId) return null;
    const requestGeneration = (this.requestGenerations.get(domain) || 0) + 1;
    this.requestGenerations.set(domain, requestGeneration);
    return {
      domain,
      userId: this.userId,
      identityGeneration: this.identityGeneration,
      requestGeneration,
    };
  }

  canCommit(token: HydrationToken | null): boolean {
    return Boolean(
      token &&
      token.userId === this.userId &&
      token.identityGeneration === this.identityGeneration &&
      token.requestGeneration === this.requestGenerations.get(token.domain)
    );
  }
}

/** Successful collection responses are authoritative, including an empty array. */
export function authoritativeCollection<T>(response: T[] | null | undefined): T[] | null {
  return Array.isArray(response) ? response : null;
}
