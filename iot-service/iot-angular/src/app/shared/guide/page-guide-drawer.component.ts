import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { marked } from 'marked';
import { GuideContent, GuideService } from './guide.service';

/**
 * Drawer Panduan — dipasang SATU KALI di layout, bukan per halaman.
 * Isinya mengikuti `data.guide` route yang sedang aktif.
 */
@Component({
    selector: 'page-guide-drawer',
    templateUrl: './page-guide-drawer.component.html',
    styleUrls: ['./page-guide-drawer.component.scss'],
    standalone: false
})
export class PageGuideDrawerComponent implements OnInit, OnDestroy {
    open = false;
    loading = false;
    content: GuideContent | null = null;
    /** HTML hasil render markdown; disanitasi Angular lewat [innerHTML]. */
    html = '';

    private destroy$ = new Subject<void>();

    constructor(public guide: GuideService) { }

    ngOnInit() {
        this.guide.open$.pipe(takeUntil(this.destroy$)).subscribe((open) => {
            this.open = open;
        });

        this.guide.key$
            .pipe(
                takeUntil(this.destroy$),
                switchMap((key) => {
                    this.content = null;
                    this.html = '';
                    if (!key) return [null];
                    this.loading = true;
                    return this.guide.load(key);
                })
            )
            .subscribe((content) => {
                this.loading = false;
                this.content = content;
                this.html = content ? (marked.parse(content.body) as string) : '';
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    close() {
        this.guide.close();
    }
}
