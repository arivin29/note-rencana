import { Component, Input } from '@angular/core';
import { GuideService } from './guide.service';

/**
 * Tombol "Panduan" — ditaruh sebagai item PALING KIRI pada grup aksi kanan di
 * header halaman. Sengaja bukan tombol mengambang: di halaman Map/SCADA tombol
 * mengambang bertabrakan dengan kontrol kanvas.
 *
 * Tombol menyembunyikan diri kalau route aktif tidak punya `data.guide`,
 * jadi aman dipasang di header bersama tanpa pengecekan per halaman.
 */
@Component({
    selector: 'page-guide-button',
    template: `
        <button type="button" class="btn btn-outline-default btn-sm" *ngIf="guide.hasGuide"
            (click)="guide.toggle()" title="Panduan halaman ini">
            <i class="fa fa-circle-question fa-fw"></i>
            <span class="d-none d-lg-inline ms-1" *ngIf="showLabel">Panduan</span>
        </button>
    `,
    standalone: false
})
export class PageGuideButtonComponent {
    /** Sembunyikan teks di header yang sudah padat. */
    @Input() showLabel = true;

    constructor(public guide: GuideService) { }
}
