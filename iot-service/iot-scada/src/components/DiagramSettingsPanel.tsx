// ============================================================
// DiagramSettingsPanel — Edit diagram name/description/status
// Triggered from TopBar diagram name click (edit mode only)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore } from '@/stores/useUiStore'

export function DiagramSettingsPanel() {
  const isOpen = useUiStore((s) => s.diagramSettingsOpen)
  const setOpen = useUiStore((s) => s.setDiagramSettingsOpen)
  const mode = useUiStore((s) => s.mode)

  const meta = useDiagramStore((s) => s.meta)
  const updateMeta = useDiagramStore((s) => s.updateMeta)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<string>('draft')

  const panelRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  // Sync form when opening
  useEffect(() => {
    if (isOpen && meta) {
      setName(meta.name ?? '')
      setDescription(meta.description ?? '')
      setStatus(meta.status ?? 'draft')
      setTimeout(() => nameRef.current?.select(), 50)
    }
  }, [isOpen, meta])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleApply()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, name, description, status])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen, setOpen])

  const handleApply = useCallback(() => {
    if (!meta) return
    const trimmedName = name.trim() || meta.name
    if (
      trimmedName !== meta.name ||
      description !== (meta.description ?? '') ||
      status !== (meta.status ?? 'draft')
    ) {
      updateMeta({
        name: trimmedName,
        description: description || undefined,
        status: status as any,
      })
    }
    setOpen(false)
  }, [meta, name, description, status, updateMeta, setOpen])

  if (!isOpen || !meta || mode !== 'edit') return null

  return (
    <div
      ref={panelRef}
      className="absolute left-1/2 -translate-x-1/2 top-11 z-50 w-80 bg-surface border border-surface-border rounded-xl shadow-panel panel-slide-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Diagram Settings
        </span>
        <button
          onClick={() => setOpen(false)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <div className="p-4 space-y-3">
        {/* Name */}
        <div>
          <label className="scada-label">Nama Diagram</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="scada-input"
            placeholder="Nama diagram..."
          />
        </div>

        {/* Description */}
        <div>
          <label className="scada-label">Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="scada-input resize-none"
            rows={2}
            placeholder="Deskripsi opsional..."
          />
        </div>

        {/* Status */}
        <div>
          <label className="scada-label">Status</label>
          <div className="flex gap-1.5">
            {(['draft', 'active', 'archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={[
                  'flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-150 border',
                  status === s
                    ? s === 'active'
                      ? 'bg-status-ok/15 text-status-ok border-status-ok/30'
                      : s === 'archived'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-canvas text-[var(--text-muted)] border-surface-border hover:text-[var(--text-secondary)] hover:border-surface-border/80',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Diagram code (read-only) */}
        {meta.diagramCode && (
          <div>
            <label className="scada-label">Kode Diagram</label>
            <div className="text-xs font-mono text-[var(--text-muted)] bg-canvas px-3 py-1.5 rounded-md border border-surface-border">
              {meta.diagramCode}
            </div>
          </div>
        )}

        {/* Diagram ID (read-only) */}
        <div>
          <label className="scada-label">Diagram ID</label>
          <div className="text-[10px] font-mono text-[var(--text-muted)] bg-canvas px-3 py-1.5 rounded-md border border-surface-border truncate">
            {meta.id}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-surface-border">
        <button onClick={() => setOpen(false)} className="btn-ghost text-xs">
          Batal
        </button>
        <button onClick={handleApply} className="btn-primary text-xs">
          Terapkan
        </button>
      </div>
    </div>
  )
}
