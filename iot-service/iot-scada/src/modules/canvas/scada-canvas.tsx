import {
  ConnectionLineType,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import type { ScadaDiagramDetail, ScadaMode } from '../../types/scada';

interface ScadaCanvasProps {
  diagram: ScadaDiagramDetail | null;
  mode: ScadaMode;
  onNodesChange?: OnNodesChange<Node>;
  onEdgesChange?: OnEdgesChange<Edge>;
  onConnect?: (connection: Connection) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
}

export function ScadaCanvas({
  diagram,
  mode,
  onNodesChange,
  onConnect,
  onNodeSelect,
  onEdgeSelect,
}: ScadaCanvasProps) {
  const nodes = useMemo<Node[]>(() => {
    return (diagram?.nodes ?? []).map((node) => ({
      id: node.id,
      type: 'default',
      position: node.position,
      draggable: mode === 'edit',
      data: {
        label: (
          <div className="scada-node-card">
            <div className="scada-node-title">{node.label}</div>
            <div className="scada-node-type">{node.type}</div>
          </div>
        ),
      },
      style: {
        width: node.size.width,
        height: node.size.height,
      },
    }));
  }, [diagram, mode]);

  const edges = useMemo<Edge[]>(() => {
    return (diagram?.edges ?? []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.animated,
      label: edge.label ?? undefined,
      style: {
        strokeWidth: 3,
      },
    }));
  }, [diagram]);

  return (
    <div className="scada-canvas">
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        nodesDraggable={mode === 'edit'}
        nodesConnectable={mode === 'edit'}
        elementsSelectable
        connectionLineType={ConnectionLineType.SmoothStep}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => onNodeSelect?.(node.id)}
        onPaneClick={() => {
          onNodeSelect?.(null);
          onEdgeSelect?.(null);
        }}
        onEdgeClick={(_, edge) => onEdgeSelect?.(edge.id)}
      >
        <Background color="rgba(144, 180, 154, 0.18)" gap={24} />
        <MiniMap pannable zoomable />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
