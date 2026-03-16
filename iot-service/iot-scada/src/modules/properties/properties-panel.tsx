import { useDiagramStore } from '../../stores/use-diagram-store';
import { useRuntimeStore } from '../../stores/use-runtime-store';
import { useUiStore } from '../../stores/use-ui-store';
import type { ScadaMode } from '../../types/scada';

interface PropertiesPanelProps {
  mode: ScadaMode;
}

export function PropertiesPanel({ mode }: PropertiesPanelProps) {
  const working = useDiagramStore((state) => state.working);
  const runtime = useRuntimeStore((state) => state.snapshot);
  const selectedNodeId = useUiStore((state) => state.selectedNodeId);
  const selectedEdgeId = useUiStore((state) => state.selectedEdgeId);
  const selectedNode = working?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = working?.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  return (
    <aside className="properties-panel">
      <div className="panel-section">
        <div className="panel-title">Diagram</div>
        <div className="panel-value">{working?.diagram.description ?? 'No description yet'}</div>
      </div>
      <div className="panel-section">
        <div className="panel-title">Mode</div>
        <div className="panel-value">{mode === 'edit' ? 'Editor tools active' : 'Viewer mode active'}</div>
      </div>
      <div className="panel-section">
        <div className="panel-title">Selection</div>
        <div className="panel-value">
          {selectedNode
            ? `Node: ${selectedNode.label}`
            : selectedEdge
              ? `Edge: ${selectedEdge.label ?? selectedEdge.id}`
              : 'Nothing selected'}
        </div>
      </div>
      <div className="panel-section">
        <div className="panel-title">Runtime summary</div>
        <div className="panel-value">Stale bindings: {runtime?.summary.staleBindings ?? 0}</div>
      </div>
    </aside>
  );
}
