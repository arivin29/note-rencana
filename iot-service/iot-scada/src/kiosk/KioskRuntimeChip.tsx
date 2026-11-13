// ============================================================
// KioskRuntimeChip — the only status chrome in kiosk mode.
// Hidden while runtime polling is healthy; when polling fails the TV
// would otherwise show frozen values silently, so flag it plainly.
// ============================================================

import React, { memo } from 'react'
import { useRuntimeStore } from '@/stores/useRuntimeStore'

function formatTime(v: Date | string | null): string {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export const KioskRuntimeChip = memo(function KioskRuntimeChip() {
  const pollingError  = useRuntimeStore((s) => s.pollingError)
  const lastSuccessAt = useRuntimeStore((s) => s.lastSuccessAt)

  if (!pollingError) return null

  return (
    <div
      role="status"
      className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border"
      style={{
        background: 'color-mix(in srgb, var(--surface-bg) 88%, transparent)',
        borderColor: 'color-mix(in srgb, var(--status-alert) 40%, transparent)',
      }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--status-alert)' }} />
      <span className="font-medium text-[var(--text-primary)]">Data tidak terbarui</span>
      <span className="text-[var(--text-secondary)]">
        · terakhir <span className="font-mono tabular-nums">{formatTime(lastSuccessAt)}</span>
      </span>
    </div>
  )
})
