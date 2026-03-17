// ============================================================
// RuntimeBanner — Banner strip saat runtime degraded/offline
// Tampil di bawah TopBar, auto-hide saat OK
// ============================================================

import React from 'react'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import { useShallow } from 'zustand/react/shallow'

export function RuntimeBanner() {
  const { pollingError, lastSuccessAt, summary, isPolling } = useRuntimeStore(
    useShallow((s) => ({
      pollingError:  s.pollingError,
      lastSuccessAt: s.lastSuccessAt,
      summary:       s.runtime?.summary ?? null,
      isPolling:     s.isPolling,
    })),
  )

  // Determine banner state
  const hasError    = Boolean(pollingError)
  const hasStale    = (summary?.staleBindings ?? 0) > 0
  const hasOffline  = (summary?.offlineBindings ?? 0) > 0
  const isDegraded  = hasStale || hasOffline

  // Don't show if everything OK
  if (!hasError && !isDegraded) return null

  // Elapsed since last success
  const elapsedSec = lastSuccessAt
    ? Math.floor((Date.now() - new Date(lastSuccessAt).getTime()) / 1000)
    : null

  // Error state — runtime polling failed
  if (hasError) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border-b border-red-500/20 text-xs runtime-banner-enter">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-status-alert flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v4M8 11h.01" strokeLinecap="round" />
        </svg>
        <span className="text-status-alert font-medium">Runtime Error</span>
        <span className="text-red-400/70">{pollingError}</span>
        {elapsedSec != null && elapsedSec > 10 && (
          <span className="text-red-400/50 ml-auto">
            Last update {elapsedSec}s ago
          </span>
        )}
        {isPolling && (
          <span className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin flex-shrink-0 ml-1" />
        )}
      </div>
    )
  }

  // Compute online count
  const total    = summary?.totalBindings ?? 0
  const offline  = summary?.offlineBindings ?? 0
  const stale    = summary?.staleBindings ?? 0
  const online   = Math.max(0, total - offline - stale)

  // Degraded state — some bindings are stale/offline
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/8 border-b border-amber-500/15 text-xs runtime-banner-enter">
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-status-warn flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M8 2L1 14h14L8 2z" strokeLinejoin="round" />
        <path d="M8 6v4M8 12h.01" strokeLinecap="round" />
      </svg>
      <span className="text-status-warn font-medium">Runtime Degraded</span>
      <span className="text-amber-400/70">
        {hasOffline && <><span className="text-status-alert">{offline} offline</span></>}
        {hasOffline && hasStale && ' · '}
        {hasStale && <><span className="text-status-warn">{stale} stale</span></>}
      </span>
      <span className="text-[var(--text-muted)] ml-1">
        · <span className="text-status-ok">{online} online</span> / {total} total
      </span>
    </div>
  )
}
