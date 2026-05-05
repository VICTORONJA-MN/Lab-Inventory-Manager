import { el, qs } from './dom.js';

let loaderContainer = null;

export function showLoader(options = {}) {
  const { 
    message = 'Cargando...',
    target = null 
  } = options;

  // Si ya existe, no crear otro
  if (loaderContainer && loaderContainer.parentNode) {
    return loaderContainer;
  }

  loaderContainer = el('div', { class: 'loader-overlay' }, [
    el('div', { class: 'loader-container' }, [
      el('div', { class: 'spinner' }, [
        el('div', { class: 'spinner-ring' }),
        el('div', { class: 'spinner-ring' }),
        el('div', { class: 'spinner-ring' }),
        el('div', { class: 'spinner-ring' })
      ]),
      message ? el('p', { class: 'loader-text', text: message }) : null
    ])
  ]);

  if (target) {
    target.appendChild(loaderContainer);
  } else {
    document.body.appendChild(loaderContainer);
  }

  return loaderContainer;
}

export function hideLoader() {
  if (loaderContainer && loaderContainer.parentNode) {
    loaderContainer.remove();
    loaderContainer = null;
  }
}

export function updateLoaderMessage(message) {
  if (loaderContainer) {
    const textEl = qs('.loader-text', loaderContainer);
    if (textEl) {
      textEl.textContent = message;
    }
  }
}

export function getLoader() {
  return loaderContainer;
}
