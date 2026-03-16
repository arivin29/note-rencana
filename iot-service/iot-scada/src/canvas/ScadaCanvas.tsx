// ============================================================
// ScadaCanvas — React Flow canvas wrapper
// Memegang konversi store nodes/edges ke React Flow format
// ============================================================

import React, { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
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
    width:  n.size?.width  ?? 100,
    height: n.size?.height ?? 100,
    zIndex: n.zIndex ?? 0,
  }
}

function toFlowEdge(e: ScadaEdgeDto): Edge {
  return {
    id:     e.id,
    source: e.source,
    target: e.target,
    type:   'pipe',
    data: {
      pipeType:      e.pipeType ?? 'raw',
      flowDirection: e.flowDirection ?? 'forward',
      animated:      e.animated ?? false,
      label:         e.label ?? undefined,
    },
    animated: false, // handled via CSS in PipeEdge
  }
}

// ── ScadaCanvas inner (needs ReactFlow context) ───────────────

function CanvasInner() {
  const { fitView } = useReactFlow()

  const storeNodes   = useDiagramStore((s) => s.nodes)
  const storeEdges   = useDiagramStore((s) => s.edges)
  const setNodes     = useDiagramStore((s) => s.setNodes)
  const setEdges     = useDiagramStore((s) => s.setEdges)
  const addEdgeStore = useDiagramStore((s) => s.addEdge)

  const mode             = useUiStore((s) => s.mode)
  const fitViewTrigger   = useUiStore((s) => s.fitViewTrigger)
  const setSelectedNodes = useUiStore((s) => s.setSelectedNodes)
  const setSelectedEdges = useUiStore((s) => s.setSelectedEdges)

  const flowNodes = useMemo(() => storeNodes.map(toFlowNode), [storeNodes])
  const flowEdges = useMemo(() => storeEdges.map(toFlowEdge), [storeEdges])

  // Sync position changes from drag back to store
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const updated = applyNodeChanges(changes, flowNodes)
    setNodes(
      storeNodes.map((n) => {
        const fn = updated.find((f) => f.id === n.id)
        if (!fn) return n
        return {
          ...n,
          position: fn.position,
        }
      }),
    )
  }, [flowNodes, storeNodes, setNodes])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const updated = applyEdgeChanges(changes, flowEdges)
    setEdges(
      updated.map((fe) => {
        const orig = storeEdges.find((e) => e.id === fe.id)
        return orig ?? {
          id:     fe.id,
          source: fe.source,
          target: fe.target,
        }
      }) as ScadaEdgeDto[]
    )
  }, [flowEdges, storeEdges, setEdges])

  const onConnect = useCallback((connection: Connection) => {
    if (mode !== 'edit') return
    const newFlowEdges = addEdge(connection, flowEdges)
    const newEdge = newFlowEdges.find(
      (e) => e.source === connection.source && e.target === connection.target &&
             !flowEdges.some((ex) => ex.id === e.id),
    )
    if (newEdge) {
      addEdgeStore({
        id:            newEdge.id,
        source:        newEdge.source,
        target:        newEdge.target,
        edgeType:      'pipe',
        pipeType:      'raw',
        flowDirection: 'forward',
        animated:      false,
        style:         {},
        config:        {},
      })
    }
  }, [mode, flowEdges, addEdgeStore])

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

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={isEditMode ? onNodesChange : undefined}
      onEdgesChange={isEditMode ? onEdgesChange : undefined}
      onConnect={isEditMode ? onConnect : undefined}
      onSelectionChange={onSelectionChange}
      nodesDraggable={isEditMode}
      nodesConnectable={isEditMode}
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
      <Controls
        position="bottom-right"
        showInteractive={false}
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
