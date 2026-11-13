---
name: page-guide
description: Use when adding or changing any page, tab, feature or module in iot-angular — every page must have an in-app "Panduan" (guide drawer) and it must be updated in the same change. Also use when a route has no `data.guide`, when the Panduan button doesn't appear, or when writing/updating files in src/assets/guides/.
---

# Page Guide (Panduan)

Every page has a Markdown guide shown in a right-hand drawer via the **Panduan** button. A page change is not done until its guide matches the new behaviour.

## How it is wired (infra already exists)
| Piece | Where |
|---|---|
| Content | `src/assets/guides/<guideKey>.md` (one file per page) |
| Route ↔ guide | `data: { guide: '<guideKey>' }` on the route; the deepest active route with `data.guide` wins (embedded tabs work) |
| Button | `<page-guide-button>` — left-most item of the page header's right action group; hides itself when the route has no `data.guide`. In the project workspace it already sits in the shell toolbar (don't add a second one) |
| Drawer | `<page-guide-drawer>` mounted once in `app.component.html`; closes on navigation; shows "belum tersedia" when the file is missing |
| Module | `GuideModule` (`src/app/shared/guide/guide.module.ts`) — import in the feature module that renders the button |

## File format
```markdown
---
title: Sensor Proyek
version: 1.1.0            # bump on every change (minor = new section, patch = wording)
updatedAt: 2026-11-13     # date of the change
audience: operator, supervisor distribusi, admin
sources: [src/app/pages/.../sensors-page.component.ts, src/app/pages/.../sensors-page.component.html, src/app/shared/utils/telemetry-freshness.ts]
related: [project-overview, sensor-channel-detail]
---
```
Sections, in order: Untuk apa halaman ini · Bagian-bagian layar · Cara melakukan tugas umum (numbered steps) · Arti status/warna/angka (table) · Tips · FAQ.
Bahasa Indonesia for PDAM operators. Drawer is 480 px: tables ≤ 3 columns, short paragraphs.

## Workflow
1. Page is audited (`pdam-operator`, `enterprise-ux-auditor`, `senior-dev-auditor` → `docs/audit/…`) and fixed.
2. Add/keep `data.guide` on the route.
3. Run agent **`guide-writer`** with the guide key, the page's source files, and the audit's "Hal yang perlu dijelaskan di Panduan".
4. Check every claim against code (button labels, thresholds, refresh interval). Never document a feature that doesn't exist; state limitations honestly.
5. Bump `version` + `updatedAt`; keep `sources` accurate (used to detect stale guides).

## Common mistakes
- Changing labels/thresholds/columns in a page without touching its `.md` → guide lies.
- Writing the guide before the audit/fix → documents bugs as features.
- Adding `<page-guide-button>` inside a workspace tab → two buttons (the shell toolbar already has one).
- Existing guides: `project-overview`, `project-sensors`, `sensor-channel-detail`.
