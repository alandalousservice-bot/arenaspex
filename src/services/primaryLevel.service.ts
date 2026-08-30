export type PrimaryLevelId = 'lvl_p1' | 'lvl_p2' | 'lvl_p3' | 'lvl_p4' | 'lvl_p5';

const CANONICAL_LEVEL_IDS: Record<string, PrimaryLevelId> = {
  lvl_p1: 'lvl_p1',
  lvl_p2: 'lvl_p2',
  lvl_p3: 'lvl_p3',
  lvl_p4: 'lvl_p4',
  lvl_p5: 'lvl_p5',
};

const ARABIC_DIGITS: Record<string, string> = {
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
};

function canonicalLevelForGrade(value: string): PrimaryLevelId | null {
  const grade = value.match(/^(?:p|grade|g|level)?([1-5])$/)?.[1];
  return grade ? (`lvl_p${grade}` as PrimaryLevelId) : null;
}

export function normalizePrimaryLevelId(value: unknown): PrimaryLevelId | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 && value <= 5
      ? (`lvl_p${value}` as PrimaryLevelId)
      : null;
  }

  if (typeof value !== 'string') return null;

  const normalized = value
    .replace(/[١٢٣٤٥]/g, (digit) => ARABIC_DIGITS[digit])
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  return CANONICAL_LEVEL_IDS[normalized] || canonicalLevelForGrade(normalized);
}
