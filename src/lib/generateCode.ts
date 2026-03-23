/**
 * Random ID generation for all codes in the BK FOOD traceability system
 */

export function generateCode(prefix: 'PAL' | 'CHR' | 'STR'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `${prefix}-${random}`;
}