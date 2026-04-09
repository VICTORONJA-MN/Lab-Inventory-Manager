import { el, qs, clear } from './dom.js';

export function closeModal() {
  const root = qs('#modal-root');
  root.setAttribute('aria-hidden', 'true');
  clear(root);
}

export function openModal({ title, bodyNode, footerNode }) {
  const root = qs('#modal-root');
  clear(root);

  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'modal-header' }, [
      el('div', { text: title || '' }),
      el('button', { class: 'btn', onClick: () => closeModal(), type: 'button' }, ['Cerrar'])
    ]),
    el('div', { class: 'modal-body' }, [bodyNode || el('div')]),
    el('div', { class: 'modal-footer' }, [footerNode || el('div')])
  ]);

  root.appendChild(modal);
  root.setAttribute('aria-hidden', 'false');

  root.addEventListener(
    'click',
    (e) => {
      if (e.target === root) closeModal();
    },
    { once: true }
  );
}

