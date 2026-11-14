/**
 * Chakra Petch untuk shell mobile SAJA (design-language §4). Dimuat lewat <link> saat shell
 * mobile / login mobile dibuat, bukan @import global — supaya setelan font web tidak berubah
 * (styles global dibundel jadi satu, @import di sana ikut termuat di desktop).
 */
const HELIOS_FONT_ID = 'm-helios-font';
const HELIOS_FONT_URL = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600&display=swap';

export function ensureHeliosFont(): void {
  if (typeof document === 'undefined' || document.getElementById(HELIOS_FONT_ID)) { return; }
  const link = document.createElement('link');
  link.id = HELIOS_FONT_ID;
  link.rel = 'stylesheet';
  link.href = HELIOS_FONT_URL;
  document.head.appendChild(link);
}
