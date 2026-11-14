/** Shared option lists / normalisers for the Owner pages (list, detail, form). */

/** Canonical SLA levels (stored data mixes 'gold' and 'Gold'). */
export const SLA_LEVELS = ['Platinum', 'Gold', 'Silver', 'Bronze'];

/** Industry suggestions; the form merges in every value already stored on owners. */
export const BASE_INDUSTRIES = [
  'Water Treatment', 'Water Management', 'Manufacturing', 'Aquaculture',
  'Agriculture', 'Plantation', 'Mining', 'Oil & Gas', 'Other'
];

/** Stored SLA → canonical capitalisation; unknown values kept as-is; empty → null (never invent a default). */
export function normalizeSla(value: any): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return null;
  return SLA_LEVELS.find(s => s.toLowerCase() === v.toLowerCase()) ?? v;
}
