// ============================================================
// ScadaCanvas — React Flow canvas wrapper
// Memegang konversi store nodes/edges ke React Flow format
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  ConnectionMode,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type NodePositionChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes } from '@/nodes/registry'
import { edgeTypes } from '@/edges/PipeEdge'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore } from '@/stores/useUiStore'
import type { ScadaNodeDto, ScadaEdgeDto } from '@/types/scada'

// ── Convert store node/edge to React Flow format ──────────────

function toFlowNode(n: ScadaNodeDto): Node {
  // Any type not registered in nodeTypes would fall back to React Flow's "default"
  // node (blank box + console warning). Route it to a real component instead —
  // the frame still draws the correct glyph from data.nodeType.
  const rfType = (n.type in nodeTypes) ? n.type : 'junction'
  return {
    id: n.id,
    type: rfType,
    position: n.position,
    data: {
      label:    n.label,
      nodeType: n.type,
      style:    n.style,
      config:   n.config,
      bindings: n.bindings,
    },
    // Pass size so React Flow can measure properly
    width:  n.size?.width  ?? 100,
    height: n.size?.height ?? 100,
    // Zone/group blocks render behind everything else
    zIndex: n.type === 'zone' ? -1 : (n.zIndex ?? 0),
    // A locked zone can't be dragged (prevents nudging the big background box)
    draggable: (n.type === 'zone' && (n.config as any)?.locked === true) ? false : undefined,
  }
}

function toFlowEdge(e: ScadaEdgeDto): Edge {
  return {
    id:           e.id,
    source:       e.source,
    target:       e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    type:         'pipe',
    data: {
      pipeType:      e.pipeType ?? 'raw',
      pathMode:      e.pathMode ?? 'smoothstep',
      flowDirection: e.flowDirection ?? 'forward',
      animated:      e.animated ?? false,
      strokeWidth:   e.strokeWidth ?? 2,
      label:         e.label ?? undefined,
      labelFontSize: e.labelFontSize ?? undefined,
      showBorder:    e.showBorder ?? true,
      borderWidth:   e.borderWidth ?? 2,
      lineCap:       e.lineCap ?? 'round',
      borderRadius:  e.borderRadius ?? 12,
    },
    animated: false, // handled via CSS in PipeEdge
  }
}

// ── ScadaCanvas inner (needs ReactFlow context) ───────────────

