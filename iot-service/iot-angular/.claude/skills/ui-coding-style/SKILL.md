---
name: ui-coding-style
description: Angular frontend coding conventions for the IoT app — read before any frontend work. NgModule (non-standalone), naming, file layout, RxJS/BehaviorSubject, ng-openapi-gen SDK usage, Bootstrap utilities and theme tokens. Use whenever creating/editing Angular components, services, modules, or styling.
---

# UI Coding Style (Angular 20, iot-angular)

The base conventions every frontend change must follow. For specific page types use `ui-list`, `ui-detail`, `ui-card`, `ui-form`.

## Architecture
- **NgModule everywhere, `standalone: false`.** Never introduce standalone components. New features go under `src/app/pages/<area>/<feature>/` with `<feature>.module.ts` + `<feature>-routing.module.ts`, lazy-loaded.
- Folder per view: `<feature>-list/`, `<feature>-add/`, `<feature>-edit/`, `<feature>-detail/`.
- Reuse the shared `<card>` / `<card-header>` / `<card-body>` components and `widgets/` rather than raw Bootstrap cards.

## Component skeleton
```typescript
@Component({
  selector: 'nodes-list',          // feature name, NO prefix
  templateUrl: './nodes-list.html',
  styleUrls: ['./nodes-list.scss'],
  standalone: false
})
export class NodesListPage implements OnInit, OnDestroy {
  // 1. @Input/@Output  2. public props  3. private props
  loading = false;
  error: string | null = null;
  nodes: NodeResponseDto[] = [];

  constructor(private nodesService: NodesService) {}
  ngOnInit() {}                    // 4. ctor  5. lifecycle
  // 6. public methods  7. private helpers
}
```

## Naming
- Classes/interfaces/enums `PascalCase`; props/methods `camelCase`; constants `UPPER_SNAKE_CASE`.
- API models suffixed `Dto` / `ResponseDto` / `RequestDto` (from the SDK). No `I` prefix on interfaces.
- Single = singular (`node`), arrays = plural (`nodes`), booleans `is*/has*/can*`, observables `name$`.
- Files & folders kebab-case. Selector = feature name without prefix (`nodes-list`, `info-card-widget`).

## Data / API
- Use the **generated SDK** in `src/sdk/core/` — never hand-edit it; regenerate with `npx ng-openapi-gen` (input `http://localhost:3000/api-json`).
- Lists: **never rely on the default page size** (backend defaults to 10/20 and caps at 100). Use `fetchAll` from `src/app/shared/utils/fetch-all.ts` — it pages through `meta.total` (or flat `total`) so nothing is silently cut. `parseBody` / `listOf` / `totalOf` handle string bodies and both envelopes.
```typescript
import { fetchAll } from '@app/shared/utils/fetch-all';

fetchAll(p => this.sensorsService.sensorsControllerFindAll$Response({ idProject: this.projectId, ...p }))
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (sensors) => { this.sensors = sensors; this.loading = false; },
    error: () => { this.error = 'Gagal memuat data sensor.'; this.loading = false; }
  });
```
- **One scoped request, not N+1.** Filter by parent on the server (`?idProject=`, `?idNode=`) instead of one request per node/sensor. If the SDK fn lacks the param, add it by hand (regen is broken) AND confirm the Go controller reads the **same name** (`ctx.Request().Query("idProject")`) — a mismatched name silently returns unfiltered data.
- **Counts come from `meta.total`**, never `array.length` of a page.
- State: RxJS `BehaviorSubject` exposed as `public x$: Observable<…>`. **No NgRx, no Signals.** Unsubscribe with `takeUntil(this.destroy$)` + `ngOnDestroy`.
- Auth/token is handled globally by `JwtInterceptor` + `AuthService`; don't add Authorization headers manually.

## Data honesty & shared rules (non-negotiable)
| Rule | Use |
|---|---|
| **No fake data** — no `Math.random`, `generateDummyData`, "estimated" uptime/latency, default thresholds (0/100), invented quality % | On failure: empty/error state + **Coba lagi**. No real source for a metric → don't show the metric |
| Device/sensor status (fresh/stale/offline/nodata) | `getFreshness(lastAt, node.telemetryIntervalSec)` + `FRESHNESS_BADGE` / `FRESHNESS_LABEL` / `timeAgo` from `src/app/shared/utils/telemetry-freshness.ts`. Never local minute thresholds |
| Node label | primary = `node.address \|\| node.code`; second line = `node.code` only when the address is shown |
| Unset numbers (thresholds, precision) | keep `null` → render "—" / "Belum diatur"; never `parseFloat(x) \|\| 0` |
| Decimals from `sensor_channels.precision` | `decimalsFromPrecision()` in `src/app/shared/utils/threshold.ts` (two meanings: p<1 = step → count its fraction digits, p>=1 = decimal count). Never `log10`/`toFixed(2)` locally. Test such rules against the **required** result (e.g. `String(step).split('.')[1].length`), not a hand-written expectation list — that's how 0.25 → "0.3" slipped through |
| Response flags | respect backend availability flags (e.g. `/sensors` `latestAvailable:false` → warning banner, not "No Data") |
| Displaying numbers | App locale is `id-ID` (`LOCALE_ID` in `app.module.ts`): use `| number:'1.2-2'` in templates or `formatNumber(v, locale, '1.2-2')` with `@Inject(LOCALE_ID)` in TS. `toFixed()`, template `${n}`, `String(n)` and JSON always print a dot — a page mixing both shows "1.79" next to "1,79". Keep the dot only for machine strings (SVG paths, CSV/Excel numeric cells, API params) |
| Excel export | `exceljs` + `file-saver` (see `report/report-page`). Excel has no timezone: shift `Date` by the local offset before writing or WIB times show 7 h early |

## Styling & theme
- Prefer Bootstrap 5 utility classes (`d-flex align-items-center`, `row g-3`, `col-lg-4`, `mb-3`, `text-muted`, `shadow-sm`). Add component SCSS only for what utilities can't do.
- Theme via CSS vars: `--bs-theme` (primary `#0271ff`), `text-theme`, `btn-theme`, `btn-outline-theme`. Dark-mode aware (`[data-bs-theme="dark"]`). Status colors: success `#22c55e`, warning `#fbbf24`, danger `#ef4444`.
- Icons: FontAwesome 6 `<i class="fa fa-microchip fa-fw me-1"></i>`.
- Pipes: `| date:'short'`, `| number:'1.0-2'`, `| titlecase`, `| slice`.

## Path aliases
`@app/* @sdk/* @models/* @services/* @components/* @pages/*` — use them instead of long relative paths.

## Checklist
- [ ] `standalone: false`, registered in the feature NgModule
- [ ] Uses generated SDK + shared contract parsing
- [ ] `<card>` wrappers + Bootstrap utilities + `--bs-theme`
- [ ] loading / error / empty states handled (loading ≠ "Tidak ada data")
- [ ] subscriptions, timers, debounces cleaned up in `ngOnDestroy`
- [ ] lists via `fetchAll` / scoped single request; counts from `meta.total`
- [ ] no fabricated values (`grep -nE "Math\.random|[dD]ummy|Simulat"` clean)
- [ ] status via `telemetry-freshness.ts`; node label = address
- [ ] page has `data.guide` + its Panduan updated (skill `page-guide`)
