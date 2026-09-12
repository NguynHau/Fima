import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { applySystemColorsToDocument, loadStoredSystemColors } from './utils/systemColorManager.ts';
import './index.css';

// Initialize custom system colors before first render
applySystemColorsToDocument(loadStoredSystemColors());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
