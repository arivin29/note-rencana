// ============================================================
// NodeLibraryDrawer — n8n-style component picker with search & grouping
// ============================================================

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useUiStore } from '@/stores/useUiStore'
import { NodeGlyph } from '@/nodes/ScadaNodeFrame'

// ── Extra glyphs for types not in NodeGlyph ─────────────────
const ExtraGlyph: Record<string, React.ReactNode> = {
  sensor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity={0.2} />
    </svg>
  ),
  text_label: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10h10M7 14h6" strokeLinecap="round" />
    </svg>
  ),
  value_display: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <text x="12" y="15" textAnchor="middle" fill="currentColor" fontSize="7" stroke="none" fontWeight="bold" fontFamily="monospace" opacity={0.6}>42.5</text>
    </svg>
  ),
}

/** Get the SVG icon for a node type */
function getNodeIcon(type: string): React.ReactNode {
  return NodeGlyph[type] || ExtraGlyph[type] || null
}

// ── Category icons (SVG) ────────────────────────────────────
const CategoryIcon: Record<string, React.ReactNode> = {
  'Sumber Air': (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path d="M10 3c-3 4-6 6.5-6 9.5a6 6 0 0012 0C16 9.5 13 7 10 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'Pengolahan Air': (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <rect x="3" y="5" width="14" height="10" rx="2" strokeLinecap="round" />
      <path d="M3 9h14M7 5v10M13 5v10" strokeLinecap="round" />
    </svg>
  ),
  'Mekanikal': (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <circle cx="10" cy="10" r="3" />
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.05 5.05l1.41 1.41M13.54 13.54l1.41 1.41M5.05 14.95l1.41-1.41M13.54 6.46l1.41-1.41" strokeLinecap="round" />
    </svg>
  ),
  'Valve & Kontrol': (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path d="M3 10h4l3-5 3 5h4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="10" y1="5" x2="10" y2="3" strokeLinecap="round" />
      <rect x="8" y="2" width="4" height="2" rx="0.5" />
    </svg>
  ),
  'Instrumen': (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <circle cx="10" cy="10" r="6" />
      <path d="M10 7v3l2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'Distribusi': (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <circle cx="10" cy="10" r="2" />
      <path d="M10 3v5M10 12v5M3 10h5M12 10h5" strokeLinecap="round" />
    </svg>
  ),
  'Display & Label': (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <path d="M6 8h8M6 11h5" strokeLinecap="round" />
    </svg>
  ),
}

// ── Category color accents ──────────────────────────────────
const CategoryColor: Record<string, string> = {
  'Sumber Air':       '#3b82f6', // blue
  'Pengolahan Air':   '#10b981', // emerald
  'Mekanikal':        '#f59e0b', // amber
  'Valve & Kontrol':  '#8b5cf6', // violet
  'Instrumen':        '#06b6d4', // cyan
  'Distribusi':       '#ec4899', // pink
  'Display & Label':  '#6b7280', // gray
}

// ── Node catalog with categories ────────────────────────────
export interface NodeLibraryItem {
  type: string
  label: string
  abbr: string
  description: string
  defaultSize: { width: number; height: number }
}

export interface NodeCategory {
  name: string
  items: NodeLibraryItem[]
}

