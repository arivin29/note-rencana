import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';

/**
 * Panduan in-app per halaman.
 *
 * Konten berupa berkas Markdown di `src/assets/guides/<guideKey>.md` sehingga ikut
 * versi git — syarat agar aturan "ubah halaman = ubah panduan" bisa ditegakkan.
 * Halaman tidak perlu tahu apa-apa: `guideKey` diambil dari `data.guide` pada
 * definisi route terdalam yang punya field itu.
 */

export interface GuideMeta {
    title: string;
    version: string;
    updatedAt: string;
    audience?: string;
}

export interface GuideContent {
    key: string;
    meta: GuideMeta;
    /** Isi markdown tanpa frontmatter. */
    body: string;
}

@Injectable({ providedIn: 'root' })
export class GuideService {
    private openSubject = new BehaviorSubject<boolean>(false);
    readonly open$ = this.openSubject.asObservable();

    private keySubject = new BehaviorSubject<string | null>(null);
    readonly key$ = this.keySubject.asObservable();

    private cache = new Map<string, GuideContent | null>();

    constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) {
        // Kunci panduan mengikuti route aktif; drawer ikut tertutup saat pindah halaman
        // supaya panduan halaman lama tidak menempel di halaman baru.
        this.router.events
            .pipe(filter((e) => e instanceof NavigationEnd))
            .subscribe(() => {
                this.keySubject.next(this.resolveGuideKey());
                this.openSubject.next(false);
            });

        this.keySubject.next(this.resolveGuideKey());
    }

    /** Route terdalam yang memiliki `data.guide` menang. */
    private resolveGuideKey(): string | null {
        let r: ActivatedRoute | null = this.route.root;
        let key: string | null = null;
        while (r) {
            const candidate = r.snapshot.data?.['guide'];
            if (candidate) key = candidate;
            r = r.firstChild;
        }
        return key;
    }

    get hasGuide(): boolean {
        return !!this.keySubject.value;
    }

    toggle() {
        this.openSubject.next(!this.openSubject.value);
    }

    close() {
        this.openSubject.next(false);
    }

    /**
     * Ambil konten panduan. `null` = panduan belum ditulis; pemanggil menampilkan
     * pesan jujur, bukan teks karangan.
     */
    load(key: string): Observable<GuideContent | null> {
        if (this.cache.has(key)) {
            return of(this.cache.get(key) ?? null);
        }
        return this.http.get(`assets/guides/${key}.md`, { responseType: 'text' }).pipe(
            map((raw) => this.parse(key, raw)),
            tap((content) => this.cache.set(key, content)),
            catchError(() => {
                this.cache.set(key, null);
                return of(null);
            })
        );
    }

    /** Frontmatter sederhana `--- key: value ---` di awal berkas. */
    private parse(key: string, raw: string): GuideContent {
        const meta: GuideMeta = { title: key, version: '-', updatedAt: '-' };
        let body = raw;

        const match = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/.exec(raw);
        if (match) {
            body = raw.slice(match[0].length);
            for (const line of match[1].split(/\r?\n/)) {
                const sep = line.indexOf(':');
                if (sep === -1) continue;
                const k = line.slice(0, sep).trim();
                const v = line.slice(sep + 1).trim().replace(/^["']|["']$/g, '');
                if (k === 'title') meta.title = v;
                else if (k === 'version') meta.version = v;
                else if (k === 'updatedAt') meta.updatedAt = v;
                else if (k === 'audience') meta.audience = v;
            }
        }

        return { key, meta, body };
    }
}
