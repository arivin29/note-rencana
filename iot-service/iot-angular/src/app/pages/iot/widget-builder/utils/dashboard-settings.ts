/**
 * Pure helpers for "Pengaturan Dashboard" — builds the PUT /dashboards/{id} body.
 * layout_config is MERGED (never replaced) so `variables` and future keys survive.
 */
import { ScreenConfig, readScreenConfig } from './screen-fit';
import { defaultPresetFrom, normalizeRefresh } from './dashboard-time';

export interface DashboardSettingsResult {
  name: string;
  description: string;
  idProject: string | null;
  timeRange: string;
  refreshInterval: number;
  screen: ScreenConfig;
}

export interface DashboardSettingsBody {
  name: string;
  description: string;
  idProject: string | null;
  timeRange: string;
  refreshInterval: number;
  layoutConfig: Record<string, any>;
}

export function buildDashboardSettingsBody(
  currentLayout: Record<string, any> | null | undefined,
  r: DashboardSettingsResult,
): DashboardSettingsBody {
  const s = r.screen;
  return {
    name: r.name,
    description: r.description,
    idProject: r.idProject ?? null,
    timeRange: defaultPresetFrom(r.timeRange),
    refreshInterval: normalizeRefresh(r.refreshInterval),
    layoutConfig: {
      ...(currentLayout || {}),
      screen: { preset: s.preset, width: s.width, height: s.height, rows: s.rows },
    },
  };
}

/** Short label for dashboard cards, or null for normal (auto) dashboards. */
export function screenBadge(layoutConfig: unknown): string | null {
  const s = readScreenConfig(layoutConfig);
  if (s.preset === 'tv-16-9') return 'TV 16:9';
  if (s.preset === 'custom') return `Layar ${s.width}×${s.height}`;
  return null;
}
