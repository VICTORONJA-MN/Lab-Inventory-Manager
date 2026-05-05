import { el, qs } from './dom.js';

let notificationContainer = null;

const NOTIFICATION_TYPES = {
  success: { icon: '✓', color: 'success' },
  error: { icon: '✕', color: 'error' },
  warning: { icon: '⚠', color: 'warning' },
  info: { icon: 'ℹ', color: 'info' }
};

function ensureContainer() {
  if (!notificationContainer) {
    notificationContainer = el('div', { class: 'notifications-container' });
    document.body.appendChild(notificationContainer);
  }
  return notificationContainer;
}

export function notify(message, type = 'info', duration = 4000) {
  const container = ensureContainer();
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;

  const notification = el('div', { class: `notification notification-${config.color}` }, [
    el('div', { class: 'notification-icon', text: config.icon }),
    el('div', { class: 'notification-content' }, [
      el('p', { class: 'notification-message', text: message })
    ]),
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

  // Trigger animation
  setTimeout(() => {
    notification.classList.add('notification-enter');
  }, 10);

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

export function success(message, duration = 4000) {
  return notify(message, 'success', duration);
}

export function error(message, duration = 5000) {
  return notify(message, 'error', duration);
}

export function warning(message, duration = 4000) {
  return notify(message, 'warning', duration);
}

export function info(message, duration = 4000) {
  return notify(message, 'info', duration);
}
