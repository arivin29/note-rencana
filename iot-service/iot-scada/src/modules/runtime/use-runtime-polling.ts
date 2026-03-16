import { useEffect } from 'react';
import { scadaApi } from '../../services/scada-api';
import { useRuntimeStore } from '../../stores/use-runtime-store';

const DEFAULT_INTERVAL_MS = 5000;

export function useRuntimePolling(diagramId: string) {
  const setSnapshot = useRuntimeStore((state) => state.setSnapshot);
  const setPolling = useRuntimeStore((state) => state.setPolling);
  const setError = useRuntimeStore((state) => state.setError);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        setPolling(true);
        const snapshot = await scadaApi.getRuntime(diagramId);
        if (active) {
          setSnapshot(snapshot);
        }
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : 'Runtime polling failed');
        }
      } finally {
        if (active) {
          setPolling(false);
        }
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, DEFAULT_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [diagramId, setError, setPolling, setSnapshot]);
}
