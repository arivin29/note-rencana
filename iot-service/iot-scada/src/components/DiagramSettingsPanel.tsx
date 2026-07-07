// ============================================================
// DiagramSettingsPanel — Edit diagram name/description/status
// Triggered from TopBar diagram name click (edit mode only)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore } from '@/stores/useUiStore'
import { toast } from '@/components/Toast'

// Node types that represent a sensor/readout — an edge touching one is a data link, not a pipe
const SIGNAL_ENDPOINT_TYPES = new Set([
  'value_display', 'sensor', 'pressure', 'flowmeter', 'meter', 'level_sensor',
  'ph_sensor', 'turbidity_sensor', 'chlorine_sensor', 'temperature_sensor',
  'conductivity_sensor', 'do_sensor',
])

export function DiagramSettingsPanel() {
  const isOpen = useUiStore((s) => s.diagramSettingsOpen)
  const setOpen = useUiStore((s) => s.setDiagramSettingsOpen)
  const mode = useUiStore((s) => s.mode)

  const meta = useDiagramStore((s) => s.meta)
  const updateMeta = useDiagramStore((s) => s.updateMeta)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const updateEdge = useDiagramStore((s) => s.updateEdge)

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

  // Count edges that touch a sensor/readout node but aren't yet a signal link
  const convertibleCount = edges.reduce((acc, e) => {
    if (e.pipeType === 'signal') return acc
    const src = nodes.find((n) => n.id === e.source)?.type ?? ''
    const tgt = nodes.find((n) => n.id === e.target)?.type ?? ''
    return acc + (SIGNAL_ENDPOINT_TYPES.has(src) || SIGNAL_ENDPOINT_TYPES.has(tgt) ? 1 : 0)
  }, 0)

  const convertSensorLinks = useCallback(() => {
    const typeById = new Map(nodes.map((n) => [n.id, n.type]))
    let count = 0
    edges.forEach((e) => {
      if (e.pipeType === 'signal') return
      const src = typeById.get(e.source) ?? ''
      const tgt = typeById.get(e.target) ?? ''
      if (SIGNAL_ENDPOINT_TYPES.has(src) || SIGNAL_ENDPOINT_TYPES.has(tgt)) {
        updateEdge(e.id, { pipeType: 'signal', flowDirection: 'none', animated: false })
        count++
      }
    })
    if (count > 0) toast.success(`${count} penghubung sensor dijadikan Sinyal`)
    else toast.info('Tidak ada penghubung sensor yang perlu dikonversi')
  }, [nodes, edges, updateEdge])

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

        {/* Tools — bulk convert sensor links to signal style */}
        <div className="pt-1 border-t border-surface-border">
          <label className="scada-label">Alat</label>
          <button
            onClick={convertSensorLinks}
            disabled={convertibleCount === 0}
            className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg text-xs border border-surface-border bg-canvas text-[var(--text-secondary)] hover:border-accent/40 hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Ubah semua garis yang menyentuh node sensor/readout menjadi gaya Sinyal (dashed)"
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M2 8h3l2-4 2 8 2-4h3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Jadikan Sinyal (penghubung sensor)
            </span>
            {convertibleCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent">{convertibleCount}</span>
            )}
          </button>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-snug">
            Garis ke node sensor/readout diubah jadi putus-putus tipis (bukan pipa). Baru dibuat otomatis; ini untuk edge lama.
          </p>
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
