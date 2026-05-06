import { el, clear } from '../dom.js';
import { openModal, closeModal } from '../modal.js';
import { store } from '../store.js';
import { success, error } from '../notify.js';
import { getTheme, toggleTheme } from '../theme.js';

function isAdmin() {
  return store.get().session?.nombre_rol === 'Admin';
}

function userForm({ roles, initial, onSubmit }) {
  const data = initial || { username: '', password: '', nombre_completo: '', rol_id: roles?.[0]?.id ?? null };
  const errorBox = el('div');
  const username = el('input', { value: data.username || '' });
  const nombre = el('input', { value: data.nombre_completo || '' });
  const password = el('input', { type: 'password', value: '' });
  const role = el('select');
  for (const r of roles) role.appendChild(el('option', { value: String(r.id), text: r.nombre_rol, selected: r.id === data.rol_id }));

  const node = el('div', { class: 'form' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Username *' }), username]),
    el('div', { class: 'field' }, [el('label', { text: 'Rol *' }), role]),
    el('div', { class: 'field span-2' }, [el('label', { text: 'Nombre completo' }), nombre]),
    el('div', { class: 'field span-2' }, [el('label', { text: initial ? 'Password (dejar vacío para no cambiar)' : 'Password *' }), password])
  ]);

  async function submit() {
    if (!username.value.trim()) {
      error('Username es obligatorio.');
      return;
    }
    if (!initial && password.value.trim().length < 4) {
      error('Password mínimo 4.');
      return;
    }
    await onSubmit({
      id: initial?.id,
      username: username.value.trim(),
      nombre_completo: nombre.value.trim(),
      password: password.value,
      rol_id: Number(role.value)
    });
  }

  return { node, submit };
}

