import { renderAuth } from './modules/authView.js';
import { renderShell } from './modules/shellView.js';
import { store } from './modules/store.js';

async function bootstrap() {
  try {
    window.__APP_PATHS__ = await window.api.getPaths();
    const status = await window.api.auth.sessionStatus();
    store.setSession(status.user);
    store.setNeedsBootstrap(status.needsBootstrap);

    if (!status.loggedIn) {
      renderAuth({ mountId: 'app' });
      return;
    }

    renderShell({ mountId: 'app' });
  } catch (error) {
    console.error('Bootstrap failed:', error);
    const root = document.querySelector('#app');
    if (root) {
      root.innerHTML = `<div style="padding:24px;color:#fff;background:#111;min-height:100vh;"><h1>Error al iniciar</h1><pre style="white-space:pre-wrap;color:#f88;">${String(error)}</pre></div>`;
    }
  }
}

bootstrap();

