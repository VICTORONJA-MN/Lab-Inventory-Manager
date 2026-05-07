import { el } from './dom.js';

let notificationContainer = null;
let resolvedGifUrl = null; // Cache para no llamar IPC en cada notificación

const NOTIFICATION_TYPES = {
  success: { icon: '✓', color: 'success' },
  error:   { icon: '✕', color: 'error'   },
  warning: { icon: '⚠', color: 'warning' },
  info:    { icon: 'ℹ', color: 'info'    }
};

function ensureContainer() {
  if (!notificationContainer) {
    notificationContainer = el('div', { class: 'notifications-container' });
    document.body.appendChild(notificationContainer);
  }
  return notificationContainer;
}

// Resuelve la URL del gif una sola vez usando las rutas que ya conoce la app
async function getGifUrl() {
  if (resolvedGifUrl !== null) return resolvedGifUrl;
  try {
    const paths = window.__APP_PATHS__ || await window.api.getPaths();
    // baseDir es process.cwd() en dev y app.getPath('userData') en producción
    // pero los assets van en extraResources, no en userData.
    // Usamos la URL relativa que funciona en el renderer directamente.
    resolvedGifUrl = '../../assets/mona.gif';
  } catch (e) {
    resolvedGifUrl = '';
  }
  return resolvedGifUrl;
}

export async function notify(message, type = 'info', duration = 4000) {
  const container = ensureContainer();
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;

  const gifUrl = await getGifUrl();

  const gifEl = el('img', {
    alt: '',
    style: 'width:28px;height:28px;object-fit:contain;flex-shrink:0;border-radius:4px;'
  });
  if (gifUrl) gifEl.src = gifUrl;

  const contentInner = el('div', {
    style: 'display:flex;align-items:center;gap:8px;'
  }, [gifEl, el('p', { class: 'notification-message', text: message })]);

  const notification = el('div', { class: `notification notification-${config.color}` }, [
    el('div', { class: 'notification-icon', text: config.icon }),
    el('div', { class: 'notification-content' }, [contentInner]),
    el('button', {
      class: 'notification-close',
      type: 'button',
      onClick: () => {
        notification.classList.add('notification-exit');
        setTimeout(() => notification.remove(), 300);
      },
      text: '✕'
    })
  ]);

  container.appendChild(notification);
  setTimeout(() => notification.classList.add('notification-enter'), 10);

  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('notification-exit');
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }

  return notification;
}

export function success(message, duration = 4000) { return notify(message, 'success', duration); }
export function error(message, duration = 5000)   { return notify(message, 'error',   duration); }
export function warning(message, duration = 4000) { return notify(message, 'warning', duration); }
export function info(message, duration = 4000)    { return notify(message, 'info',    duration); }