import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { ViewModeService } from './view-mode.service';

/**
 * Redirect root '/' ke mobile atau desktop sesuai mode efektif (docs/mobile/03 §7, opsi A).
 * Hanya untuk path kosong; URL eksplisit (/mobile/.. atau /iot/..) tidak dipaksa.
 */
export const rootRedirectGuard: CanActivateFn = (): UrlTree => {
  const viewMode = inject(ViewModeService);
  const router = inject(Router);
  return viewMode.resolveEffective() === 'mobile'
    ? router.parseUrl('/mobile/dashboard')
    : router.parseUrl('/iot/dashboard');
};
