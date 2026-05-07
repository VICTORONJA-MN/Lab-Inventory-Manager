import { el, clear } from '../dom.js';
import { store } from '../store.js';
import { success, error, warning } from '../notify.js';
import { openModal, closeModal } from '../modal.js';

const exportSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="17 8 12 3 7 8"/>
  <line x1="12" y1="3" x2="12" y2="15"/>
</svg>`;

const importSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>`;

const trashSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
  <path d="M10 11v6M14 11v6"/>
  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
</svg>`;

function svgSpan(svgStr) {
  const s = el('span', { 'aria-hidden': 'true', style: 'display:inline-flex;align-items:center;' });
  s.innerHTML = svgStr;
  return s;
}

function openPasswordModal({ onConfirm }) {
  const passwordInput = el('input', {
    type: 'password',
    placeholder: 'Contraseña actual',
    style: 'width:100%;'
  });

  const errorMsg = el('div', { class: 'error', style: 'display:none;' });

  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, [
    el('p', { style: 'margin:0;color:var(--muted);font-size:13px;', text: 'Ingresa tu contraseña para confirmar esta acción.' }),
    el('div', { class: 'field' }, [
      el('label', { text: 'Contraseña' }),
      passwordInput
    ]),
    errorMsg
  ]);

  const confirmBtn = el('button', {
    class: 'btn danger',
    type: 'button',
    onClick: async () => {
      const pwd = passwordInput.value;
      if (!pwd) {
        errorMsg.textContent = 'Ingresa tu contraseña.';
        errorMsg.style.display = 'block';
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Verificando...';
      await onConfirm(pwd, errorMsg, confirmBtn);
    }
  }, ['Confirmar']);

  openModal({
    title: 'Confirmar contraseña',
    bodyNode: body,
    footerNode: el('div', {}, [
      el('button', { class: 'btn', type: 'button', onClick: () => closeModal() }, ['Cancelar']),
      confirmBtn
    ])
  });

  // Focus automático en el input al abrir
  setTimeout(() => passwordInput.focus(), 100);
}

export async function renderBackups({ root }) {
  clear(root);

  root.appendChild(
    el('div', { class: 'page-title' }, [
      el('div', {}, [
        el('h2', { text: 'Backup' }),
        el('p', { class: 'hint', text: 'Exportar/Importar la base de datos SQLite y borrar sistema' })
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

  // --- Botones de exportar e importar ---
  const exportBtn = el('button', {
    class: 'btn primary',
    type: 'button',
    onClick: async () => {
      const res = await window.api.backups.exportDb();
      if (res?.canceled) return;
      if (!res?.ok) { error('No se pudo exportar.'); return; }
      success('Exportación completada correctamente.');
    }
  }, [svgSpan(exportSvg), ' Exportar DB']);

  const importBtn = el('button', {
    class: 'btn danger',
    type: 'button',
    onClick: async () => {
      const ok = confirm('¿Importar DB? Esto reemplaza la base actual.');
      if (!ok) return;
      const res = await window.api.backups.importDb();
      if (res?.canceled) return;
      if (!res?.ok) { error('No se pudo importar.'); return; }
      warning('Importación completada. Reinicia la app para recargar.');
    }
  }, [svgSpan(importSvg), ' Importar DB']);

  root.appendChild(el('div', { class: 'toolbar' }, [exportBtn, importBtn]));

  // --- Zona de peligro: Reset del sistema ---
  const resetBtn = el('button', {
    class: 'btn danger',
    type: 'button',
    onClick: () => {
      // Primera confirmación — advertencia clara
      const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;' }, [
        el('p', { style: 'margin:0;font-weight:700;color:var(--danger);', text: '⚠ Esta acción no se puede revertir.' }),
        el('p', { style: 'margin:0;color:var(--muted);font-size:13px;', text: 'Se borrarán permanentemente la base de datos y todas las imágenes almacenadas. La aplicación se cerrará al finalizar.' }),
        el('p', { style: 'margin:0;color:var(--muted);font-size:13px;', text: 'Al volver a abrir la app deberás configurar un nuevo administrador.' })
      ]);

      openModal({
        title: '¿Borrar sistema completo?',
        bodyNode: body,
        footerNode: el('div', {}, [
          el('button', { class: 'btn', type: 'button', onClick: () => closeModal() }, ['Cancelar']),
          el('button', {
            class: 'btn danger',
            type: 'button',
            onClick: () => {
              closeModal();
              // Segunda confirmación — pedir contraseña
              openPasswordModal({
                onConfirm: async (password, errorMsg, confirmBtn) => {
                  const res = await window.api.system.reset({ password });
                  if (!res.ok) {
                    errorMsg.textContent = res.error || 'Error al verificar contraseña.';
                    errorMsg.style.display = 'block';
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Confirmar';
                    return;
                  }
                  // Éxito — la app se cerrará sola en 500ms (ver main.js)
                  closeModal();
                  success('Sistema borrado. La aplicación se cerrará en un momento...');
                }
              });
            }
          }, ['continuar'])
        ])
      });
    }
  }, [svgSpan(trashSvg), ' Borrar sistema']);

  root.appendChild(
    el('div', { class: 'danger-zone', style: 'margin-top:24px;' }, [
      el('div', { class: 'danger-zone-title' }, [svgSpan(trashSvg), ' Zona de peligro']),
      el('p', { class: 'danger-zone-desc', text: 'Borra permanentemente toda la base de datos y archivos almacenados. La app se cerrará al finalizar. Esta acción no se puede deshacer.' }),
      resetBtn
    ])
  );
}