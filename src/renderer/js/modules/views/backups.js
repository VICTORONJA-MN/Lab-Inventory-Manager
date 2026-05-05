import { el, clear } from '../dom.js';
import { store } from '../store.js';
import { success, error, warning } from '../notify.js';

export async function renderBackups({ root }) {
  clear(root);
  root.appendChild(
    el('div', { class: 'page-title' }, [
      el('div', {}, [
        el('h2', { text: 'Backup' }),
        el('p', { class: 'hint', text: 'Exportar/Importar la base de datos SQLite.' })
      ])
    ])
  );

  const state = store.get();
  const session = state.session || {};
  const isAdmin = session.nombre_rol === 'Admin';

  if (!isAdmin) {
    root.appendChild(el('div', { class: 'empty', text: 'Solo los administradores pueden gestionar backups.' }));
    return;
  }

  const exportBtn = el('button', {
    class: 'btn primary',
    type: 'button',
    disabled: !isAdmin,
    onClick: async () => {
      const res = await window.api.backups.exportDb();
      if (res?.canceled) return;
      if (!res?.ok) {
        error('No se pudo exportar.');
        return;
      }
      success('Exportación completada correctamente.');
    }
  }, ['📤 Exportar DB']);

  const importBtn = el('button', {
    class: 'btn danger',
    type: 'button',
    disabled: !isAdmin,
    onClick: async () => {
      const ok = confirm('¿Importar DB? Esto reemplaza la base actual.');
      if (!ok) return;
      const res = await window.api.backups.importDb();
      if (res?.canceled) return;
      if (!res?.ok) {
        error('No se pudo importar.');
        return;
      }
      warning('Importación completada. Reinicia la app para recargar.');
    }
  }, ['📥 Importar DB']);

  root.appendChild(el('div', { class: 'toolbar' }, [exportBtn, importBtn]));
}

