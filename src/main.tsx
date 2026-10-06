import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { installUnlockOnFirstTap } from './audio/engine';
import { installTestHooks } from './test/hooks';
import { installUiScale } from './ui/scale';
import { applyResetParam } from './state/reset';
import { preloadModel } from './three/Model';

installUnlockOnFirstTap();
installUiScale();
applyResetParam();
installTestHooks();
// The title-screen figure must never show a blank face: warm Luna's model before first paint.
preloadModel('luna');

const turntable = new URLSearchParams(location.search).get('turntable');
if (turntable && (import.meta.env.DEV || new URLSearchParams(location.search).get('test') === '1')) {
  // dev-only figure turntable (src/dev/Turntable.tsx)
  void import('./dev/Turntable').then((m) => m.mountTurntable(turntable));
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
