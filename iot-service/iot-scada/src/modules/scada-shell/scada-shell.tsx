import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import type { ScadaMode } from '../../types/scada';
import { useDiagramStore } from '../../stores/use-diagram-store';
import { useRuntimeStore } from '../../stores/use-runtime-store';

interface ScadaShellProps extends PropsWithChildren {
  mode: ScadaMode;
  diagramId: string;
  onSave?: () => void;
  onReset?: () => void;
}

export function ScadaShell({ mode, diagramId, onSave, onReset, children }: ScadaShellProps) {
  const working = useDiagramStore((state) => state.working);
  const dirty = useDiagramStore((state) => state.dirty);
  const runtime = useRuntimeStore((state) => state.snapshot);
  const polling = useRuntimeStore((state) => state.polling);

  return (
    <div className="scada-shell">
      <header className="scada-topbar">
        <div>
          <div className="scada-eyebrow">SCADA operational canvas</div>
          <h1>{working?.diagram.name ?? 'Loading diagram...'}</h1>
        </div>
        <div className="scada-topbar-meta">
          <Link className="metric-chip link-chip" to={`/scada/diagrams/${diagramId}/${mode === 'edit' ? 'view' : 'edit'}`}>
            {mode === 'edit' ? 'Open viewer' : 'Open editor'}
          </Link>
          <span className={`mode-pill mode-pill-${mode}`}>{mode}</span>
          <span className="metric-chip">bindings {runtime?.summary.totalBindings ?? 0}</span>
          <span className="metric-chip">offline {runtime?.summary.offlineBindings ?? 0}</span>
          <span className="metric-chip">{polling ? 'polling...' : 'live ready'}</span>
          {dirty ? <span className="metric-chip metric-chip-warn">unsaved</span> : null}
          {mode === 'edit' ? (
            <>
              <button className="metric-chip action-chip" type="button" onClick={onReset}>
                Reset
              </button>
              <button className="metric-chip action-chip action-chip-primary" type="button" onClick={onSave}>
                Save
              </button>
            </>
          ) : null}
        </div>
      </header>
      <div className="scada-layout">{children}</div>
    </div>
  );
}
