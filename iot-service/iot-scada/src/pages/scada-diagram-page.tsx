import { applyNodeChanges, type Connection, type Node, type NodeChange } from '@xyflow/react';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ScadaCanvas } from '../modules/canvas/scada-canvas';
import { useLoadScadaDiagram } from '../modules/diagram/use-load-scada-diagram';
import { PropertiesPanel } from '../modules/properties/properties-panel';
import { useRuntimePolling } from '../modules/runtime/use-runtime-polling';
import { ScadaShell } from '../modules/scada-shell/scada-shell';
import { ToolRail } from '../modules/toolbar/tool-rail';
import { scadaApi } from '../services/scada-api';
import { useDiagramStore } from '../stores/use-diagram-store';
import { useRuntimeStore } from '../stores/use-runtime-store';
import { useUiStore } from '../stores/use-ui-store';
import type { ScadaMode } from '../types/scada';

export function ScadaDiagramPage() {
  const params = useParams();
  const diagramId = params.diagramId ?? '';
  const mode = useMemo(() => (params.mode === 'edit' ? 'edit' : params.mode === 'view' ? 'view' : null), [params.mode]);
  const working = useDiagramStore((state) => state.working);
  const dirty = useDiagramStore((state) => state.dirty);
  const addNode = useDiagramStore((state) => state.addNode);
  const addEdge = useDiagramStore((state) => state.addEdge);
  const removeNode = useDiagramStore((state) => state.removeNode);
  const removeEdge = useDiagramStore((state) => state.removeEdge);
  const replaceWorkingDiagram = useDiagramStore((state) => state.replaceWorkingDiagram);
  const resetWorkingCopy = useDiagramStore((state) => state.resetWorkingCopy);
  const commitSavedDiagram = useDiagramStore((state) => state.commitSavedDiagram);
  const error = useRuntimeStore((state) => state.error);
  const setError = useRuntimeStore((state) => state.setError);
  const selectedNodeId = useUiStore((state) => state.selectedNodeId);
  const selectedEdgeId = useUiStore((state) => state.selectedEdgeId);
  const setSelectedNodeId = useUiStore((state) => state.setSelectedNodeId);
  const setSelectedEdgeId = useUiStore((state) => state.setSelectedEdgeId);
  const [saving, setSaving] = useState(false);

  if (!mode) {
    return <Navigate to={`/scada/diagrams/${diagramId || 'demo'}/view`} replace />;
  }

  useLoadScadaDiagram(diagramId);
  useRuntimePolling(diagramId);

  const handleNodesChange = (changes: NodeChange<Node>[]) => {
    if (!working || mode !== 'edit') {
      return;
    }

    const nextFlowNodes = applyNodeChanges(
      changes,
      working.nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: {},
      })) as Node[],
    );

    replaceWorkingDiagram({
      ...working,
      nodes: working.nodes.map((node) => {
        const nextNode = nextFlowNodes.find((item) => item.id === node.id);
        return nextNode ? { ...node, position: nextNode.position } : node;
      }),
    });
  };

  const handleConnect = (connection: Connection) => {
    if (mode !== 'edit' || !connection.source || !connection.target) {
      return;
    }

    addEdge(connection.source, connection.target);
  };

  const handleDeleteSelection = () => {
    if (selectedNodeId) {
      removeNode(selectedNodeId);
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      removeEdge(selectedEdgeId);
      setSelectedEdgeId(null);
    }
  };

  const handleSave = async () => {
    if (!working || !dirty || saving) {
      return;
    }

    try {
      setSaving(true);
      const saved = await scadaApi.saveDiagram(diagramId, working);
      commitSavedDiagram(saved);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScadaShell
      mode={mode as ScadaMode}
      diagramId={diagramId}
      onSave={handleSave}
      onReset={resetWorkingCopy}
    >
      <ToolRail mode={mode as ScadaMode} onAddNode={addNode} onDeleteSelection={handleDeleteSelection} />
      <main className="scada-stage">
        {error ? <div className="floating-banner">{error}</div> : null}
        {saving ? <div className="floating-banner floating-banner-secondary">Saving...</div> : null}
        <ScadaCanvas
          diagram={working}
          mode={mode as ScadaMode}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onNodeSelect={setSelectedNodeId}
          onEdgeSelect={setSelectedEdgeId}
        />
      </main>
      <PropertiesPanel mode={mode as ScadaMode} />
    </ScadaShell>
  );
}
