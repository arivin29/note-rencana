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
        const { diagram, nodes, edges } = res.data
        // Restore sourceHandle/targetHandle from config
        const restoredEdges = (edges ?? []).map((e: any) => ({
          ...e,
          sourceHandle:  e.sourceHandle  ?? e.config?.sourceHandle  ?? undefined,
          targetHandle:  e.targetHandle  ?? e.config?.targetHandle  ?? undefined,
          pathMode:      e.pathMode      ?? e.config?.pathMode      ?? undefined,
          strokeWidth:   e.strokeWidth   ?? e.config?.strokeWidth   ?? undefined,
          labelFontSize: e.labelFontSize ?? e.config?.labelFontSize ?? undefined,
          showBorder:    e.showBorder    ?? e.config?.showBorder    ?? undefined,
          borderWidth:   e.borderWidth   ?? e.config?.borderWidth   ?? undefined,
          lineCap:       e.lineCap       ?? e.config?.lineCap       ?? undefined,
          borderRadius:  e.borderRadius  ?? e.config?.borderRadius  ?? undefined,
        }))
        loadDiagram(
          diagram as unknown as ScadaDiagramMeta,
          (nodes ?? []) as unknown as ScadaNodeDto[],
          restoredEdges as unknown as ScadaEdgeDto[],
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
        description: meta.description ?? undefined,
        projectId: meta.projectId ?? undefined,
        diagramCode: meta.diagramCode ?? undefined,
        status: meta.status,
        canvasConfig: meta.canvasConfig ?? {},
        runtimeConfig: meta.runtimeConfig ?? {},
      },
      nodes: nodes as unknown as UpdateScadaDiagramDto['nodes'],
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
      const { diagram, nodes: n, edges: e } = res.data
      // Restore frontend-only fields from config
      const restoredSaveEdges = (e ?? []).map((ed: any) => ({
        ...ed,
        sourceHandle:  ed.sourceHandle  ?? ed.config?.sourceHandle  ?? undefined,
        targetHandle:  ed.targetHandle  ?? ed.config?.targetHandle  ?? undefined,
        pathMode:      ed.pathMode      ?? ed.config?.pathMode      ?? undefined,
        strokeWidth:   ed.strokeWidth   ?? ed.config?.strokeWidth   ?? undefined,
        labelFontSize: ed.labelFontSize ?? ed.config?.labelFontSize ?? undefined,
        showBorder:    ed.showBorder    ?? ed.config?.showBorder    ?? undefined,
        borderWidth:   ed.borderWidth   ?? ed.config?.borderWidth   ?? undefined,
        lineCap:       ed.lineCap       ?? ed.config?.lineCap       ?? undefined,
        borderRadius:  ed.borderRadius  ?? ed.config?.borderRadius  ?? undefined,
      }))
      commitSave(
        diagram as unknown as ScadaDiagramMeta,
        (n ?? []) as unknown as ScadaNodeDto[],
        restoredSaveEdges as unknown as ScadaEdgeDto[],
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
