# Catatan dari sesi lain (14 Nov 2026) — masuk rencana konsolidasi

Dari sesi iot-angular-d4 (terverifikasi di kodenya):
1. Locale id-ID berlaku juga di mobile, tapi `toFixed()`/`${n}` mengabaikan LOCALE_ID → "99.8%" vs "99,8%". Situs tampilan:
   - `mobile/nodes/node-info/mobile-node-info.component.ts:137` — `${up.percentage.toFixed(1)}%`
   - `mobile/projects/tabs/project-map/project-map.component.ts:153` `fmtVal()` (dipakai di popup `.html:44` dan label overlay `.ts:201`)
   Pola perbaikan: `@Inject(LOCALE_ID) locale` + `formatNumber(n, locale, '1.1-1')`.
2. JANGAN ubah toFixed berikut — koordinat path SVG, wajib titik: `mobile-channel-detail.component.ts:96,98,99`, `mobile/shared/util.ts:28,31`.
3. `fmtAgo()` di `project-map.component.ts:161` berbahasa Inggris ('now', `${m}m`, `${h}h`) → pakai `timeAgoId` dari `src/app/shared/utils/channel-display.ts`. Status perangkat wajib dari `getFreshness` (`telemetry-freshness.ts`).
4. Routing mobile sudah ber-AuthGuard (`mobile-routing.module.ts:33`).

Dari sesi scada:
- Tab SCADA project mobile memakai komponen bersama `<app-scada-embed>` (`src/app/shared/scada-embed/`, juga dipakai analytics-page & widget `scada`). Tetap pakai komponen itu; hubungi sesi scada sebelum mengubah input atau handshake scada-auth/scada-ready.