function buildThemeSwitch(root) {
  const current = getTheme();
  const isDark = current === 'dark';

  // SVG Luna (tema oscuro activo → ofrecer cambiar a claro)
  const moonSvg = `<svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.5 11A4.5 4.5 0 0 1 11 15.5 4.5 4.5 0 0 1 6.5 11 4.5 4.5 0 0 1 11 6.5c.17 0 .34.01.5.03A5.5 5.5 0 1 0 15.5 11Z"
      fill="currentColor" stroke="currentColor" stroke-width="1.2"/>
  </svg>`;

  // SVG Sol (tema claro activo → ofrecer cambiar a oscuro)
  const sunSvg = `<svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="4.5" fill="currentColor"/>
    <path d="M11 3v2M11 17v2M3 11h2M17 11h2M5.64 5.64l1.41 1.41M13.95 13.95l1.41 1.41M5.64 16.36l1.41-1.41M13.95 8.05l1.41-1.41"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

  const iconWrap = el('span', { class: 'theme-switch-icon', 'aria-hidden': 'true' });
  iconWrap.innerHTML = isDark ? moonSvg : sunSvg;

  const label = el('span', {
    style: 'font-size:13px; color:var(--muted); margin-right:4px; white-space:nowrap;',
    text: isDark ? 'Tema claro' : 'Tema oscuro'
  });

  const btn = el('button', {
    class: 'btn theme-switch',
    type: 'button',
    style: 'display:inline-flex; align-items:center; gap:8px; width:auto; padding:10px 16px; border-radius:999px;',
    title: isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
    onClick: () => {
      toggleTheme();
      // Re-render completo para que todo actualice
      renderConfiguracion({ root });
    }
  }, [label, iconWrap]);

  return btn;
}

export async function renderConfiguracion({ root }) {
  clear(root);

  root.appendChild(
    el('div', { class: 'page-title' }, [
      el('div', {}, [
        el('h2', { text: 'Configuración' }),
        el('p', { class: 'hint', text: 'Gestión de usuarios y permisos (solo Admin).' })
      ]),
      buildThemeSwitch(root)
    ])
  );

  if (!isAdmin()) {
    root.appendChild(el('div', { class: 'empty', text: 'Sin permisos. (Solo Admin)' }));
    return;
  }

  const [roles, users] = await Promise.all([window.api.roles.list(), window.api.usuarios.list()]);

  const msg = el('div');

  const addUserBtn = el('button', {
    class: 'btn primary',
    type: 'button',
    onClick: async () => {
      const form = userForm({
        roles,
        initial: null,
        onSubmit: async (payload) => {
          const res = await window.api.usuarios.create(payload);
          if (!res.ok) {
            error(res.error || 'No se pudo crear.');
            return;
          }
          success('Usuario creado correctamente.');
          closeModal();
          renderConfiguracion({ root });
        }
      });
      openModal({
        title: 'Añadir Usuario',
        bodyNode: form.node,
        footerNode: el('div', {}, [
          el('button', { class: 'btn', type: 'button', onClick: () => closeModal() }, ['Cancelar']),
          el('button', { class: 'btn primary', type: 'button', onClick: () => form.submit() }, ['Guardar'])
        ])
      });
    }
  }, ['👤 Añadir Usuario']);

  root.appendChild(el('div', { class: 'toolbar' }, [addUserBtn]));
  root.appendChild(msg);

  if (!users.length) {
    root.appendChild(el('div', { class: 'empty', text: 'Sin registros.' }));
    return;
  }

  const table = el('table');
  table.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', { text: 'ID' }),
      el('th', { text: 'Username' }),
      el('th', { text: 'Nombre' }),
      el('th', { text: 'Rol' }),
      el('th', { text: 'Permisos' }),
      el('th', { text: 'Acciones' })
    ])
  ]));

  const tbody = el('tbody');

  for (const u of users) {
    const perms = `C:${u.can_create ? '1' : '0'} E:${u.can_edit ? '1' : '0'} D:${u.can_delete ? '1' : '0'}`;
    const tr = el('tr', {}, [
      el('td', { text: String(u.id) }),
      el('td', { text: u.username || '' }),
      el('td', { text: u.nombre_completo || '' }),
      el('td', { text: u.nombre_rol || '' }),
      el('td', { text: perms }),
      el('td', {}, [
        el('div', { class: 'actions' }, [
          el('button', {
            class: 'btn',
            type: 'button',
            onClick: async () => {
              const form = userForm({
                roles,
                initial: u,
                onSubmit: async (payload) => {
                  const res = await window.api.usuarios.update(payload);
                  if (!res.ok) {
                    error(res.error || 'No se pudo actualizar.');
                    return;
                  }
                  success('Usuario actualizado correctamente.');
                  closeModal();
                  renderConfiguracion({ root });
                }
              });
              openModal({
                title: `Editar Usuario #${u.id}`,
                bodyNode: form.node,
                footerNode: el('div', {}, [
                  el('button', { class: 'btn', type: 'button', onClick: () => closeModal() }, ['Cancelar']),
                  el('button', { class: 'btn primary', type: 'button', onClick: () => form.submit() }, ['Guardar'])
                ])
              });
            }
          }, ['Editar']),
          el('button', {
            class: 'btn danger',
            type: 'button',
            onClick: async () => {
              const ok = confirm(`¿Eliminar usuario "${u.username}"?`);
              if (!ok) return;
              const res = await window.api.usuarios.delete(u.id);
              if (!res.ok) {
                error(res.error || 'No se pudo eliminar.');
                return;
              }
              success('Usuario eliminado correctamente.');
              renderConfiguracion({ root });
            }
          }, ['Eliminar'])
        ])
      ])
    ]);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  root.appendChild(table);

  const usuarioRole = roles.find((r) => r.nombre_rol === 'Usuario');
  if (usuarioRole) {
    const canCreate = el('input', { type: 'checkbox', checked: usuarioRole.can_create ? 'checked' : null });
    const canEdit   = el('input', { type: 'checkbox', checked: usuarioRole.can_edit   ? 'checked' : null });
    const canDelete = el('input', { type: 'checkbox', checked: usuarioRole.can_delete ? 'checked' : null });

    const savePerms = el('button', {
      class: 'btn primary',
      type: 'button',
      onClick: async () => {
        clear(msg);
        const res = await window.api.roles.update({
          role_id: usuarioRole.id,
          can_create: !!canCreate.checked,
          can_edit:   !!canEdit.checked,
          can_delete: !!canDelete.checked
        });
        if (!res.ok) {
          msg.appendChild(el('div', { class: 'error', text: res.error || 'No se pudo guardar permisos.' }));
          return;
        }
        msg.appendChild(el('div', { class: 'success', text: 'Permisos actualizados para rol Usuario.' }));
        renderConfiguracion({ root });
      }
    }, ['Guardar permisos']);

    root.appendChild(el('div', { class: 'card span-12' }, [
      el('div', { style: 'font-weight:900', text: 'Permisos del rol "Usuario"' }),
      el('div', { class: 'perm-grid' }, [
        el('div', { class: 'perm' }, [el('div', { text: 'Crear' }),   canCreate]),
        el('div', { class: 'perm' }, [el('div', { text: 'Editar' }),  canEdit]),
        el('div', { class: 'perm' }, [el('div', { text: 'Eliminar' }), canDelete])
      ]),
      el('div', { class: 'toolbar' }, [savePerms])
    ]));
  }
}