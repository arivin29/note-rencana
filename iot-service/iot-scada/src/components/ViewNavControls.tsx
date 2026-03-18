// ============================================================
// ViewNavControls — Floating navigation for view & fullscreen
// Zoom +/-, Fit View, Zoom level, Lock pan, Fullscreen, MiniMap
// ============================================================

import React, { useCallback, useState } from 'react'
import { useReactFlow, useViewport, MiniMap } from '@xyflow/react'
import { useUiStore } from '@/stores/useUiStore'

// ── Icon helpers ──────────────────────────────────────────────

const ZoomInIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3 3M7 5v4M5 7h4" strokeLinecap="round" />
  </svg>
)
const ZoomOutIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3 3M5 7h4" strokeLinecap="round" />
  </svg>
)
const FitViewIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const LockIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
  </svg>
)
const UnlockIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5 7V5a3 3 0 016 0" strokeLinecap="round" />
  </svg>
)
const FullscreenIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ExitFullscreenIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M5 2v3H2M11 2v3h3M5 14v-3H2M11 14v-3h3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const MapIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <rect x="4" y="4" width="4" height="3" rx="0.5" fill="currentColor" opacity={0.3} />
  </svg>
)

// ── Tooltip button ────────────────────────────────────────────

interface NavBtnProps {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
  className?: string
}

function NavBtn({ onClick, title, active, children, className = '' }: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        'w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150',
        active
          ? 'bg-accent/20 text-accent border border-accent/30'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ── Divider ───────────────────────────────────────────────────

function Divider() {
  return <div className="w-px h-5 bg-white/10 mx-0.5" />
}

// ── Main component ────────────────────────────────────────────

export function ViewNavControls() {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow()
  const viewport = useViewport()

  const isFullscreen = useUiStore((s) => s.isFullscreen)
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen)
  const isPanLocked = useUiStore((s) => s.isPanLocked)
  const togglePanLock = useUiStore((s) => s.togglePanLock)

  const [showMiniMap, setShowMiniMap] = useState(false)

  const zoomPercent = Math.round(viewport.zoom * 100)

  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn])
  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut])
  const handleFitView = useCallback(() => fitView({ duration: 400, padding: 0.2 }), [fitView])

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
    toggleFullscreen()
  }, [toggleFullscreen])

  return (
    <>
      {/* Floating controls — bottom-right */}
      <div
        className="absolute bottom-4 right-4 z-10 flex items-center gap-0.5 bg-[rgba(13,17,23,0.88)] backdrop-blur-md border border-white/10 rounded-xl px-1.5 py-1 shadow-lg"
        style={{ pointerEvents: 'all' }}
      >
        {/* Zoom out */}
        <NavBtn onClick={handleZoomOut} title="Zoom Out (-)">
          <ZoomOutIcon />
        </NavBtn>

        {/* Zoom level indicator */}
        <button
          onClick={handleFitView}
          title="Click to fit view"
          className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] w-10 text-center tabular-nums transition-colors"
        >
          {zoomPercent}%
        </button>

        {/* Zoom in */}
        <NavBtn onClick={handleZoomIn} title="Zoom In (+)">
          <ZoomInIcon />
        </NavBtn>

        <Divider />

        {/* Fit view */}
        <NavBtn onClick={handleFitView} title="Fit View (Shift+F)">
          <FitViewIcon />
        </NavBtn>

        <Divider />

        {/* Lock pan */}
        <NavBtn
          onClick={togglePanLock}
          title={isPanLocked ? 'Unlock Pan' : 'Lock Pan'}
          active={isPanLocked}
        >
          {isPanLocked ? <LockIcon /> : <UnlockIcon />}
        </NavBtn>

        <Divider />

        {/* MiniMap toggle */}
        <NavBtn
          onClick={() => setShowMiniMap((v) => !v)}
          title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
          active={showMiniMap}
        >
          <MapIcon />
        </NavBtn>

        <Divider />

        {/* Fullscreen */}
        <NavBtn
          onClick={handleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen (F)'}
          active={isFullscreen}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </NavBtn>
      </div>

      {/* MiniMap */}
      {showMiniMap && (
        <div className="absolute bottom-16 right-4 z-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
          <MiniMap
            style={{
              width: 180,
              height: 120,
              backgroundColor: 'rgba(13,17,23,0.9)',
            }}
            maskColor="rgba(14,165,233,0.08)"
            nodeColor="#334155"
            nodeBorderRadius={4}
          />
        </div>
      )}
    </>
  )
}

// ── Fullscreen overlay (clock + exit) — shown in fullscreen mode ──

export function FullscreenOverlay() {
  const isFullscreen = useUiStore((s) => s.isFullscreen)
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen)
  const [time, setTime] = React.useState(() => new Date())

  React.useEffect(() => {
    if (!isFullscreen) return
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [isFullscreen])

  // Listen for native fullscreen exit (Esc / F11)
  React.useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && isFullscreen) {
        toggleFullscreen()
      }
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [isFullscreen, toggleFullscreen])

  if (!isFullscreen) return null

  const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = time.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-3 pointer-events-auto">
      {/* Clock */}
      <div className="flex flex-col items-end bg-[rgba(13,17,23,0.75)] backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
        <span className="text-sm font-mono font-semibold text-[var(--text-primary)] tabular-nums leading-none">
          {timeStr}
        </span>
        <span className="text-[9px] text-[var(--text-muted)] leading-none mt-0.5">
          {dateStr}
        </span>
      </div>

      {/* Exit fullscreen button */}
      <button
        onClick={() => {
          document.exitFullscreen().catch(() => {})
          toggleFullscreen()
        }}
        title="Exit Fullscreen (Esc)"
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgba(13,17,23,0.75)] backdrop-blur-md border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
      >
        <ExitFullscreenIcon />
      </button>
    </div>
  )
}
