import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { UploadPage } from './pages/UploadPage';
import { DetectPage } from './pages/DetectPage';
import { DesignPage } from './pages/DesignPage';
import { VisualizePage } from './pages/VisualizePage';
import { EstimatePage } from './pages/EstimatePage';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/detect/:sessionId" element={<DetectPage />} />
          <Route path="/design/:sessionId" element={<DesignPage />} />
          <Route path="/visualize/:sessionId" element={<VisualizePage />} />
          <Route path="/estimate/:sessionId" element={<EstimatePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
