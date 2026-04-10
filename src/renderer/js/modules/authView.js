import { el, qs, clear } from './dom.js';
import { store } from './store.js';
import { renderShell } from './shellView.js';

function renderBootstrap({ root }) {
  const msg = el('div');
  const msgBox = el('div');
  const errorBox = el('div');

  const username = el('input', { placeholder: 'Usuario (admin)', autocomplete: 'username' });
  const nombre = el('input', { placeholder: 'Nombre completo (opcional)', autocomplete: 'name' });
  const pass = el('input', { placeholder: 'Contraseña', type: 'password', autocomplete: 'new-password' });
  const pass2 = el('input', { placeholder: 'Confirmar contraseña', type: 'password', autocomplete: 'new-password' });

  const submit = el('button', {
    class: 'btn primary',
    type: 'button',
    onClick: async () => {
      clear(errorBox);
      msg.textContent = '';
      if (!username.value.trim() || pass.value.length < 4) {
        errorBox.appendChild(el('div', { class: 'error', text: 'Completa usuario y una contraseña (mínimo 4).'}));
        return;
      }
      if (pass.value !== pass2.value) {
        errorBox.appendChild(el('div', { class: 'error', text: 'Las contraseñas no coinciden.'}));
        return;
      }
      submit.disabled = true;
      const res = await window.api.auth.bootstrapAdmin({
        username: username.value.trim(),
        password: pass.value,
        nombre_completo: nombre.value.trim()
      });
      submit.disabled = false;
      if (!res.ok) {
        errorBox.appendChild(el('div', { class: 'error', text: res.error || 'No se pudo crear admin.' }));
        return;
      }
      msg.textContent = 'Admin creado. Ahora inicia sesión.';
      clear(msgBox);
      msgBox.appendChild(el('div', { class: 'success' }, [msg]));
      store.setNeedsBootstrap(false);
    }
  }, ['Crear Admin']);

  const card = el('div', { class: 'auth-card' }, [
    el('h2', { text: 'Primer inicio: crear Admin' }),
    el('div', { class: 'hint', text: 'No hay usuarios registrados. Crea el usuario administrador para comenzar.' }),
    errorBox,
    el('div', { class: 'auth-grid' }, [
      el('div', { class: 'auth-row span-2' }, [el('label', { text: 'Usuario' }), username]),
      el('div', { class: 'auth-row span-2' }, [el('label', { text: 'Nombre completo' }), nombre]),
      el('div', { class: 'auth-row' }, [el('label', { text: 'Contraseña' }), pass]),
      el('div', { class: 'auth-row' }, [el('label', { text: 'Confirmar' }), pass2]),
      el('div', { class: 'auth-row span-2' }, [submit]),
      el('div', { class: 'span-2' }, [msgBox])
    ])
  ]);
  root.appendChild(card);
}

function renderLogin({ root }) {
  const errorBox = el('div');
  const username = el('input', { placeholder: 'Username', autocomplete: 'username' });
  const password = el('input', { placeholder: 'Password', type: 'password', autocomplete: 'current-password' });

  const submit = el('button', {
    class: 'btn primary',
    type: 'button',
    onClick: async () => {
      clear(errorBox);
      const res = await window.api.auth.login({ username: username.value.trim(), password: password.value });
      if (!res.ok) {
        errorBox.appendChild(el('div', { class: 'error', text: res.error || 'Login inválido.' }));
        return;
      }
      store.setSession(res.user);
      renderShell({ mountId: 'app' });
    }
  }, ['Entrar']);

  const card = el('div', { class: 'auth-card' }, [
    el('h2', { text: 'Iniciar Sesión' }),
    el('div', { class: 'hint', text: 'Ingresa tus credenciales para acceder.' }),
    errorBox,
    el('div', { class: 'auth-row' }, [el('label', { text: 'Usuario' }), username]),
    el('div', { class: 'auth-row' }, [el('label', { text: 'Contraseña' }), password]),
    el('div', { class: 'auth-row' }, [submit])
  ]);
  root.appendChild(card);
}

export function renderAuth({ mountId }) {
  const mount = qs(`#${mountId}`);
  clear(mount);

  // Capturamos el estado de bootstrap desde el proceso principal si viene en la URL
  const urlParams = new URLSearchParams(window.location.search);
  const forceBootstrap = urlParams.get('bootstrap') === 'true';
  
  if (forceBootstrap) {
    store.setNeedsBootstrap(true);
  }

  const wrap = el('div', { class: 'auth-wrap' }, [
    el('div', { class: 'auth-container' }, [
      el('div', { class: 'auth-title' }, [
        el('h1', { text: 'SGILC' }),
        el('div', { class: 'auth-subtitle', text: 'I - Laboratorio de Cómputo' })
      ])
    ])
  ]);
  mount.appendChild(wrap);

  const { needsBootstrap } = store.get();
  if (needsBootstrap) renderBootstrap({ root: wrap });
  else renderLogin({ root: wrap });
}