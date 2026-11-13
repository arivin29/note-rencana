/**
 * Pure helpers for embedding the iot-scada app in an iframe. No Angular imports (unit-tested with tsx).
 */

export type ScadaEmbedParamValue = string | number | boolean | null | undefined;
export type ScadaEmbedParams = Record<string, ScadaEmbedParamValue>;

/**
 * Append extra query params to an embed URL (`ScadaService.getEmbedUrl`). Params whose value is
 * null/undefined/'' are skipped; booleans become `1`/`0`. Key order = insertion order (stable URL →
 * the iframe only reloads when a value really changes).
 */
export function appendScadaParams(base: string, params?: ScadaEmbedParams | null): string {
  if (!params) return base;
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const v = params[key];
    if (v === null || v === undefined || v === '') continue;
    const s = typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(s)}`);
  }
  if (!parts.length) return base;
  return base + (base.includes('?') ? '&' : '?') + parts.join('&');
}

/** Origin (`scheme://host[:port]`) of a URL; '' when it can't be parsed. */
export function scadaOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}
