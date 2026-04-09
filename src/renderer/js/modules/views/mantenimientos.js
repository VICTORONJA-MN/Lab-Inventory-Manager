import { el, qs, clear } from '../dom.js';
import { store } from '../store.js';
import { openModal, closeModal } from '../modal.js';

async function loadMantenimientos() {
  try {
    const mantenimientos = await window.api.mantenimientos.list();
    return mantenimientos;
  } catch (error) {
    console.error('Error loading mantenimientos:', error);
    return [];
  }
}

async function loadProximos() {
  try {
    const proximos = await window.api.mantenimientos.proximos();
    return proximos;
  } catch (error) {
    console.error('Error loading proximos:', error);
    return [];
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES');
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
  const equipos = await window.api.equipos.list({}); // Cargar equipos para seleccionar

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

  const proximos = await loadProximos();
  const mantenimientos = await loadMantenimientos();

  const header = el('div', { class: 'page-header' }, [
    el('h1', { text: 'Mantenimientos' })
  ]);

  const proximosSection = el('div', { class: 'section' }, [
    el('h2', { text: 'Próximos Mantenimientos (Esta Semana)' }),
    proximos.length > 0 ? el('ul', { class: 'list' }, proximos.map(m => el('li', { class: 'list-item' }, [
      el('div', { class: 'item-content' }, [
        el('strong', { text: m.equipo_nombre }),
        el('span', { text: ` - ${formatDate(m.fecha_proximo)}` }),
        el('span', { text: getEstadoLabel(m.estado) })
      ])
    ]))) : el('p', { text: 'No hay mantenimientos próximos esta semana.' })
  ]);

  const table = el('table', { class: 'table' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Equipo' }),
        el('th', { text: 'Fecha Próximo' }),
        el('th', { text: 'Estado' }),
        el('th', { text: 'Acciones' })
      ])
    ]),
    el('tbody', {}, mantenimientos.map(m => el('tr', {}, [
      el('td', { text: m.equipo_nombre }),
      el('td', { text: formatDate(m.fecha_proximo) }),
      el('td', { text: getEstadoLabel(m.estado) }),
      el('td', {}, [
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn small', text: 'Editar', onClick: async () => {
            const form = await renderMantenimientoForm({
              mantenimiento: m,
              onSave: async (data) => {
                await window.api.mantenimientos.update(data);
                renderMantenimientos({ root });
              }
            });
            openModal({ title: 'Editar Mantenimiento', bodyNode: form });
          }}),
          el('button', { class: 'btn small danger', text: 'Eliminar', onClick: async () => {
            if (confirm('¿Eliminar este mantenimiento?')) {
              await window.api.mantenimientos.delete(m.id);
              renderMantenimientos({ root });
            }
          }})
        ])
      ])
    ])))
  ]);

  root.appendChild(header);
  root.appendChild(proximosSection);
  root.appendChild(table);
}