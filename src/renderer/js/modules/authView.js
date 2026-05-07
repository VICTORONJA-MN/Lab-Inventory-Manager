import { el, qs, clear } from './dom.js';
import { store } from './store.js';
import { renderShell } from './shellView.js';
import { showLoader, hideLoader } from './loader.js';
import { success, error } from './notify.js';

function renderBootstrap({ root }) {
  const errorBox = el('div');

  const username = el('input', { placeholder: 'Usuario (admin)', autocomplete: 'username' });
  const nombre = el('input', { placeholder: 'Nombre completo (opcional)', autocomplete: 'name' });
  const pass = el('input', { placeholder: 'Contraseña', type: 'password', autocomplete: 'new-password' });
  const pass2 = el('input', { placeholder: 'Confirmar contraseña', type: 'password', autocomplete: 'new-password' });

  const submit = el('button', {
    class: 'btn primary',
    type: 'button',
    onClick: async () => {
      if (!username.value.trim() || pass.value.length < 4) {
        error('Completa usuario y una contraseña (mínimo 4).');
        return;
      }
      if (pass.value !== pass2.value) {
        error('Las contraseñas no coinciden.');
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
        error(res.error || 'No se pudo crear admin.');
        return;
      }
      success('Admin creado. Preparando acceso...');
      store.setNeedsBootstrap(false);
      
      // Mostrar loader y recargar la página automáticamente después de 1 segundo
      setTimeout(async () => {
        showLoader({ message: 'Cargando...' });
        await window.api.app.reload();
      }, 1000);
    }
  }, ['Crear Admin']);

  const card = el('div', { class: 'auth-card' }, [
    el('h2', { text: 'Primer inicio: crear Admin' }),
    el('div', { class: 'hint', text: 'No hay usuarios registrados. Crea el usuario administrador para comenzar.' }),
    el('div', { class: 'auth-grid' }, [
      el('div', { class: 'auth-row span-2' }, [el('label', { text: 'Usuario' }), username]),
      el('div', { class: 'auth-row span-2' }, [el('label', { text: 'Nombre completo' }), nombre]),
      el('div', { class: 'auth-row' }, [el('label', { text: 'Contraseña' }), pass]),
      el('div', { class: 'auth-row' }, [el('label', { text: 'Confirmar' }), pass2]),
      el('div', { class: 'auth-row span-2' }, [submit])
    ])
  ]);
  root.appendChild(card);
}

function renderLogin({ root }) {
  const username = el('input', { placeholder: 'Username', autocomplete: 'username' });
  const password = el('input', { placeholder: 'Password', type: 'password', autocomplete: 'current-password' });

  const submit = el('button', {
    class: 'btn primary',
    type: 'button',
    onClick: async () => {
      submit.disabled = true;
      const res = await window.api.auth.login({ username: username.value.trim(), password: password.value });
      submit.disabled = false;
      if (!res.ok) {
        error(res.error || 'Login inválido.');
        return;
      }
      success('Bienvenido!');
      store.setSession(res.user);
      setTimeout(() => {
        renderShell({ mountId: 'app' });
      }, 500);
    }
  }, ['Entrar']);

  const card = el('div', { class: 'auth-card' }, [
    el('h2', { text: 'Iniciar Sesión' }),
    el('div', { class: 'hint', text: 'Ingresa tus credenciales para acceder.' }),
    el('div', { class: 'auth-row' }, [el('label', { text: 'Usuario' }), username]),
    el('div', { class: 'auth-row' }, [el('label', { text: 'Contraseña' }), password]),
    el('div', { class: 'auth-row' }, [submit])
  ]);
  root.appendChild(card);
}

export async function renderAuth({ mountId }) {
  const mount = qs(`#${mountId}`);
  clear(mount);

  // Consultar estado real desde el main para decidir bootstrap/login
  try {
    const status = await window.api.auth.sessionStatus();
    store.setNeedsBootstrap(!!status.needsBootstrap);
  } catch (err) {
    console.error('Error consultando sessionStatus en renderAuth:', err);
  }

  const wrap = el('div', { class: 'auth-wrap' }, [
    el('div', { class: 'auth-container' }, [
      el('div', { class: 'auth-title' }, [
        el('h1', { text: 'Kanri' }),
        el('div', { class: 'auth-subtitle', text: 'Sistema de gestión de inventario' })
      ])
    ])
  ]);
  mount.appendChild(wrap);

  const { needsBootstrap } = store.get();
  if (needsBootstrap) renderBootstrap({ root: wrap });
  else renderLogin({ root: wrap });
}