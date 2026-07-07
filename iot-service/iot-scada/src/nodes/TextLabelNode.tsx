// ============================================================
// TextLabelNode — Standalone text label for annotations
// Pure text node: no icon, no runtime binding, no handles in view
// Supports: font size, color, alignment, bold, bg on/off
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore } from '@/stores/useUiStore'

interface TextLabelData {
  label?: string
  [key: string]: unknown
}

interface TextStyleConfig {
  fontSize?: number
  fontColor?: string
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  bgColor?: string
  showBg?: boolean
  borderRadius?: number
  borderColor?: string
  showBorder?: boolean
  borderWidth?: number
  opacity?: number
}

// Stable fallbacks — zustand v5 selectors must not return fresh refs each render
const DEFAULT_TEXT_SIZE = { width: 140, height: 40 }
const EMPTY_TEXT_STYLE: TextStyleConfig = {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TextLabelNode({ id, data, selected }: NodeProps<any>) {
  const d = data as TextLabelData
  const label = (d.label as string) ?? 'Text'
  const mode = useUiStore((s) => s.mode)
  const isEditMode = mode === 'edit'

  const nodeSize = useDiagramStore((s) => s.nodes.find((nd) => nd.id === id)?.size) ?? DEFAULT_TEXT_SIZE

  const styleRaw = useDiagramStore((s) => s.nodes.find((nd) => nd.id === id)?.style)
  const styleConfig: TextStyleConfig = (styleRaw as TextStyleConfig | undefined) ?? EMPTY_TEXT_STYLE

  const fontSize = styleConfig.fontSize ?? 14
  const fontColor = styleConfig.fontColor ?? 'var(--text-primary)'
  const fontWeight = styleConfig.fontWeight ?? 'normal'
  const textAlign = styleConfig.textAlign ?? 'center'
  const showBg = styleConfig.showBg ?? false
  const bgColor = styleConfig.bgColor ?? 'var(--surface-bg)'
  const showBorder = styleConfig.showBorder ?? false
  const borderW = showBorder ? (styleConfig.borderWidth ?? 1) : 0
  const borderColor = styleConfig.borderColor ?? 'var(--surface-border)'
  const borderRadius = styleConfig.borderRadius ?? 4
  const opacity = styleConfig.opacity ?? 1

  // Inline edit
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) setEditValue(label)
  }, [label, editing])

  const commit = useCallback(() => {
    setEditing(false)
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== label) {
      useDiagramStore.getState().updateNode(id, { label: trimmed })
    } else {
      setEditValue(label)
    }
  }, [editValue, label, id])

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isEditMode) return
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setEditValue(label); setEditing(false) }
    e.stopPropagation()
  }

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation()
    useUiStore.getState().openNodeConfig(id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    useDiagramStore.getState().removeNode(id)
  }

  return (
    <>
      <div
        className={[
          'relative flex items-center justify-center overflow-hidden',
          isEditMode && selected ? 'shadow-node-selected' : '',
          isEditMode ? 'scada-node-edit' : 'scada-node-view',
        ].join(' ')}
        style={{
          width: nodeSize.width,
          height: nodeSize.height,
          backgroundColor: showBg ? bgColor : 'transparent',
          borderStyle: 'solid',
          borderWidth: borderW,
          borderColor: showBorder ? borderColor : 'transparent',
          borderRadius,
          opacity,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {editing ? (
          <textarea
            ref={inputRef}
            className="nodrag nopan bg-transparent border-none outline-none resize-none w-full h-full px-2 py-1"
            style={{ fontSize, color: fontColor, fontWeight, textAlign }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <div
            className="w-full h-full flex items-center px-2 py-1 whitespace-pre-wrap break-words"
            style={{
              fontSize,
              color: fontColor,
              fontWeight,
              textAlign,
              justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
              lineHeight: 1.3,
            }}
          >
            {label}
          </div>
        )}

        {/* Subtle dashed outline in edit mode when no bg/border */}
        {isEditMode && !showBg && !showBorder && (
          <div
            className="absolute inset-0 pointer-events-none rounded"
            style={{
              border: '1px dashed rgba(100,116,139,0.3)',
              borderRadius,
            }}
          />
        )}
      </div>

      {/* Handles — always available for connecting pipes */}
      <Handle type="source" position={Position.Top}    id="t" className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Left}   id="l" className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Bottom} id="b" className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Right}  id="r" className="scada-handle !z-[10]" />

      {/* Toolbar */}
      {isEditMode && selected && (
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1 bg-surface border border-surface-border rounded-lg px-1 py-0.5 shadow-panel nodrag nopan"
          style={{ zIndex: 20 }}
        >
          <button
            onClick={handleConfigure}
            className="p-1 rounded hover:bg-accent/20 text-[var(--text-secondary)] hover:text-accent transition-colors"
            title="Configure"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-status-alert transition-colors"
            title="Delete"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M5 3h6M4 5h8l-.7 8a1 1 0 01-1 .9H5.7a1 1 0 01-1-.9L4 5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
