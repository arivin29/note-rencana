import type { ScadaDiagramDetail, ScadaRuntimeSnapshot } from '../types/scada';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const scadaApi = {
  getDiagram(diagramId: string) {
    return requestJson<ScadaDiagramDetail>(`/scada/diagrams/${diagramId}`);
  },
  getRuntime(diagramId: string) {
    return requestJson<ScadaRuntimeSnapshot>(`/scada/diagrams/${diagramId}/runtime`);
  },
  saveDiagram(diagramId: string, diagram: ScadaDiagramDetail) {
    return requestJson<ScadaDiagramDetail>(`/scada/diagrams/${diagramId}`, {
      method: 'PUT',
      body: JSON.stringify({
        diagram: {
          name: diagram.diagram.name,
          description: diagram.diagram.description ?? null,
          projectId: diagram.diagram.projectId ?? null,
          diagramCode: diagram.diagram.diagramCode ?? null,
          status: diagram.diagram.status,
          canvasConfig: diagram.diagram.canvasConfig,
          runtimeConfig: diagram.diagram.runtimeConfig,
        },
        nodes: diagram.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          label: node.label,
          position: node.position,
          size: node.size,
          rotationDeg: node.rotationDeg ?? 0,
          zIndex: node.zIndex ?? 0,
          relatedNodeId: node.relatedNodeId ?? null,
          relatedSensorId: node.relatedSensorId ?? null,
          style: node.style ?? {},
          config: node.config ?? {},
          bindings: node.bindings,
        })),
        edges: diagram.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          edgeType: edge.edgeType ?? 'pipe',
          label: edge.label ?? null,
          pipeType: edge.pipeType ?? null,
          flowDirection: edge.flowDirection ?? null,
          animated: edge.animated ?? false,
          style: edge.style ?? {},
          config: edge.config ?? {},
        })),
      }),
    });
  },
};
