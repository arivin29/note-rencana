// ============================================================
// TopBar — Header utama SCADA app
// Menampilkan: nama diagram, mode indicator, save, toggle mode
// ============================================================

import React from 'react'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore } from '@/stores/useUiStore'
import { useRuntimeStore } from '@/stores/useRuntimeStore'

interface TopBarProps {
  onSave: () => void
}

function RuntimeIndicator() {
  const { isPolling, lastSuccessAt, pollingError, summary } = useRuntimeStore(
    (s) => ({
      isPolling:    s.isPolling,
      lastSuccessAt: s.lastSuccessAt,
      pollingError: s.pollingError,
      summary:      s.runtime?.summary ?? null,
    }),
  )

  const hasError = Boolean(pollingError)
  const hasData  = Boolean(lastSuccessAt)

  return (
    <div className="flex items-center gap-1.5">
      {/* Dot indicator */}
      <span
        className={[
          'w-2 h-2 rounded-full',
          isPolling  ? 'bg-accent animate-pulse' :
          hasError   ? 'bg-status-alert' :
          hasData    ? 'bg-status-ok status-dot-pulse' :
                       'bg-gray-600',
        ].join(' ')}
      />
      <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
        {isPolling  ? 'Polling...' :
         hasError   ? 'Runtime error' :
         hasData    ? 'Live' :
                      'No data'}
      </span>
      {summary && !hasError && (
        <span className="text-xs text-[var(--text-muted)] hidden md:inline">
          {summary.offlineBindings > 0 && (
            <span className="text-status-alert ml-1">
              {summary.offlineBindings} offline
            </span>
          )}
          {summary.staleBindings > 0 && (
            <span className="text-status-warn ml-1">
              {summary.staleBindings} stale
            </span>
          )}
        </span>
      )}
    </div>
  )
}

export function TopBar({ onSave }: TopBarProps) {
  const meta     = useDiagramStore((s) => s.meta)
  const isDirty  = useDiagramStore((s) => s.isDirty)
  const isSaving = useDiagramStore((s) => s.isSaving)
  const saveError= useDiagramStore((s) => s.saveError)

  const mode     = useUiStore((s) => s.mode)
  const setMode  = useUiStore((s) => s.setMode)
  const setDiscardConfirmOpen = useUiStore((s) => s.setDiscardConfirmOpen)

  const handleToggleMode = () => {
    if (mode === 'edit' && isDirty) {
      setDiscardConfirmOpen(true)
    } else {
      setMode(mode === 'edit' ? 'view' : 'edit')
    }
  }

  return (
    <header className="h-11 flex items-center justify-between px-4 bg-surface border-b border-surface-border flex-shrink-0 z-10">
      {/* Left: brand + diagram name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          {/* SCADA logo mark */}
          <div className="w-6 h-6 rounded bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-accent" fill="currentColor">
              <rect x="1" y="7" width="6" height="6" rx="1" />
              <rect x="9" y="3" width="6" height="6" rx="1" />
              <path d="M4 7V4M12 9v3M4 4h8" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
          <span className="text-xs font-semibold tracking-wider text-accent uppercase hidden sm:inline">
            SCADA
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-surface-border" />

        {/* Diagram name */}
        <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
          {meta?.name ?? 'Loading...'}
        </span>

        {/* Unsaved indicator */}
        {isDirty && (
          <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
            •
          </span>
        )}
      </div>

      {/* Center: runtime status */}
      <div className="flex-1 flex justify-center">
        <RuntimeIndicator />
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Save error */}
        {saveError && (
          <span className="text-xs text-status-alert hidden md:inline">
            Save failed
          </span>
        )}

        {/* Save button (edit mode only) */}
        {mode === 'edit' && (
          <button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="btn-primary text-xs h-7 px-3 flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M13 11v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h2" />
                  <rect x="6" y="2" width="7" height="5" rx="0.5" />
                  <rect x="5" y="9" width="6" height="4" rx="0.5" />
                </svg>
                Save
              </>
            )}
          </button>
        )}

        {/* Mode toggle */}
        <button
          onClick={handleToggleMode}
          className={[
            'h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5',
            'border transition-all duration-150',
            mode === 'edit'
              ? 'text-[var(--text-secondary)] border-surface-border hover:text-[var(--text-primary)] hover:bg-surface-hover'
              : 'text-accent border-accent/30 bg-accent/10 hover:bg-accent/20',
          ].join(' ')}
        >
          {mode === 'edit' ? (
            <>
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M2 8a6 6 0 1012 0A6 6 0 002 8z" />
                <circle cx="8" cy="8" r="2" />
              </svg>
              View
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M11 2l3 3-8 8H3v-3l8-8z" />
              </svg>
              Edit
            </>
          )}
        </button>

        {/* Mode pill */}
        <div className={[
          'hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
          mode === 'edit'
            ? 'bg-brand/20 text-brand border border-brand/30'
            : 'bg-status-ok/10 text-status-ok border border-status-ok/30',
        ].join(' ')}>
          <span className={`w-1.5 h-1.5 rounded-full ${mode === 'edit' ? 'bg-brand' : 'bg-status-ok'}`} />
          {mode}
        </div>
      </div>
    </header>
  )
}
