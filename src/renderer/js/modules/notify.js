import { el } from './dom.js';

let notificationContainer = null;
let resolvedGifUrl = null;

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

async function getGifUrl() {
  if (resolvedGifUrl !== null) return resolvedGifUrl;
  try {
    // Usa la ruta ya resuelta por el splash en index.html
    // Si aún no está lista (notificación muy temprana), la pide via IPC
    if (window.__ASSETS_PATH__) {
      resolvedGifUrl = window.__ASSETS_PATH__ + '/mona.gif';
    } else {
      const assetsPath = await window.api.getAssetsPath();
      const base = 'file:///' + assetsPath.replace(/^\/+/, '');
      window.__ASSETS_PATH__ = base;
      resolvedGifUrl = base + '/mona.gif';
    }
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