import { el, qs, clear } from './dom.js';
import { store } from './store.js';
import { renderInicio } from './views/inicio.js';
import { renderInventario } from './views/inventario.js';
import { renderMantenimientos } from './views/mantenimientos.js';
import { renderBackups } from './views/backups.js';
import { renderReportes } from './views/reportes.js';
import { renderConfiguracion } from './views/configuracion.js';
import { renderPerfil } from './views/perfil.js';
import { renderAuth } from './authView.js';
import { resolveUploadSrc } from './media.js';

const routes = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'mantenimientos', label: 'Mantenimientos' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'backup', label: 'Backup' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'perfil', label: 'Perfil' }
];

const routeIcons = {
  inicio: '🏠',
  inventario: '🖥️',
  mantenimientos: '🛠️',
  reportes: '📊',
  backup: '⛁',
  configuracion: '⚙️',
  perfil: '👤'
};

function renderMain({ main, routeKey, isAdmin }) {
  clear(main);
  const page = el('div', { class: 'page' });
  main.appendChild(page);

  if (routeKey === 'inicio') return renderInicio({ root: page });
  if (routeKey === 'inventario') return renderInventario({ root: page });
  if (routeKey === 'mantenimientos') {
    if (!isAdmin) {
      page.appendChild(el('div', { class: 'empty', text: 'No tienes permisos de Admin para acceder a Mantenimientos.' }));
      return;
    }
    return renderMantenimientos({ root: page });
  }
  if (routeKey === 'reportes') return renderReportes({ root: page });
  if (routeKey === 'backup') return renderBackups({ root: page });
  if (routeKey === 'configuracion') return renderConfiguracion({ root: page });
  if (routeKey === 'perfil') return renderPerfil({ root: page });

  page.appendChild(el('div', { class: 'empty', text: 'Sin vista.' }));
}

function avatarInitials(username = '') {
  const s = String(username).trim();
  if (!s) return '?';
  return s.slice(0, 2).toUpperCase();
}

export function renderShell({ mountId }) {
  const mount = qs(`#${mountId}`);
  clear(mount);

  const state = store.get();
  const session = state.session;
  const isAdmin = session?.nombre_rol === 'Admin';
  const canCreateEquipo = isAdmin || !!session?.can_create;

  const main = el('main', { class: 'main' });

  const navItems = isAdmin ? routes : routes.filter((r) => r.key !== 'mantenimientos');
  let mantenimientosBell = null;
  const navButtons = navItems.map((r) => {
    const button = el('button', {
      type: 'button',
      'data-route': r.key,
      'aria-current': state.route === r.key ? 'page' : null,
      onClick: () => {
        store.setRoute(r.key);
        renderShell({ mountId });
      }
    }, [
      el('span', { class: 'nav-icon', 'aria-hidden': 'true' }, [routeIcons[r.key] || '•']),
      el('span', { class: 'nav-label', text: r.label })
    ]);

    if (r.key === 'mantenimientos') {
      const bell = el('span', { class: 'nav-bell-icon', 'aria-hidden': 'true' }, ['🔔']);
      button.appendChild(bell);
      mantenimientosBell = bell;
    }

    return button;
  });

  const sidebar = el('aside', { class: 'sidebar' }, [
    el('div', { class: 'brand' }, [
      el('div', { class: 'brand-title', text: 'SGILC' }),
      el('div', { class: 'brand-sub', text: 'Laboratorio de cómputo I' })
    ]),
    el('nav', { class: 'nav' }, navButtons),
    el('div', { class: 'sidebar-footer' }, [
      el('button', {
        class: 'btn logout-btn',
        type: 'button',
        onClick: async () => {
          await window.api.auth.logout();
          store.setSession(null);
          renderAuth({ mountId: 'app' });
        }
      }, [
        el('span', { class: 'button-icon', 'aria-hidden': 'true' }, ['➜]']),
        'Salir'
      ])
    ])
  ]);

  (async () => {
    if (!mantenimientosBell) return;
    try {
      const proximos = await window.api.mantenimientos.proximos();
      if (proximos.length > 0) {
        mantenimientosBell.classList.add('active');
      } else {
        mantenimientosBell.classList.remove('active');
      }
    } catch (error) {
      console.error('Error cargando notificaciones de mantenimientos:', error);
    }
  })();

  const header = el('header', { class: 'header' }, [
    el('div', { class: 'header-left' }, [
      el('button', {
        class: 'btn',
        type: 'button',
        disabled: !isAdmin,
        onClick: () => {
          store.setRoute('configuracion');
          renderShell({ mountId });
        }
      }, [
        el('span', { class: 'button-icon', 'aria-hidden': 'true' }, ['👤']),
        'Añadir Usuario'
      ]),
      el('button', {
        class: 'btn primary',
        type: 'button',
        disabled: !canCreateEquipo,
        onClick: () => {
          store.setRoute('inventario');
          renderShell({ mountId });
        }
      }, [
        el('span', { class: 'button-icon', 'aria-hidden': 'true' }, ['➕']),
        'Añadir Equipo'
      ])
    ]),
    el('div', { class: 'header-center' }, [
      el('input', {
        class: 'search',
        placeholder: 'Búsqueda global (filtra listas)',
        value: state.globalQuery,
        onInput: (e) => {
          store.setGlobalQuery(e.target.value);
          renderMain({ main, routeKey: store.get().route });
        }
      })
    ]),
    el('div', { class: 'header-right' }, [
      el('div', { class: 'user-chip' }, [
        (() => {
          const avatarSrc = resolveUploadSrc(session?.avatar_path);
          if (avatarSrc) {
            return el('img', { class: 'avatar avatar-image', src: avatarSrc, alt: session?.username || 'Avatar' });
          }
          return el('div', { class: 'avatar', text: avatarInitials(session?.username) });
        })(),
        el('div', {}, [
          el('div', { style: 'font-weight:800; font-size:13px', text: session?.username || '' }),
          el('div', { class: 'role-pill', text: session?.nombre_rol || 'Usuario' })
        ])
      ])
    ])
  ]);

  const shell = el('div', { class: 'app-shell' }, [sidebar, header, main]);
  mount.appendChild(shell);

  renderMain({ main, routeKey: state.route, isAdmin });
}

