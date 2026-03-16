import { useEffect } from 'react';
import { scadaApi } from '../../services/scada-api';
import { useDiagramStore } from '../../stores/use-diagram-store';
import { useRuntimeStore } from '../../stores/use-runtime-store';

export function useLoadScadaDiagram(diagramId: string) {
  const setInitialDiagram = useDiagramStore((state) => state.setInitialDiagram);
  const setError = useRuntimeStore((state) => state.setError);

  useEffect(() => {
    let cancelled = false;

    scadaApi
      .getDiagram(diagramId)
      .then((diagram) => {
        if (!cancelled) {
          setInitialDiagram(diagram);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [diagramId, setError, setInitialDiagram]);
}
