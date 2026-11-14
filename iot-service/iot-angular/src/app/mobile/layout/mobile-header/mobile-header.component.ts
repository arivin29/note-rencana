import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ViewModeService } from '@services/view-mode.service';

/**
 * AppBar mobile: back hierarkis (atau logo) · judul + subjudul · Tampilan Desktop · Profil.
 * Tidak ada lagi chip / sheet "Pilih Project" — project selalu dari URL (/mobile/p/:pid).
 */
@Component({
  selector: 'mobile-header',
  templateUrl: './mobile-header.component.html',
  standalone: false
})
export class MobileHeaderComponent {
  @Input() title = '';
  @Input() sub = '';
  @Input() showBack = false;
  @Input() onProfile = false;
  @Output() back = new EventEmitter<void>();

  constructor(private viewMode: ViewModeService, private router: Router) {}

  goDesktop(): void { this.viewMode.set('desktop'); this.router.navigateByUrl('/iot/dashboard'); }
}