function CanvasInner() {
  const { fitView } = useReactFlow()

  const storeNodes   = useDiagramStore((s) => s.nodes)
  const storeEdges   = useDiagramStore((s) => s.edges)
  const setStoreNodes = useDiagramStore((s) => s.setNodes)
  const setStoreEdges = useDiagramStore((s) => s.setEdges)
  const addEdgeStore = useDiagramStore((s) => s.addEdge)

  const mode             = useUiStore((s) => s.mode)
  const fitViewTrigger   = useUiStore((s) => s.fitViewTrigger)
  const isPanLocked      = useUiStore((s) => s.isPanLocked)
  const setSelectedNodes = useUiStore((s) => s.setSelectedNodes)
  const setSelectedEdges = useUiStore((s) => s.setSelectedEdges)

  const removeNode = useDiagramStore((s) => s.removeNode)
  const removeEdge = useDiagramStore((s) => s.removeEdge)

  // ── Local React Flow state (includes measured dimensions etc.) ──
  const [rfNodes, setRfNodes] = useState<Node[]>(() => storeNodes.map(toFlowNode))
  const [rfEdges, setRfEdges] = useState<Edge[]>(() => storeEdges.map(toFlowEdge))

  // Track store version to detect external store changes
  const storeNodesRef = useRef(storeNodes)
  const storeEdgesRef = useRef(storeEdges)
  
  // Flag to skip sync during delete operation (prevents infinite loop)
  const isDeleting = useRef(false)

  // Sync store → local RF state when store changes (load, add, remove, save)
  useEffect(() => {
    // Skip sync if we just deleted (we already updated local state)
    if (isDeleting.current) {
      isDeleting.current = false
      storeNodesRef.current = storeNodes
      return
    }
    if (storeNodes !== storeNodesRef.current) {
      storeNodesRef.current = storeNodes
      setRfNodes(storeNodes.map(toFlowNode))
    }
  }, [storeNodes])

  useEffect(() => {
    // Skip sync if we just deleted (we already updated local state)  
    if (isDeleting.current) {
      storeEdgesRef.current = storeEdges
      return
    }
    if (storeEdges !== storeEdgesRef.current) {
      storeEdgesRef.current = storeEdges
      setRfEdges(storeEdges.map(toFlowEdge))
    }
  }, [storeEdges])

  // Handle ALL node changes locally (so React Flow can track dimensions).
  // Only sync position-drag-end back to Zustand store.
  // NOTE: Removes are handled by onDelete callback, not here
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Filter out remove changes — they are handled by onDelete callback
    // This prevents double state updates that cause infinite loops
    let nonRemoveChanges = changes.filter((c) => c.type !== 'remove')

    // ── Move-together: dragging a ZONE drags the nodes inside it ──
    // Uses the store snapshot (drag-start positions, since the store only updates on
    // drag end) as a stable reference, so the child set + delta stay consistent per frame
    // and the zone never "grabs" bystanders it merely passes over.
    const snapshot = useDiagramStore.getState().nodes
    // ids already carrying their own position change — don't double-move them
    const alreadyMoving = new Set(
      nonRemoveChanges.filter((c) => c.type === 'position').map((c) => (c as NodePositionChange).id),
    )
    const childMoves: NodePositionChange[] = []
    for (const c of nonRemoveChanges) {
      if (c.type !== 'position' || !('position' in c) || !c.position) continue
      const zone = snapshot.find((n) => n.id === c.id && n.type === 'zone')
      if (!zone) continue
      const dx = c.position.x - zone.position.x
      const dy = c.position.y - zone.position.y
      if (dx === 0 && dy === 0) continue
      const zx = zone.position.x, zy = zone.position.y
      const zw = zone.size?.width ?? 0, zh = zone.size?.height ?? 0
      for (const n of snapshot) {
        if (n.id === zone.id || n.type === 'zone' || alreadyMoving.has(n.id)) continue
        const cx = n.position.x + (n.size?.width ?? 0) / 2
        const cy = n.position.y + (n.size?.height ?? 0) / 2
        if (cx >= zx && cx <= zx + zw && cy >= zy && cy <= zy + zh) {
          childMoves.push({
            id: n.id, type: 'position',
            position: { x: n.position.x + dx, y: n.position.y + dy },
            dragging: (c as any).dragging,
          } as NodePositionChange)
        }
      }
    }
    if (childMoves.length > 0) nonRemoveChanges = [...nonRemoveChanges, ...childMoves]

    if (nonRemoveChanges.length > 0) {
      // Apply non-remove changes to local RF state (dimensions, select, position, etc.)
      setRfNodes((nds) => applyNodeChanges(nonRemoveChanges, nds))
    }

    // Sync position to store when drag ENDS (dragging becomes false)
    const positionDone = nonRemoveChanges.filter(
      (c): c is NodeChange & { type: 'position'; position: { x: number; y: number } } =>
        c.type === 'position' && 'dragging' in c && !c.dragging && 'position' in c && c.position != null,
    )
    if (positionDone.length > 0) {
      const current = useDiagramStore.getState().nodes
      const updated = current.map((n) => {
        const change = positionDone.find((c) => c.id === n.id)
        if (!change) return n
        return { ...n, position: change.position }
      })
      setStoreNodes(updated)
    }
  }, [setStoreNodes])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Filter out remove changes — they are handled by onDelete callback
    const nonRemoveChanges = changes.filter((c) => c.type !== 'remove')
    if (nonRemoveChanges.length > 0) {
      setRfEdges((eds) => applyEdgeChanges(nonRemoveChanges, eds))
    }
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    if (mode !== 'edit') return
    // Don't allow self-connections
    if (connection.source === connection.target) return
    // Check for duplicate edges
    const exists = storeEdges.some(
      (e) => e.source === connection.source && e.target === connection.target,
    )
    if (exists) return

    // A link touching a sensor/readout node is a signal link (data), not a process pipe
    const SIGNAL_ENDPOINT_TYPES = new Set([
      'value_display', 'sensor', 'pressure', 'flowmeter', 'meter', 'level_sensor',
      'ph_sensor', 'turbidity_sensor', 'chlorine_sensor', 'temperature_sensor',
      'conductivity_sensor', 'do_sensor',
    ])
    const nodesNow = useDiagramStore.getState().nodes
    const srcType = nodesNow.find((n) => n.id === connection.source)?.type
    const tgtType = nodesNow.find((n) => n.id === connection.target)?.type
    const isSignalLink = SIGNAL_ENDPOINT_TYPES.has(srcType ?? '') || SIGNAL_ENDPOINT_TYPES.has(tgtType ?? '')

    const edgeId = crypto.randomUUID()
    addEdgeStore({
      id:            edgeId,
      source:        connection.source!,
      target:        connection.target!,
      sourceHandle:  connection.sourceHandle ?? undefined,
      targetHandle:  connection.targetHandle ?? undefined,
      edgeType:      'pipe',
      pipeType:      isSignalLink ? 'signal' : 'raw',
      pathMode:      'smoothstep',
      flowDirection: isSignalLink ? 'none' : 'forward',
      animated:      false,
      strokeWidth:   2,
      style:         {},
      config:        {},
    })
  }, [mode, storeEdges, addEdgeStore])

  // Explicit delete handler — most reliable path for deletion
  const onDelete = useCallback(({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[], edges: Edge[] }) => {
    // Set flag to skip store→local sync (we'll update local state directly)
    isDeleting.current = true
    
    // Update local RF state directly (immediate visual feedback)
    const deletedNodeIds = new Set(deletedNodes.map((n) => n.id))
    const deletedEdgeIds = new Set(deletedEdges.map((e) => e.id))
    
    setRfNodes((nodes) => nodes.filter((n) => !deletedNodeIds.has(n.id)))
    setRfEdges((edges) => edges.filter((e) => 
      !deletedEdgeIds.has(e.id) && 
      !deletedNodeIds.has(e.source) && 
      !deletedNodeIds.has(e.target)
    ))
    
    // Update store (source of truth for persistence)
    deletedEdges.forEach((e) => removeEdge(e.id))
    deletedNodes.forEach((n) => removeNode(n.id))
  }, [removeNode, removeEdge])

  // Selection
  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: Node[], edges: Edge[] }) => {
    setSelectedNodes(nodes.map((n) => n.id))
    setSelectedEdges(edges.map((e) => e.id))
  }, [setSelectedNodes, setSelectedEdges])

  // FitView trigger
  useEffect(() => {
    if (fitViewTrigger > 0) {
      fitView({ duration: 400 })
    }
  }, [fitViewTrigger, fitView])

  const isEditMode = mode === 'edit'

  // Double-click edge → open edge config drawer
  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (isEditMode) {
      useUiStore.getState().openEdgeConfig(edge.id)
    }
  }, [isEditMode])

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes as any}
      edgeTypes={edgeTypes as any}
      onNodesChange={isEditMode ? onNodesChange : undefined}
      onEdgesChange={isEditMode ? onEdgesChange : undefined}
      onConnect={isEditMode ? onConnect : undefined}
      onDelete={isEditMode ? onDelete : undefined}
      onSelectionChange={onSelectionChange}
      onEdgeDoubleClick={onEdgeDoubleClick}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={isEditMode ? ['Backspace', 'Delete'] : null}
      nodesDraggable={isEditMode}
      nodesConnectable={isEditMode}
      panOnDrag={!isPanLocked}
      zoomOnScroll={!isPanLocked}
      zoomOnPinch={!isPanLocked}
      zoomOnDoubleClick={false}
      elementsSelectable={true}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#30363d"
        style={{ backgroundColor: '#0d1117' }}
      />
    </ReactFlow>
  )
}

// ── Exported wrapper ──────────────────────────────────────────

export function ScadaCanvas() {
  return (
    <div className="flex-1 relative w-full h-full">
      <CanvasInner />
    </div>
  )
}
