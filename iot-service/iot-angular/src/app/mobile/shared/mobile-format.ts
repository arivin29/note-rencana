import { formatNumber } from '@angular/common';
import { decimalsFromPrecision } from '@app/shared/utils/threshold';

/**
 * Angka untuk manusia (id-ID): "1,79" / "2.710,00". Desimal dari `sensor_channels.precision`
 * (decimalsFromPrecision, sama dengan desktop). null/undefined/NaN → "—" (bukan 0).
 */
export function mFormatNumber(v: any, locale: string, precision?: any): string {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) { return '—'; }
  const d = decimalsFromPrecision(precision);
  return formatNumber(Number(v), locale, `1.${d}-${d}`);
}
