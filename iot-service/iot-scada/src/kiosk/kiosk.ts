// ============================================================
// Kiosk mode — read-only, chrome-less SCADA view for TV / dashboard
// widgets (Angular Widget Builder iframe). Driven by query params on the
// embed VIEW route only:
//
//   /embed/:projectId/diagrams/:diagramId/view?kiosk=1&interactive=1&theme=dark&bg=theme
//
//   kiosk=1|0          (default 0)  aktifkan mode kiosk
//   interactive=1|0    (default 1)  1 = zoom/pan + kontrol pojok + tooltip klik; 0 = statis
//   theme=dark|light   (default dark) — light belum punya token → fallback dark
//   bg=theme|transparent (default theme) — transparent = latar iframe induk terlihat
// ============================================================

export type KioskTheme = 'dark' | 'light'

export interface KioskConfig {
  enabled: boolean
  interactive: boolean
  /** Theme requested via `theme=` (raw request). */
  theme: KioskTheme
  transparent: boolean
}

/** Module-level constant — used as the store default (stable reference). */
export const KIOSK_OFF: KioskConfig = Object.freeze({
  enabled: false,
  interactive: true,
  theme: 'dark',
  transparent: false,
}) as KioskConfig

// Fit tuning for kiosk (TV / small iframe)
export const KIOSK_MIN_ZOOM = 0.02
export const KIOSK_FIT_PADDING = 0.06
export const KIOSK_FIT_MAX_ZOOM = 2
export const KIOSK_RESIZE_DEBOUNCE_MS = 150

// ── Text counter-scale (TV legibility) ──
// Readable texts (live value + unit, node label, zone title, value_display chip)
// are multiplied by `--kiosk-text-boost` (set on `.react-flow` from the viewport
// zoom). boost = clamp(1, TARGET/zoom, MAX) → on-screen text ≈ base × TARGET css-px
// whenever the fit zoom is below TARGET (e.g. value 14 px → ~25 px, label 9-10 px
// → ~16-17 px inside the iframe). Never shrinks (min 1), never explodes (max).
// Outside kiosk the var is unset → every `var(--kiosk-text-boost, 1)` = 1.
export const KIOSK_TEXT_BOOST_VAR = '--kiosk-text-boost'
export const KIOSK_TEXT_TARGET = 1.75
export const KIOSK_TEXT_BOOST_MAX = 3

export function kioskTextBoost(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1
  const b = Math.min(KIOSK_TEXT_BOOST_MAX, Math.max(1, KIOSK_TEXT_TARGET / zoom))
  return Math.round(b * 100) / 100
}

/** CSS `transform` fragment scaling an element by the kiosk text boost (1 outside kiosk). */
export const KIOSK_BOOST_SCALE = `scale(var(${KIOSK_TEXT_BOOST_VAR}, 1))`

// Corner controls auto-hide after this long without pointer/touch/key activity
export const KIOSK_CONTROLS_IDLE_MS = 4000

const EMBED_VIEW_RE = /^\/embed\/[^/]+\/diagrams\/[^/]+\/view\/?$/

function flag(v: string | null, fallback: boolean): boolean {
  if (v == null || v === '') return fallback
  const s = v.toLowerCase()
  if (s === '1' || s === 'true' || s === 'yes') return true
  if (s === '0' || s === 'false' || s === 'no') return false
  return fallback
}

/** True when the current path is the embed VIEW route (the only route kiosk applies to). */
export function isEmbedViewPath(pathname: string = window.location.pathname): boolean {
  return EMBED_VIEW_RE.test(pathname)
}

export function readKioskConfig(
  search: string = window.location.search,
  pathname: string = window.location.pathname,
): KioskConfig {
  if (!isEmbedViewPath(pathname)) return KIOSK_OFF
  const p = new URLSearchParams(search)
  const enabled = flag(p.get('kiosk'), false)
  if (!enabled) return KIOSK_OFF
  const theme: KioskTheme = p.get('theme')?.toLowerCase() === 'light' ? 'light' : 'dark'
  return {
    enabled: true,
    interactive: flag(p.get('interactive'), true),
    theme,
    transparent: p.get('bg')?.toLowerCase() === 'transparent',
  }
}

/**
 * Apply theme/background classes to <html>. Only dark tokens exist today
 * (`index.css :root`, tailwind hex palette) → `theme=light` falls back to dark.
 * Returns a cleanup that restores the previous state.
 */
export function applyKioskDocument(cfg: KioskConfig): () => void {
  const root = document.documentElement
  if (!cfg.enabled) return () => {}
  const hadDark = root.classList.contains('dark')
  root.classList.add('dark')
  root.classList.add('scada-kiosk')
  if (cfg.transparent) root.classList.add('scada-kiosk-transparent')
  if (cfg.theme === 'light') {
    console.info('[SCADA kiosk] theme=light belum didukung — memakai tema gelap')
  }
  return () => {
    root.classList.remove('scada-kiosk', 'scada-kiosk-transparent')
    if (!hadDark) root.classList.remove('dark')
  }
}