export const NODE_CATALOG: NodeCategory[] = [
  {
    name: 'Area / Grup',
    items: [
      { type: 'zone', abbr: 'ZN', label: 'Zona / Blok', description: 'Kotak grup (IPA, DMA) — status agregat dari isinya', defaultSize: { width: 340, height: 220 } },
    ],
  },
  {
    name: 'Sumber Air',
    items: [
      { type: 'intake',        abbr: 'IN', label: 'Intake',        description: 'Titik pengambilan air baku',           defaultSize: { width: 100, height: 100 } },
      { type: 'reservoir',     abbr: 'RE', label: 'Reservoir/Bak', description: 'Tangki penyimpanan',                   defaultSize: { width: 120, height: 80 } },
      { type: 'ground_tank',   abbr: 'GT', label: 'Ground Tank',   description: 'Tangki penampung bawah (ground level)',defaultSize: { width: 130, height: 90 } },
      { type: 'elevated_tank', abbr: 'ET', label: 'Elevated Tank', description: 'Menara air / tangki elevasi',          defaultSize: { width: 100, height: 120 } },
    ],
  },
  {
    name: 'Pengolahan Air',
    items: [
      { type: 'wtp',              abbr: 'WTP', label: 'WTP/IPA',              description: 'Unit pengolahan air',                       defaultSize: { width: 140, height: 100 } },
      { type: 'aerator',          abbr: 'AE',  label: 'Aerator',             description: 'Bak aerasi — pencampuran udara',            defaultSize: { width: 120, height: 90 } },
      { type: 'clarifier',        abbr: 'CL',  label: 'Clarifier',           description: 'Bak sedimentasi — pengendapan',             defaultSize: { width: 120, height: 100 } },
      { type: 'filter',           abbr: 'FI',  label: 'Filter',              description: 'Sand/carbon filter — penyaringan air',      defaultSize: { width: 100, height: 120 } },
      { type: 'chemical_dosing',  abbr: 'CD',  label: 'Chemical Dosing',     description: 'Unit injeksi bahan kimia (Cl₂, PAC, dll)',  defaultSize: { width: 100, height: 110 } },
      { type: 'sludge',           abbr: 'SL',  label: 'Sludge Handling',     description: 'Unit penanganan lumpur',                    defaultSize: { width: 110, height: 100 } },
    ],
  },
  {
    name: 'Mekanikal',
    items: [
      { type: 'pump',   abbr: 'PU', label: 'Pompa',   description: 'Unit pemompaan',                  defaultSize: { width: 100, height: 100 } },
      { type: 'motor',  abbr: 'MO', label: 'Motor',   description: 'Motor listrik / penggerak pompa', defaultSize: { width: 100, height: 100 } },
      { type: 'blower', abbr: 'BL', label: 'Blower',  description: 'Air blower untuk aerasi',         defaultSize: { width: 90, height: 90 } },
    ],
  },
  {
    name: 'Valve & Kontrol',
    items: [
      { type: 'valve',       abbr: 'VA', label: 'Katup/Valve',  description: 'Katup kontrol aliran',        defaultSize: { width: 90, height: 90 } },
      { type: 'check_valve', abbr: 'CV', label: 'Check Valve',  description: 'Katup satu arah (non-return)',defaultSize: { width: 90, height: 90 } },
      { type: 'prv',         abbr: 'PR', label: 'PRV',          description: 'Pressure Reducing Valve',     defaultSize: { width: 100, height: 100 } },
    ],
  },
  {
    name: 'Instrumen',
    items: [
      { type: 'sensor',         abbr: 'SE', label: 'Sensor',          description: 'Sensor monitoring (pilih kategori di konfigurasi)', defaultSize: { width: 80, height: 80 } },
      { type: 'flowmeter',      abbr: 'FL', label: 'Flow Meter',      description: 'Pengukur laju aliran',                              defaultSize: { width: 90, height: 90 } },
      { type: 'pressure',       abbr: 'PS', label: 'Pressure Sensor', description: 'Sensor tekanan',                                    defaultSize: { width: 90, height: 90 } },
      { type: 'meter',          abbr: 'ME', label: 'Water Meter',     description: 'Meter air pelanggan / zona DMA',                    defaultSize: { width: 100, height: 80 } },
      { type: 'heat_exchanger', abbr: 'HE', label: 'Heat Exchanger',  description: 'Unit penukar panas (HE)',                           defaultSize: { width: 100, height: 80 } },
    ],
  },
  {
    name: 'Distribusi',
    items: [
      { type: 'junction',     abbr: 'JU', label: 'Junction',   description: 'Titik percabangan pipa',              defaultSize: { width: 60, height: 60 } },
      { type: 'distribution', abbr: 'DI', label: 'Distribusi', description: 'Titik distribusi jaringan pipa',      defaultSize: { width: 80, height: 80 } },
    ],
  },
  {
    name: 'Display & Label',
    items: [
      { type: 'text_label',     abbr: 'TX', label: 'Text Label',     description: 'Teks/anotasi bebas di canvas',                  defaultSize: { width: 140, height: 36 } },
      { type: 'value_display',  abbr: 'VD', label: 'Value Display',  description: 'Tampilan nilai sensor kompak (label + value + unit)', defaultSize: { width: 130, height: 25 } },
    ],
  },
]

// -- Flatten for legacy compatibility
export const NODE_LIBRARY = NODE_CATALOG.flatMap((cat) => cat.items)

// ── NodeLibraryDrawer Component ─────────────────────────────

interface NodeLibraryDrawerProps {
  onAddNode: (type: string, label: string, size: { width: number; height: number }) => void
}

