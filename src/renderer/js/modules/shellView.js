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
import { info } from './notify.js';
import { resolveUploadSrc } from './media.js';

const routes = [
  { key: 'inicio',          label: 'Inicio'         },
  { key: 'inventario',      label: 'Inventario'     },
  { key: 'mantenimientos',  label: 'Mantenimientos' },
  { key: 'reportes',        label: 'Reportes'       },
  { key: 'backup',          label: 'Backup'         },
  { key: 'configuracion',   label: 'Configuración'  },
  { key: 'perfil',          label: 'Perfil'         }
];

// SVG icons — estilo línea, 16×16, stroke currentColor
const routeIcons = {
  inicio: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>`,

  inventario: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 18v3"/>
  </svg>`,

  mantenimientos: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>`,

  reportes: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3v18h18"/>
    <path d="M7 16l4-4 4 4 4-6"/>
  </svg>`,

  backup: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>`,

  configuracion: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,

  perfil: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`,

  logout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`,

  addUser: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/>
    <line x1="22" y1="11" x2="16" y2="11"/>
  </svg>`,

  addEquipo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 18v3"/>
    <line x1="12" y1="8" x2="12" y2="14"/>
    <line x1="9" y1="11" x2="15" y2="11"/>
  </svg>`,

  bell: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>`
};

function svgIcon(key) {
  const wrap = el('span', { class: 'nav-icon', 'aria-hidden': 'true' });
  wrap.innerHTML = routeIcons[key] || '';
  return wrap;
}

function buttonIcon(key) {
  const wrap = el('span', { class: 'button-icon', 'aria-hidden': 'true' });
  wrap.innerHTML = routeIcons[key] || '';
  return wrap;
}

function renderMain({ main, routeKey, isAdmin }) {
  clear(main);
  const page = el('div', { class: 'page' });
  main.appendChild(page);

  if (routeKey === 'inicio')        return renderInicio({ root: page });
  if (routeKey === 'inventario')    return renderInventario({ root: page });
  if (routeKey === 'mantenimientos') {
    if (!isAdmin) {
      page.appendChild(el('div', { class: 'empty', text: 'No tienes permisos de Admin para acceder a Mantenimientos.' }));
      return;
    }
    return renderMantenimientos({ root: page });
  }
  if (routeKey === 'reportes')      return renderReportes({ root: page });
  if (routeKey === 'backup')        return renderBackups({ root: page });
  if (routeKey === 'configuracion') return renderConfiguracion({ root: page });
  if (routeKey === 'perfil')        return renderPerfil({ root: page });

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
      svgIcon(r.key),
      el('span', { class: 'nav-label', text: r.label })
    ]);

    if (r.key === 'mantenimientos') {
      const bell = el('span', { class: 'nav-bell-icon', 'aria-hidden': 'true' });
      bell.innerHTML = routeIcons.bell;
      button.appendChild(bell);
      mantenimientosBell = bell;
    }

    return button;
  });

  const sidebar = el('aside', { class: 'sidebar' }, [
    el('div', { class: 'brand' }, [
      el('div', { class: 'brand-title', text: 'Kanri' }),
      el('div', { class: 'brand-sub', text: 'Sistema de gestión de inventario' })
    ]),
    el('nav', { class: 'nav' }, navButtons),
    el('div', { class: 'sidebar-footer' }, [
      el('button', {
        class: 'btn logout-btn',
        type: 'button',
        onClick: async () => {
          await window.api.auth.logout();
          store.setSession(null);
          info('Sesión cerrada correctamente.');
          setTimeout(() => {
            renderAuth({ mountId: 'app' });
          }, 500);
        }
      }, [
        buttonIcon('logout'),
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
        buttonIcon('addUser'),
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
        buttonIcon('addEquipo'),
        'Añadir Equipo'
      ])
    ]),
    el('div', { class: 'header-center' }, [
      el('input', {
        class: 'search',
        placeholder: '🔍︎ Búsqueda global (filtra listas)',
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