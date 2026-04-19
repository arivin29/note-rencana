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
  return {
    id: n.id,
    type: n.type,
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
    zIndex: n.zIndex ?? 0,
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
    const nonRemoveChanges = changes.filter((c) => c.type !== 'remove')
    
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

    const edgeId = crypto.randomUUID()
    addEdgeStore({
      id:            edgeId,
      source:        connection.source!,
      target:        connection.target!,
      sourceHandle:  connection.sourceHandle ?? undefined,
      targetHandle:  connection.targetHandle ?? undefined,
      edgeType:      'pipe',
      pipeType:      'raw',
      pathMode:      'smoothstep',
      flowDirection: 'forward',
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