export function NodeLibraryDrawer({ onAddNode }: NodeLibraryDrawerProps) {
  const isOpen       = useUiStore((s) => s.isNodeLibraryOpen)
  const setOpen      = useUiStore((s) => s.setNodeLibraryOpen)
  const setActiveTool= useUiStore((s) => s.setActiveTool)

  const [search, setSearch]             = useState('')
  const [collapsed, setCollapsed]       = useState<Record<string, boolean>>({})
  const searchRef                       = useRef<HTMLInputElement>(null)

  // Focus search input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setCollapsed({})
      setTimeout(() => searchRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen])

  const close = useCallback(() => {
    setOpen(false)
    setActiveTool('select')
  }, [setOpen, setActiveTool])

  const toggleCategory = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return NODE_CATALOG

    return NODE_CATALOG.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          item.abbr.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0)
  }, [search])

  const totalResults = useMemo(
    () => filteredCatalog.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredCatalog]
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 node-library-backdrop"
        onClick={close}
      />

      {/* Drawer panel */}
      <div className="fixed left-0 top-0 bottom-0 w-[340px] z-50 flex flex-col node-library-drawer bg-[var(--surface-bg)] border-r border-surface-border shadow-2xl">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="10" cy="10" r="7" />
              <path d="M10 7v6M7 10h6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add Component</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              {totalResults} komponen tersedia
            </p>
          </div>
          <button
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Search ─────────────────────────────────────── */}
        <div className="px-3 py-2.5 border-b border-surface-border flex-shrink-0">
          <div className="relative">
            <svg viewBox="0 0 20 20" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="8.5" cy="8.5" r="5" />
              <path d="M12.5 12.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari komponen..."
              className="w-full pl-8 pr-8 py-2 rounded-lg text-sm bg-canvas border border-surface-border text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Category list ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 node-library-scroll">
          {filteredCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <svg viewBox="0 0 48 48" className="w-12 h-12 text-[var(--text-muted)] mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <circle cx="20" cy="20" r="14" />
                <path d="M30 30l12 12" strokeLinecap="round" strokeWidth={2} />
              </svg>
              <p className="text-sm text-[var(--text-muted)] text-center">
                Tidak ditemukan komponen untuk
              </p>
              <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">"{search}"</p>
            </div>
          ) : (
            filteredCatalog.map((cat) => {
              const isCollapsed = collapsed[cat.name] && !search
              const color = CategoryColor[cat.name] || '#6b7280'

              return (
                <div key={cat.name} className="mb-0.5">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-hover transition-colors group"
                  >
                    {/* Expand/collapse chevron */}
                    <svg
                      viewBox="0 0 16 16"
                      className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                      fill="currentColor"
                    >
                      <path d="M6 4l4 4-4 4z" />
                    </svg>

                    {/* Category icon */}
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ backgroundColor: color + '18', color }}
                    >
                      {CategoryIcon[cat.name] || CategoryIcon['Display & Label']}
                    </div>

                    {/* Name + count */}
                    <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex-1 text-left group-hover:text-[var(--text-primary)] transition-colors">
                      {cat.name}
                    </span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: color + '15', color }}
                    >
                      {cat.items.length}
                    </span>
                  </button>

                  {/* Items */}
                  {!isCollapsed && (
                    <div className="pb-1">
                      {cat.items.map((item) => (
                        <button
                          key={item.type}
                          onClick={() => {
                            onAddNode(item.type, item.label, item.defaultSize)
                            close()
                          }}
                          className="w-full flex items-center gap-3 px-3 pl-9 py-2 hover:bg-surface-hover text-left transition-colors group/item"
                        >
                          {/* Node SVG icon */}
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border p-1.5 transition-all group-hover/item:scale-110"
                            style={{
                              backgroundColor: color + '10',
                              borderColor: color + '30',
                              color,
                            }}
                          >
                            {getNodeIcon(item.type) || (
                              <span className="text-[10px] font-mono font-bold">
                                {item.abbr}
                              </span>
                            )}
                          </div>

                          {/* Label + description */}
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-[var(--text-primary)] leading-tight group-hover/item:text-accent transition-colors">
                              {highlightMatch(item.label, search)}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5 truncate">
                              {highlightMatch(item.description, search)}
                            </div>
                          </div>

                          {/* Add hint icon */}
                          <svg
                            viewBox="0 0 16 16"
                            className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <circle cx="8" cy="8" r="6" />
                            <path d="M8 5.5v5M5.5 8h5" strokeLinecap="round" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* ── Footer hint ────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-surface-border">
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            Klik komponen untuk menambahkan ke canvas · <kbd className="px-1 py-0.5 bg-canvas rounded text-[9px] border border-surface-border">Esc</kbd> untuk tutup
          </p>
        </div>
      </div>
    </>
  )
}

// ── Highlight matched text ──────────────────────────────────
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const q = query.trim()
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return text

  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent font-semibold">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  )
}
