import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { mFormatNumber } from './mobile-format';

/** `{{ v | mNum:precision }}` → angka id-ID sesuai presisi channel (lihat mobile-format.ts). */
@Pipe({ name: 'mNum', standalone: false })
export class MobileNumPipe implements PipeTransform {
  constructor(@Inject(LOCALE_ID) private locale: string) {}
  transform(v: any, precision?: any): string { return mFormatNumber(v, this.locale, precision); }
}
