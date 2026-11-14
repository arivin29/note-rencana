import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

/**
 * Panel HUD Helios mobile (`<m-panel>`) — port `ui/_card.scss` web: tanpa latar, garis 1px
 * yang putus di tiap sudut + 4 braket siku 10×10. Strip kepala opsional (label UPPERCASE,
 * ikon garis teal, aside kanan). Lihat docs/design/mobile-helios/design-language.md §5.
 *
 *   <m-panel label="Status perangkat" icon="bi-speedometer2" tone="theme">
 *     <span panelAside><b>2</b> / 2 aktif</span>
 *     …isi…
 *   </m-panel>
 *
 * Braket dirender PERTAMA supaya aturan `:last-child` pada baris isi tetap berlaku.
 */
@Component({
  selector: 'm-panel',
  template: `
    <i class="m-br m-br--tl" aria-hidden="true"></i><i class="m-br m-br--tr" aria-hidden="true"></i><i class="m-br m-br--bl" aria-hidden="true"></i><i class="m-br m-br--br" aria-hidden="true"></i>
    <div class="m-panel__strip" *ngIf="label">
      <i *ngIf="icon" class="bi m-panel__icon" [ngClass]="icon" aria-hidden="true"></i>
      <span class="m-panel__label">{{ label }}</span>
      <span class="m-panel__aside"><ng-content select="[panelAside]"></ng-content>{{ aside }}</span>
    </div>
    <ng-content></ng-content>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false
})
export class MobilePanelComponent {
  /** teks strip kepala; kosong = tanpa strip */
  @Input() label = '';
  /** kelas Bootstrap Icons, mis. `bi-speedometer2` */
  @Input() icon = '';
  /** teks kanan strip (alternatif: konten `[panelAside]`) */
  @Input() aside = '';
  /** `theme` = panel utama layar (garis teal) · `danger` = panel item kritis */
  @Input() tone: '' | 'theme' | 'danger' = '';
  /** padding isi standar 12px */
  @Input() pad = false;

  @HostBinding('class.m-panel') readonly base = true;
  @HostBinding('class.m-panel--theme') get isTheme(): boolean { return this.tone === 'theme'; }
  @HostBinding('class.m-panel--danger') get isDanger(): boolean { return this.tone === 'danger'; }
  @HostBinding('class.m-panel--pad') get isPad(): boolean { return this.pad; }
}
