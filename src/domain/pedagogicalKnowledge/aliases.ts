import type { KnowledgeAlias } from './types';

export function validateKnowledgeAliases(aliases: readonly KnowledgeAlias[]): string[] {
  const errors: string[] = [];
  const targets = new Map<string, string>();

  for (const alias of aliases) {
    const existing = targets.get(alias.legacyId);
    if (existing && existing !== alias.canonicalId) {
      errors.push(
        `Ambiguous alias ${alias.legacyId}: resolves to both ${existing} and ${alias.canonicalId}`
      );
      continue;
    }
    if (alias.legacyId === alias.canonicalId) {
      errors.push(`Alias ${alias.legacyId} cannot resolve to itself`);
    }
    targets.set(alias.legacyId, alias.canonicalId);
  }

  for (const alias of aliases) {
    const visited = new Set<string>();
    let current: string | undefined = alias.legacyId;
    while (current && targets.has(current)) {
      if (visited.has(current)) {
        errors.push(`Alias cycle detected from ${alias.legacyId}`);
        break;
      }
      visited.add(current);
      current = targets.get(current);
    }
  }

  return [...new Set(errors)];
}

export function resolveKnowledgeId(id: string, aliases: readonly KnowledgeAlias[]): string {
  const errors = validateKnowledgeAliases(aliases);
  if (errors.length > 0) throw new Error(errors.join('; '));

  const targets = new Map(aliases.map((alias) => [alias.legacyId, alias.canonicalId]));
  let current = id;
  while (targets.has(current)) current = targets.get(current)!;
  return current;
}
