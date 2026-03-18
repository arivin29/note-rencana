// ============================================================
// DiagramListPage — Daftar semua diagram SCADA (via generated SDK)
// ============================================================

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  scadaDiagramsControllerFindAll,
  scadaDiagramsControllerCreate,
  scadaDiagramsControllerArchive,
} from '@/sdk/services.gen'
import { useAuth } from '@/components/AuthGate'
import { getAuthHeaders } from '@/services/auth.service'
import type { ScadaDiagramListItemResponseDto } from '@/sdk/models'

// ── Types ─────────────────────────────────────────────────────

interface ProjectItem {
  idProject: string
  name: string
  projectCode?: string
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_COLOR: Record<string, string> = {
  active:   'text-status-ok border-status-ok/30 bg-status-ok/10',
  draft:    'text-[var(--text-muted)] border-surface-border bg-canvas',
  archived: 'text-gray-600 border-gray-700 bg-canvas',
}

// ── Component ─────────────────────────────────────────────────

export function DiagramListPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [diagrams, setDiagrams]     = useState<ScadaDiagramListItemResponseDto[]>([])
  const [projects, setProjects]     = useState<ProjectItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [error, setError]           = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // Form state
  const [newName, setNewName]           = useState('')
  const [newProjectId, setNewProjectId] = useState('')

  // ownerId: wajib, auto dari user yang login
  const ownerId = user?.idOwner ?? ''

  // Load diagrams
  const load = async () => {
    try {
      setLoading(true)
      const res = await scadaDiagramsControllerFindAll()
      const list = res.data ?? []
      setDiagrams(Array.isArray(list) ? list : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  // Load projects untuk dropdown
  const loadProjects = async () => {
    if (!ownerId) return
    try {
      const res = await fetch(`/api/owners/${ownerId}/projects`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) return
      const data = await res.json()
      const list: ProjectItem[] = data?.data ?? data?.projects ?? data ?? []
      setProjects(Array.isArray(list) ? list : [])
    } catch {
      // Silent — project selector tetap bisa diisi manual bila perlu
    }
  }

  useEffect(() => {
    load()
    loadProjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenCreate = () => {
    setNewName('')
    setNewProjectId('')
    setShowCreate(true)
  }

  const handleCreate = async () => {
    if (!newName.trim() || !ownerId) return
    setCreating(true)
    try {
      const res = await scadaDiagramsControllerCreate({
          name:      newName.trim(),
          ownerId,
          projectId: newProjectId || undefined,
          status:    'draft',
      })
      const id = res.data?.diagram?.id
      if (id) navigate(`/diagrams/${id}/edit`)
    } catch {
      setError('Failed to create diagram')
      setCreating(false)
    }
  }

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Archive this diagram?')) return
    try {
      await scadaDiagramsControllerArchive(id)
      setDiagrams((d) => d.filter((x) => x.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className="h-full w-full bg-canvas flex flex-col">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-surface-border bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-accent" fill="currentColor">
              <rect x="2" y="12" width="9" height="9" rx="1.5" />
              <rect x="13" y="3" width="9" height="9" rx="1.5" />
              <path d="M6.5 12V8M17.5 12v4M6.5 8h11" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">SCADA Diagrams</h1>
            <p className="text-xs text-[var(--text-muted)]">{user?.name ?? user?.email}</p>
          </div>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v6M5 8h6" strokeLinecap="round" />
          </svg>
          New Diagram
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">Loading diagrams...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-status-alert">{error}</p>
            <button onClick={load} className="btn-ghost text-sm">Retry</button>
          </div>
        ) : diagrams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <rect x="5" y="18" width="10" height="8" rx="2" />
                <rect x="17" y="6" width="10" height="8" rx="2" />
                <path d="M10 18v-5M22 14v6M10 13h12" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">No diagrams yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Create your first SCADA diagram to get started</p>
            </div>
            <button onClick={handleOpenCreate} className="btn-primary">Create Diagram</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {diagrams.map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/diagrams/${d.id}/view`)}
                className="group bg-surface border border-surface-border rounded-xl p-4 cursor-pointer
                           hover:border-accent/30 hover:bg-surface-hover transition-all duration-150
                           flex flex-col gap-3 relative"
              >
                <div className="flex items-start justify-between">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLOR[d.status] ?? STATUS_COLOR.draft}`}>
                    {d.status}
                  </span>
                  <button
                    onClick={(e) => handleArchive(d.id, e)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-status-alert transition-all"
                  >
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M2 6h12M6 2h4M4 6l1 8h6l1-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors line-clamp-2">{d.name}</h3>
                  {d.description && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{String(d.description)}</p>}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  {d.nodeCount != null && <span>{d.nodeCount} nodes</span>}
                  {d.edgeCount != null && <span>{d.edgeCount} edges</span>}
                </div>
                <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)]">{formatDate(d.updatedAt as unknown as string)}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/diagrams/${d.id}/view`) }} className="text-[10px] px-2 py-0.5 rounded hover:bg-surface-active text-[var(--text-muted)] hover:text-[var(--text-primary)]">View</button>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/diagrams/${d.id}/edit`) }} className="text-[10px] px-2 py-0.5 rounded hover:bg-accent/10 text-[var(--text-muted)] hover:text-accent">Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Create Modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-surface border border-surface-border rounded-2xl p-6 w-full max-w-sm shadow-panel panel-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">New Diagram</h2>
            <p className="text-xs text-[var(--text-muted)] mb-5">Buat diagram SCADA baru</p>

            <div className="flex flex-col gap-4">

              {/* Nama Diagram */}
              <div>
                <label className="scada-label">
                  Diagram Name <span className="text-status-alert">*</span>
                </label>
                <input
                  id="diagram-name"
                  className="scada-input"
                  placeholder="e.g. Main WTP Line"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>

              {/* Owner ID — read-only, dari user login */}
              <div>
                <label className="scada-label">
                  Owner ID <span className="text-status-alert">*</span>
                </label>
                <div className="scada-input bg-canvas/50 cursor-not-allowed flex items-center gap-2 overflow-hidden">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" fill="currentColor">
                    <circle cx="8" cy="5.5" r="3" />
                    <path d="M2 14c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <span className="text-xs font-mono text-[var(--text-secondary)] truncate">
                    {ownerId || 'Tidak tersedia'}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Otomatis dari akun yang sedang login
                </p>
              </div>

              {/* Project ID — optional, dropdown jika ada, manual jika tidak */}
              <div>
                <label className="scada-label">
                  Project
                  <span className="text-[var(--text-muted)] ml-1 font-normal text-[10px]">(opsional)</span>
                </label>
                {projects.length > 0 ? (
                  <select
                    id="diagram-project"
                    className="scada-select"
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                  >
                    <option value="">— Tanpa project —</option>
                    {projects.map((p) => (
                      <option key={p.idProject} value={p.idProject}>
                        {p.name}{p.projectCode ? ` (${p.projectCode})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="diagram-project-manual"
                    className="scada-input font-mono"
                    placeholder="Project UUID (opsional)"
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2 border-t border-surface-border">
                <button onClick={() => setShowCreate(false)} className="btn-ghost">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || !ownerId || creating}
                  className="btn-primary flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : 'Create Diagram'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
