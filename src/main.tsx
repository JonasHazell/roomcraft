import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces/index.css';
import '@fontsource/karla/400.css';
import '@fontsource/karla/600.css';
import '@fontsource/karla/700.css';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
