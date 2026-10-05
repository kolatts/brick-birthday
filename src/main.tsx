import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { installUnlockOnFirstTap } from './audio/engine';
import { installTestHooks } from './test/hooks';

installUnlockOnFirstTap();
installTestHooks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
