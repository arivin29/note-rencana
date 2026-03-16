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

    scadaDiagramsControllerFindOne({ path: { diagramId } })
      .then((res) => {
        if (cancelled) return
        if (!res.data) throw new Error('Empty response')
        const { diagram, nodes, edges } = res.data
        loadDiagram(
          diagram as unknown as ScadaDiagramMeta,
          (nodes ?? []) as unknown as ScadaNodeDto[],
          (edges ?? []) as unknown as ScadaEdgeDto[],
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
      edges: edges as unknown as UpdateScadaDiagramDto['edges'],
    }

    try {
      const res = await scadaDiagramsControllerUpdate({
        path: { diagramId },
        body: payload,
      })
      if (!res.data) throw new Error('Empty save response')
      const { diagram, nodes: n, edges: e } = res.data
      commitSave(
        diagram as unknown as ScadaDiagramMeta,
        (n ?? []) as unknown as ScadaNodeDto[],
        (e ?? []) as unknown as ScadaEdgeDto[],
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setSaveError(msg)
      setSaving(false)
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
