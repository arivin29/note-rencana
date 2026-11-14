import { Component } from '@angular/core';

/**
 * Nav bawah GLOBAL (di luar project): Project · Peringatan · Profil.
 * Di dalam project nav ini disembunyikan; shell project punya nav sendiri
 * (Ringkasan · Perangkat · Channel · Peta · Peringatan) — hanya satu bar yang tampil.
 */
@Component({
  selector: 'mobile-bottom-nav',
  templateUrl: './mobile-bottom-nav.component.html',
  standalone: false
})
export class MobileBottomNavComponent {}
