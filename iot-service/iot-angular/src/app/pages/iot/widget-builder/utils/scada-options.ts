/**
 * "Bagan SCADA" widget (`scada`) — options reader + embed params. Pure, no Angular imports.
 * Stored in `widget.config.display.scadaOptions`. The widget embeds the iot-scada viewer
 * (`<app-scada-embed>`), it runs no SQL (sql_query is saved as `SELECT 1` because the column is NOT NULL).
 */
import { ScadaEmbedParams } from '../../../../shared/scada-embed/scada-embed-url';

export type ScadaWidgetTheme = 'auto' | 'dark' | 'light';

export interface ScadaWidgetOptions {
  /** id_scada_diagram — required */
  diagramId: string;
  /** Allow pan/zoom/klik di bagan (iot-scada kiosk `interactive=1|0`) */
  interactive: boolean;
  /** `auto` = ikuti tema aplikasi (`data-bs-theme`) */
  theme: ScadaWidgetTheme;
}

export const DEFAULT_SCADA_OPTIONS: ScadaWidgetOptions = {
  diagramId: '',
  interactive: true,
  theme: 'auto',
};

/** SQL stored for a `scada` widget (custom_widgets.sql_query is NOT NULL; never executed). */
export const SCADA_WIDGET_SQL = 'SELECT 1';

/** Normalize a saved/partial options object (unknown values → defaults). */
export function readScadaOptions(raw: any): ScadaWidgetOptions {
  const o = raw && typeof raw === 'object' ? raw : {};
  const theme: ScadaWidgetTheme = o.theme === 'dark' || o.theme === 'light' ? o.theme : 'auto';
  return {
    diagramId: typeof o.diagramId === 'string' ? o.diagramId.trim() : '',
    interactive: o.interactive !== false,
    theme,
  };
}

/** Concrete theme for the embed. `auto` follows the app (`data-bs-theme`; app default = dark). */
export function resolveScadaTheme(theme: ScadaWidgetTheme, appTheme: string | null | undefined): 'dark' | 'light' {
  if (theme === 'dark' || theme === 'light') return theme;
  return appTheme === 'light' ? 'light' : 'dark';
}

/** Query params for the iot-scada kiosk viewer: `kiosk=1&interactive=1|0&theme=dark|light`. */
export function scadaEmbedParams(opts: ScadaWidgetOptions, appTheme: string | null | undefined): ScadaEmbedParams {
  return {
    kiosk: '1',
    interactive: opts.interactive ? '1' : '0',
    theme: resolveScadaTheme(opts.theme, appTheme),
  };
}

export type ScadaWidgetState = 'no-project' | 'no-diagram' | 'ok';

/** Which message/embed the widget shows. */
export function scadaWidgetState(projectId: string | null | undefined, opts: ScadaWidgetOptions): ScadaWidgetState {
  if (!projectId) return 'no-project';
  if (!opts.diagramId) return 'no-diagram';
  return 'ok';
}
