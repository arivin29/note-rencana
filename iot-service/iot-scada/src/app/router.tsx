import { Navigate, Route, Routes } from 'react-router-dom';
import { ScadaDiagramPage } from '../pages/scada-diagram-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/scada/diagrams/demo/view" replace />} />
      <Route path="/scada/diagrams/:diagramId/:mode" element={<ScadaDiagramPage />} />
    </Routes>
  );
}
