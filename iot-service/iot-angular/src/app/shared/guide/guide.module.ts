import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageGuideDrawerComponent } from './page-guide-drawer.component';
import { PageGuideButtonComponent } from './page-guide-button.component';

/**
 * Infrastruktur Panduan in-app.
 *
 * Pemakaian:
 *   • `<page-guide-drawer>` dipasang SATU KALI di layout (app.component.html).
 *   • `<page-guide-button>` dipakai di header halaman / header workspace, sebagai
 *     item paling kiri pada grup aksi kanan.
 *   • Halaman menautkan dirinya ke panduan lewat `data: { guide: '<guideKey>' }`
 *     pada definisi route; berkasnya di `src/assets/guides/<guideKey>.md`.
 *
 * Modul halaman yang ingin memakai tombolnya cukup meng-import `GuideModule`.
 */
@NgModule({
    declarations: [PageGuideDrawerComponent, PageGuideButtonComponent],
    imports: [CommonModule],
    exports: [PageGuideDrawerComponent, PageGuideButtonComponent]
})
export class GuideModule { }
