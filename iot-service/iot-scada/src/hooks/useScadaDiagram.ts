// ============================================================
// useScadaDiagram — Load & Save diagram via generated SDK
// ============================================================

import { useCallback, useEffect } from 'react'
import {
  scadaDiagramsControllerFindOne,
  scadaDiagramsControllerUpdate,
} from '@/sdk/services.gen'
import type { UpdateScadaDiagramDto } from '@/sdk/models'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import { toast } from '@/components/Toast'
import type { ScadaDiagramMeta, ScadaNodeDto, ScadaEdgeDto } from '@/types/scada'

// Normalize Go backend field names to frontend model
function normalizeMeta(d: any): ScadaDiagramMeta {
  return {
    id: d.id ?? d.idScadaDiagram,
    ownerId: d.ownerId ?? d.idOwner,
    projectId: d.projectId ?? d.idProject ?? null,
    name: d.name,
    description: d.description ?? null,
    diagramCode: d.diagramCode ?? null,
    status: d.status ?? 'draft',
    canvasConfig: d.canvasConfig ?? {},
    runtimeConfig: d.runtimeConfig ?? {},
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

function normalizeNode(n: any): ScadaNodeDto {
  return {
    id: n.id ?? n.idScadaNode,
    type: n.type,
    label: n.label ?? '',
    position: n.position ?? { x: 0, y: 0 },
    size: n.size ?? { width: 120, height: 80 },
    rotationDeg: n.rotationDeg ?? null,
    zIndex: n.zIndex ?? 0,
    relatedNodeId: n.relatedNodeId ?? null,
    relatedSensorId: n.relatedSensorId ?? null,
    style: n.style ?? {},
    config: n.config ?? {},
    bindings: (n.bindings ?? []).map((b: any) => {
      // chart display config is persisted inside transform (jsonb) — unfold it
      const t = b.transform ?? {}
      return {
        ...b,
        id: b.id ?? b.idScadaBinding,
        sensorChannelId: b.sensorChannelId ?? b.idSensorChannel,
        chartType: b.chartType ?? t.chartType ?? undefined,
        gaugeMin: b.gaugeMin ?? t.gaugeMin ?? null,
        gaugeMax: b.gaugeMax ?? t.gaugeMax ?? null,
        chartTransparent: b.chartTransparent ?? t.chartTransparent ?? undefined,
        dialShowLabel: b.dialShowLabel ?? t.dialShowLabel ?? undefined,
      }
    }),
  }
}

function normalizeEdge(e: any): ScadaEdgeDto {
  return {
    id: e.id ?? e.idScadaEdge,
    source: e.source ?? e.sourceNodeId,
    target: e.target ?? e.targetNodeId,
    sourceHandle: e.sourceHandle ?? e.config?.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? e.config?.targetHandle ?? undefined,
    edgeType: e.edgeType,
    label: e.label ?? null,
    pipeType: e.pipeType ?? null,
    pathMode: e.pathMode ?? e.config?.pathMode ?? null,
    flowDirection: e.flowDirection ?? null,
    animated: e.animated ?? false,
    strokeWidth: e.strokeWidth ?? e.config?.strokeWidth ?? null,
    labelFontSize: e.labelFontSize ?? e.config?.labelFontSize ?? null,
    showBorder: e.showBorder ?? e.config?.showBorder ?? undefined,
    borderWidth: e.borderWidth ?? e.config?.borderWidth ?? null,
    lineCap: e.lineCap ?? e.config?.lineCap ?? null,
    borderRadius: e.borderRadius ?? e.config?.borderRadius ?? null,
    style: e.style ?? {},
    config: e.config ?? {},
  }
}

export function useScadaDiagram(diagramId: string | undefined) {
  const {
    meta,
    nodes,
    edges,
    isDirty,
    isLoading,
    isSaving,
    saveError,
    loadError,
    loadDiagram,
    setLoading,
    setLoadError,
    setSaving,
    setSaveError,
    commitSave,
  } = useDiagramStore()

  const clearRuntime = useRuntimeStore((s) => s.clearRuntime)

  // Load diagram on mount / diagramId change
  useEffect(() => {
    if (!diagramId) return

    let cancelled = false
    setLoading(true)
    clearRuntime()

    scadaDiagramsControllerFindOne(diagramId)
      .then((res) => {
        if (cancelled) return
        if (!res.data) throw new Error('Empty response')
        // Handle Go backend wrapping response in { data: { diagram, nodes, edges } }
        const payload = (res.data as any).diagram ? res.data : (res.data as any).data ?? res.data
        if (!payload || !payload.diagram) throw new Error('Invalid diagram response')
        const { diagram, nodes, edges } = payload
        loadDiagram(
          normalizeMeta(diagram),
          (nodes ?? []).map(normalizeNode),
          (edges ?? []).map(normalizeEdge),
        )
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load diagram'
          setLoadError(msg)
        }
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId])

  // Save handler
  const save = useCallback(async () => {
    if (!diagramId || !meta || isSaving) return

    setSaving(true)
    setSaveError(null)

    const payload: UpdateScadaDiagramDto = {
      diagram: {
        name: meta.name,
        description: (meta.description ?? undefined) as UpdateScadaDiagramDto['diagram']['description'],
        projectId: meta.projectId as UpdateScadaDiagramDto['diagram']['projectId'],
        diagramCode: meta.diagramCode as UpdateScadaDiagramDto['diagram']['diagramCode'],
        status: meta.status,
        canvasConfig: (meta.canvasConfig ?? {}) as UpdateScadaDiagramDto['diagram']['canvasConfig'],
        runtimeConfig: (meta.runtimeConfig ?? {}) as UpdateScadaDiagramDto['diagram']['runtimeConfig'],
      },
      nodes: nodes.map((nd: any) => ({
        ...nd,
        // fold chart display config into transform (jsonb) so it persists
        // without a backend schema change (chartType/gaugeMin/gaugeMax have no columns)
        bindings: (nd.bindings ?? []).map((b: any) => {
          const { chartType, gaugeMin, gaugeMax, chartTransparent, dialShowLabel, ...restB } = b
          return {
            ...restB,
            transform: {
              ...(b.transform ?? {}),
              ...(chartType ? { chartType } : {}),
              ...(gaugeMin != null ? { gaugeMin } : {}),
              ...(gaugeMax != null ? { gaugeMax } : {}),
              ...(chartTransparent ? { chartTransparent: true } : {}),
              ...(dialShowLabel ? { dialShowLabel: true } : {}),
            },
          }
        }),
      })) as unknown as UpdateScadaDiagramDto['nodes'],
      edges: edges.map(({ sourceHandle, targetHandle, pathMode, strokeWidth, labelFontSize, showBorder, borderWidth, lineCap, borderRadius, ...rest }: any) => ({
        ...rest,
        config: {
          ...(rest.config ?? {}),
          ...(sourceHandle  ? { sourceHandle }  : {}),
          ...(targetHandle  ? { targetHandle }  : {}),
          ...(pathMode       ? { pathMode }      : {}),
          ...(strokeWidth   != null ? { strokeWidth }   : {}),
          ...(labelFontSize != null ? { labelFontSize } : {}),
          ...(showBorder    != null ? { showBorder }    : {}),
          ...(borderWidth   != null ? { borderWidth }   : {}),
          ...(lineCap                ? { lineCap }       : {}),
          ...(borderRadius  != null ? { borderRadius }  : {}),
        },
      })) as unknown as UpdateScadaDiagramDto['edges'],
    }

    try {
      const res = await scadaDiagramsControllerUpdate(diagramId, payload)
      if (!res.data) throw new Error('Empty save response')
      const savePayload = (res.data as any).diagram ? res.data : (res.data as any).data ?? res.data
      const { diagram, nodes: n, edges: e } = savePayload
      commitSave(
        normalizeMeta(diagram),
        (n ?? []).map(normalizeNode),
        (e ?? []).map(normalizeEdge),
      )
      toast.success('Diagram berhasil disimpan')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setSaveError(msg)
      setSaving(false)
      toast.error(`Gagal menyimpan: ${msg}`)
    }
  }, [diagramId, meta, nodes, edges, isSaving, setSaving, setSaveError, commitSave])

  return {
    meta,
    nodes,
    edges,
    isDirty,
    isLoading,
    isSaving,
    saveError,
    loadError,
    save,
  }
}
