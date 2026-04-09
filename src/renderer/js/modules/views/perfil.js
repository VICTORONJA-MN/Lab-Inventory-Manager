import { el, clear } from '../dom.js';
import { store } from '../store.js';
import { resolveUploadSrc } from '../media.js';

function avatarInitials(username = '') {
  return username
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'US';
}

async function readFileBase64(file) {
  const bytes = await file.arrayBuffer();
  let binary = '';
  const arr = new Uint8Array(bytes);
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function renderPerfil({ root }) {
  clear(root);
  const s = store.get().session;
  root.appendChild(
    el('div', { class: 'page-title' }, [
      el('div', {}, [
        el('h2', { text: 'Perfil' }),
        el('p', { class: 'hint', text: 'Ficha de usuario y permisos. Solo el avatar es editable para usuarios normales.' })
      ])
    ])
  );

  if (!s) {
    root.appendChild(el('div', { class: 'empty', text: 'Sin sesión.' }));
    return;
  }

  const isAdmin = s.nombre_rol === 'Admin';
  const avatarSrc = resolveUploadSrc(s.avatar_path);
  const errorBox = el('div');
  const successBox = el('div');

  const avatarImage = avatarSrc
    ? el('img', { src: avatarSrc, alt: 'Avatar' })
    : el('div', { class: 'profile-avatar-fallback', text: avatarInitials(s.username) });

  const fileInput = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });

  const avatarBtn = el('button', {
    class: 'btn secondary profile-avatar-btn',
    type: 'button',
    onClick: () => fileInput.click()
  }, ['Subir avatar']);

  fileInput.addEventListener('change', async () => {
    clear(errorBox);
    clear(successBox);

    const file = fileInput.files?.[0];
    if (!file) return;
    const bytesBase64 = await readFileBase64(file);
    const res = await window.api.usuarios.saveAvatar({ originalName: file.name, bytesBase64 });
    if (!res.ok) {
      errorBox.appendChild(el('div', { class: 'error', text: res.error || 'No se pudo cambiar el avatar.' }));
      return;
    }

    const sessionStatus = await window.api.auth.sessionStatus();
    if (sessionStatus?.user) {
      store.setSession(sessionStatus.user);
    }
    renderPerfil({ root });
  });

  const nameInput = el('input', { type: 'text', value: s.nombre_completo || '', disabled: !isAdmin });
  const usernameInput = el('input', { type: 'text', value: s.username, disabled: !isAdmin });
  const passwordInput = el('input', { type: 'password', placeholder: isAdmin ? 'Nueva contraseña (opcional)' : 'No disponible', disabled: !isAdmin });

  const saveBtn = el('button', {
    class: 'btn primary',
    type: 'button',
    disabled: !isAdmin,
    onClick: async () => {
      clear(errorBox);
      clear(successBox);
      const payload = {
        id: s.id,
        username: usernameInput.value.trim(),
        nombre_completo: nameInput.value.trim(),
        password: passwordInput.value
      };
      const res = await window.api.usuarios.update(payload);
      if (!res.ok) {
        errorBox.appendChild(el('div', { class: 'error', text: res.error || 'No se pudo actualizar el perfil.' }));
        return;
      }
      const sessionStatus = await window.api.auth.sessionStatus();
      if (sessionStatus?.user) {
        store.setSession(sessionStatus.user);
      }
      successBox.appendChild(el('div', { class: 'success', text: 'Perfil actualizado.' }));
      renderPerfil({ root });
    }
  }, ['Guardar cambios']);

  const permissions = [
    { label: 'Crear', value: s.can_create ? 'Sí' : 'No' },
    { label: 'Editar', value: s.can_edit ? 'Sí' : 'No' },
    { label: 'Eliminar', value: s.can_delete ? 'Sí' : 'No' }
  ];

  root.appendChild(el('div', { class: 'profile-grid' }, [
    el('div', { class: 'profile-card profile-summary' }, [
      el('div', { class: 'profile-avatar-wrap' }, [
        el('div', { class: 'profile-avatar' }, [avatarImage]),
        avatarBtn,
        fileInput
      ]),
      el('div', { class: 'profile-info' }, [
        el('div', { class: 'profile-name', text: s.nombre_completo || 'Sin nombre completo' }),
        el('div', { class: 'profile-username', text: `@${s.username}` }),
        el('div', { class: 'profile-role', text: `Rol: ${s.nombre_rol}` })
      ])
    ]),
    el('div', { class: 'profile-card profile-details' }, [
      el('div', { class: 'profile-row' }, [
        el('div', { class: 'profile-label', text: 'Nombre completo' }),
        nameInput
      ]),
      el('div', { class: 'profile-row' }, [
        el('div', { class: 'profile-label', text: 'Usuario' }),
        usernameInput
      ]),
      isAdmin ? el('div', { class: 'profile-row' }, [
        el('div', { class: 'profile-label', text: 'Contraseña' }),
        passwordInput
      ]) : null,
      el('div', { class: 'profile-section' }, [
        el('div', { class: 'profile-label', text: 'Permisos' }),
        el('div', { class: 'profile-perms' }, permissions.map((perm) => el('div', { class: 'perm-item' }, [
          el('div', { class: 'perm-item-label', text: perm.label }),
          el('div', { class: 'perm-item-value', text: perm.value })
        ])))
      ]),
      el('div', { class: 'toolbar' }, [saveBtn])
    ])
  ]));

  root.appendChild(errorBox);
  root.appendChild(successBox);
}

