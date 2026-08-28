function hasPrismaCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === code;
}

export const isUniqueViolation = (err: unknown): boolean => hasPrismaCode(err, 'P2002');
export const isNotFound = (err: unknown): boolean => hasPrismaCode(err, 'P2025');
