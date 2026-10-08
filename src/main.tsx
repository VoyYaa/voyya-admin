import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/nunito/wght.css';
import '@fontsource-variable/nunito-sans/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import { App } from './App';
import { initializeTheme } from './state/theme-store';
import './index.css';

initializeTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento #root en index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
