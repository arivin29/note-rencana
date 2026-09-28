import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type CartoStyle = 'dark_all' | 'light_all' | 'voyager';

/**
 * URL basemap CARTO untuk semua peta (WebGIS desktop & peta mobile).
 *
 * CARTO mewajibkan API key: tanpa key, tile yang dikirim balik adalah gambar
 * bertuliskan "API KEY REQUIRED". Key diisi sekali di environment.cartoApiKey.
 */
@Injectable({ providedIn: 'root' })
export class BasemapService {

    /** Wajib tetap tampil di peta sesuai syarat pakai CARTO & OSM. */
    readonly attribution = '© OpenStreetMap © CARTO';

    get hasKey(): boolean {
        return !!(environment as any).cartoApiKey;
    }

    /** Template XYZ siap pakai OpenLayers (placeholder {a-d}, {z}, {x}, {y}, {r} dipertahankan). */
    carto(style: CartoStyle = 'dark_all'): string {
        const url = `https://{a-d}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`;
        const key = (environment as any).cartoApiKey as string | undefined;
        return key ? `${url}?key=${encodeURIComponent(key)}` : url;
    }
}
