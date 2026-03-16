import type { ScadaMode } from '../../types/scada';

interface ToolRailProps {
  mode: ScadaMode;
  onAddNode?: () => void;
  onDeleteSelection?: () => void;
}

export function ToolRail({ mode, onAddNode, onDeleteSelection }: ToolRailProps) {
  if (mode !== 'edit') {
    return null;
  }

  return (
    <aside className="tool-rail">
      <button type="button">Select</button>
      <button type="button" onClick={onAddNode}>Add Node</button>
      <button type="button" onClick={onDeleteSelection}>Delete</button>
      <button type="button">Fit View</button>
    </aside>
  );
}
