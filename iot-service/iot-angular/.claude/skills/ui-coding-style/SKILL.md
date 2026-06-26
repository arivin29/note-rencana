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
- Call `xxxService.xControllerFindAll$Response(params)`, then in `next` read `response.body`, JSON.parse if it's a string, then take `.data` (list) per the shared contract `{ data, meta }`.
```typescript
this.nodesService.nodesControllerFindAll$Response({ page: 1, limit: 100, search }).subscribe({
  next: (res) => { let b: any = res.body; if (typeof b === 'string') b = JSON.parse(b);
                   this.nodes = (b.data || []) as NodeResponseDto[]; this.loading = false; },
  error: (err) => { this.error = err?.message || 'Failed to load'; this.loading = false; }
});
```
- State: RxJS `BehaviorSubject` exposed as `public x$: Observable<…>`. **No NgRx, no Signals.** Unsubscribe with `takeUntil(this.destroy$)` + `ngOnDestroy`.
- Auth/token is handled globally by `JwtInterceptor` + `AuthService`; don't add Authorization headers manually.

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
- [ ] loading / error / empty states handled
- [ ] subscriptions cleaned up
