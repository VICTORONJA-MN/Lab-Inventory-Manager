import { el, qs, clear } from '../dom.js';
import { store } from '../store.js';
import { openModal, closeModal } from '../modal.js';
import { success, error } from '../notify.js';

async function loadMantenimientos() {
  try {
    return await window.api.mantenimientos.list();
  } catch (err) {
    console.error('Error loading mantenimientos:', err);
    return [];
  }
}

async function loadProximos() {
  try {
    return await window.api.mantenimientos.proximos();
  } catch (err) {
    console.error('Error loading proximos:', err);
    return [];
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-ES');
}

function getEstadoLabel(estado) {
  const key = String(estado || '').trim().toLowerCase();
  const labels = {
    pendiente: 'Pendiente',
    realizado: 'Realizado',
    cancelado: 'Cancelado',
    pospuesto: 'Pospuesto'
  };
  return labels[key] || estado || '';
}

function getEstadoClass(estado) {
  const key = String(estado || '').trim().toLowerCase();
  const classes = {
    pendiente: 'warning',
    realizado: 'success',
    cancelado: 'danger',
    pospuesto: 'info'
  };
  return classes[key] || '';
}

async function renderMantenimientoForm({ mantenimiento, onSave }) {
  const equipos = await window.api.equipos.list({});

  const form = el('form', { class: 'form' }, [
    el('div', { class: 'form-group' }, [
      el('label', { text: 'Equipo' }),
      el('select', { name: 'equipo_id', required: true }, equipos.map(e =>
        el('option', { value: e.id, selected: mantenimiento?.equipo_id == e.id, text: `${e.nombre} (${e.serie || 'Sin serie'})` })
      ))
    ]),
    el('div', { class: 'form-group' }, [
      el('label', { text: 'Fecha Próximo Mantenimiento' }),
      el('input', { type: 'date', name: 'fecha_proximo', required: true, value: mantenimiento?.fecha_proximo || '' })
    ]),
    el('div', { class: 'form-group' }, [
      el('label', { text: 'Estado' }),
      el('select', { name: 'estado' }, [
        el('option', { value: 'pendiente', selected: !mantenimiento || String(mantenimiento.estado || '').toLowerCase() === 'pendiente', text: 'Pendiente' }),
        el('option', { value: 'realizado', selected: String(mantenimiento?.estado || '').toLowerCase() === 'realizado', text: 'Realizado' }),
        el('option', { value: 'cancelado', selected: String(mantenimiento?.estado || '').toLowerCase() === 'cancelado', text: 'Cancelado' }),
        el('option', { value: 'pospuesto', selected: String(mantenimiento?.estado || '').toLowerCase() === 'pospuesto', text: 'Pospuesto' })
      ])
    ])
  ]);

  const actions = el('div', { class: 'modal-actions' }, [
    el('button', { type: 'button', class: 'btn', text: 'Cancelar', onClick: () => closeModal() }),
    el('button', { type: 'submit', class: 'btn primary', text: mantenimiento ? 'Actualizar' : 'Crear' })
  ]);

  form.appendChild(actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {
      equipo_id: formData.get('equipo_id'),
      fecha_proximo: formData.get('fecha_proximo'),
      estado: formData.get('estado')
    };
    if (mantenimiento) data.id = mantenimiento.id;
    await onSave(data);
    closeModal();
  });

  return form;
}

export async function renderMantenimientos({ root }) {
  clear(root);

  // Título y descripción — estructura consistente con los demás módulos
  root.appendChild(
    el('div', { class: 'page-title' }, [
      el('div', {}, [
        el('h2', { text: 'Mantenimientos' }),
        el('p', { class: 'hint', text: 'Gestión de mantenimientos de equipos.' })
      ])
    ])
  );

  const [proximos, mantenimientos] = await Promise.all([
    loadProximos(),
    loadMantenimientos()
  ]);

  if (!mantenimientos.length) {
    root.appendChild(el('div', { class: 'empty', text: 'Sin registros de mantenimiento.' }));
    return;
  }

  const table = el('table', {}, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Equipo' }),
        el('th', { text: 'Fecha Próximo' }),
        el('th', { text: 'Estado' }),
        el('th', { text: 'Acciones' })
      ])
    ]),
    el('tbody', {}, mantenimientos.map(m => el('tr', {}, [
      el('td', { text: m.equipo_nombre || '' }),
      el('td', { text: formatDate(m.fecha_proximo) }),
      el('td', { text: getEstadoLabel(m.estado) }),
      el('td', {}, [
        el('div', { class: 'actions' }, [
          el('button', {
            class: 'btn',
            type: 'button',
            text: 'Editar',
            onClick: async () => {
              const form = await renderMantenimientoForm({
                mantenimiento: m,
                onSave: async (data) => {
                  try {
                    await window.api.mantenimientos.update(data);
                    success('Mantenimiento actualizado correctamente.');
                    renderMantenimientos({ root });
                  } catch (err) {
                    error('No se pudo actualizar el mantenimiento.');
                  }
                }
              });
              openModal({ title: 'Editar Mantenimiento', bodyNode: form });
            }
          }),
          el('button', {
            class: 'btn danger',
            type: 'button',
            text: 'Eliminar',
            onClick: async () => {
              if (confirm('¿Eliminar este mantenimiento?')) {
                try {
                  await window.api.mantenimientos.delete(m.id);
                  success('Mantenimiento eliminado correctamente.');
                  renderMantenimientos({ root });
                } catch (err) {
                  error('No se pudo eliminar el mantenimiento.');
                }
              }
            }
          })
        ])
      ])
    ])))
  ]);
  
  root.appendChild(table);
}