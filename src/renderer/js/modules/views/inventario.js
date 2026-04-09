import { el, clear, formatDateTime } from '../dom.js';
import { openModal, closeModal } from '../modal.js';
import { store } from '../store.js';
import { resolveUploadSrc } from '../media.js';

function estadoLabel(e) {
  if (e === 'activo') return 'Activo';
  if (e === 'mantenimiento') return 'Mantenimiento';
  if (e === 'baja') return 'Baja';
  return e || '';
}

function makeEquipoForm({ initial, onSubmit }) {
  const data = initial || {
    nombre: '',
    serie: '',
    categoria: '',
    estado: 'activo',
    ubicacion: '',
    observaciones: '',
    foto_url: ''
  };

  const nombre = el('input', { value: data.nombre || '' });
  const serie = el('input', { value: data.serie || '' });
  const categoria = el('input', { value: data.categoria || '' });
  const estado = el('select', {}, [
    el('option', { value: 'activo', text: 'activo', selected: data.estado === 'activo' }),
    el('option', { value: 'mantenimiento', text: 'mantenimiento', selected: data.estado === 'mantenimiento' }),
    el('option', { value: 'baja', text: 'baja', selected: data.estado === 'baja' })
  ]);
  const ubicacion = el('input', { value: data.ubicacion || '' });
  const observaciones = el('textarea', { rows: '4' }, [data.observaciones || '']);
  const fechaMantenimiento = el('input', { type: 'date', value: data.fecha_mantenimiento || '' });
  const file = el('input', { type: 'file', accept: 'image/*' });
  const fotoInfo = el('div', { class: 'hint', text: data.foto_url ? `Foto actual: ${data.foto_url}` : 'Sin foto.' });

  const errorBox = el('div');

  const form = el('div', { class: 'form' }, [
    el('div', { class: 'field span-2' }, [el('label', { text: 'Nombre *' }), nombre]),
    el('div', { class: 'field' }, [el('label', { text: 'Serie' }), serie]),
    el('div', { class: 'field' }, [el('label', { text: 'Categoría *' }), categoria]),
    el('div', { class: 'field' }, [el('label', { text: 'Estado' }), estado]),
    el('div', { class: 'field span-2' }, [el('label', { text: 'Ubicación' }), ubicacion]),
    el('div', { class: 'field span-2' }, [el('label', { text: 'Observaciones' }), observaciones]),
    el('div', { class: 'field' }, [el('label', { text: 'Próximo Mantenimiento (opcional)' }), fechaMantenimiento]),
    el('div', { class: 'field span-2' }, [el('label', { text: 'Foto (opcional)' }), file, fotoInfo]),
    el('div', { class: 'span-2' }, [errorBox])
  ]);

  async function readFileBase64(f) {
    const bytes = await f.arrayBuffer();
    let binary = '';
    const arr = new Uint8Array(bytes);
    const chunk = 0x8000;
    for (let i = 0; i < arr.length; i += chunk) {
      binary += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function submit() {
    clear(errorBox);
    if (!nombre.value.trim() || !categoria.value.trim()) {
      errorBox.appendChild(el('div', { class: 'error', text: 'Nombre y categoría son obligatorios.' }));
      return;
    }

    let foto_url = data.foto_url || null;
    const selected = file.files?.[0];
    if (selected) {
      const bytesBase64 = await readFileBase64(selected);
      const photoRes = await window.api.equipos.savePhoto({
        equipoId: data.id || null,
        originalName: selected.name,
        bytesBase64
      });
      if (!photoRes.ok) {
        errorBox.appendChild(el('div', { class: 'error', text: photoRes.error || 'No se pudo guardar la foto.' }));
        return;
      }
      foto_url = photoRes.storedPath;
    }

    await onSubmit({
      id: data.id,
      nombre: nombre.value.trim(),
      serie: serie.value.trim(),
      categoria: categoria.value.trim(),
      estado: estado.value,
      ubicacion: ubicacion.value.trim(),
      observaciones: observaciones.value.trim(),
      foto_url,
      fecha_mantenimiento: fechaMantenimiento.value || null
    }, errorBox);
  }

  return { node: form, submit };
}

function renderDetalle(equipo) {
  const equipoPhotoSrc = resolveUploadSrc(equipo?.foto_url);
  const photo = equipoPhotoSrc
    ? el('img', { src: equipoPhotoSrc })
    : el('div', { class: 'equip-photo', text: 'Sin foto' });

  const body = el('div', { class: 'form' }, [
    el('div', { class: 'span-2' }, [
      el('div', { class: 'equip-photo' }, [photo])
    ]),
    el('div', { class: 'field' }, [el('label', { text: 'Nombre' }), el('div', { text: equipo?.nombre || '' })]),
    el('div', { class: 'field' }, [el('label', { text: 'Serie' }), el('div', { text: equipo?.serie || '' })]),
    el('div', { class: 'field' }, [el('label', { text: 'Categoría' }), el('div', { text: equipo?.categoria || '' })]),
    el('div', { class: 'field' }, [el('label', { text: 'Estado' }), el('div', { text: estadoLabel(equipo?.estado) })]),
    el('div', { class: 'field span-2' }, [el('label', { text: 'Ubicación' }), el('div', { text: equipo?.ubicacion || '' })]),
    el('div', { class: 'field span-2' }, [el('label', { text: 'Fecha registro' }), el('div', { text: formatDateTime(equipo?.fecha_registro) })]),
    el('div', { class: 'field span-2' }, [el('label', { text: 'Observaciones' }), el('div', { text: equipo?.observaciones || '' })])
  ]);

  openModal({
    title: `Equipo #${equipo.id}`,
    bodyNode: body,
    footerNode: el('div', {}, [
      el('button', { class: 'btn', type: 'button', onClick: () => closeModal() }, ['Х'])
    ])
  });
}

export async function renderInventario({ root }) {
  clear(root);
  root.appendChild(
    el('div', { class: 'page-title' }, [
      el('div', {}, [
        el('h2', { text: 'Inventario' }),
        el('p', { class: 'hint', text: 'Vista de tabla o tarjetas. Ver/Editar/Eliminar por equipo.' })
      ])
    ])
  );

  const state = store.get();
  const session = state.session || {};
  const isAdmin = session.nombre_rol === 'Admin';
  const canCreate = isAdmin || !!session.can_create;
  const canEdit = isAdmin || !!session.can_edit;
  const canDelete = isAdmin || !!session.can_delete;
  let viewMode = state.inventarioViewMode || 'tabla';

  const listWrap = el('div');
  const toggle = el('div', { class: 'segmented' }, [
    el('button', { type: 'button', 'aria-pressed': viewMode === 'tabla' ? 'true' : 'false', onClick: () => { viewMode = 'tabla'; store.setInventarioViewMode('tabla'); renderList(); } }, ['Tabla']),
    el('button', { type: 'button', 'aria-pressed': viewMode === 'tarjetas' ? 'true' : 'false', onClick: () => { viewMode = 'tarjetas'; store.setInventarioViewMode('tarjetas'); renderList(); } }, ['Tarjetas'])
  ]);

  const addBtn = el('button', {
    class: 'btn primary',
    type: 'button',
    disabled: !canCreate,
    onClick: async () => {
      const form = makeEquipoForm({
        initial: null,
        onSubmit: async (payload, errorBox) => {
          const res = await window.api.equipos.create(payload);
          if (!res.ok) {
            errorBox.appendChild(el('div', { class: 'error', text: res.error || 'No se pudo crear.' }));
            return;
          }
          closeModal();
          await renderList(true);
        }
      });

      openModal({
        title: 'Añadir Equipo',
        bodyNode: form.node,
        footerNode: el('div', {}, [
          el('button', { class: 'btn', type: 'button', onClick: () => closeModal() }, ['Cancelar']),
          el('button', { class: 'btn primary', type: 'button', onClick: () => form.submit() }, ['Guardar'])
        ])
      });
    }
  }, ['➕ Añadir Equipo']);

  root.appendChild(el('div', { class: 'toolbar' }, [
    toggle,
    el('div', { class: 'spacer' }),
    addBtn
  ]));

  root.appendChild(listWrap);

  async function renderList(force = false) {
    const segButtons = toggle.querySelectorAll('button');
    segButtons[0].setAttribute('aria-pressed', viewMode === 'tabla' ? 'true' : 'false');
    segButtons[1].setAttribute('aria-pressed', viewMode === 'tarjetas' ? 'true' : 'false');

    clear(listWrap);
    const q = store.get().globalQuery.trim();
    const rows = await window.api.equipos.list({ q });
    if (!rows.length) {
      listWrap.appendChild(el('div', { class: 'empty', text: 'Sin registros.' }));
      return;
    }

    if (viewMode === 'tabla') {
      const table = el('table');
      table.appendChild(el('thead', {}, [
        el('tr', {}, [
          el('th', { text: 'ID' }),
          el('th', { text: 'Nombre' }),
          el('th', { text: 'Categoría' }),
          el('th', { text: 'Estado' }),
          el('th', { text: 'Ubicación' }),
          el('th', { text: 'Fecha' }),
          el('th', { text: 'Acciones' })
        ])
      ]));
      const tbody = el('tbody');
      for (const e of rows) {
        const tr = el('tr', {}, [
          el('td', { text: String(e.id) }),
          el('td', { text: e.nombre || '' }),
          el('td', { text: e.categoria || '' }),
          el('td', { text: estadoLabel(e.estado) }),
          el('td', { text: e.ubicacion || '' }),
          el('td', { text: formatDateTime(e.fecha_registro) }),
          el('td', {}, [
            el('div', { class: 'actions' }, [
              el('button', { class: 'btn', type: 'button', onClick: async () => renderDetalle(await window.api.equipos.get(e.id)) }, ['Ver']),
              el('button', { class: 'btn', type: 'button', disabled: !canEdit, onClick: () => openEdit(e.id) }, ['Editar']),
              el('button', { class: 'btn danger', type: 'button', disabled: !canDelete, onClick: () => onDelete(e.id) }, ['Eliminar'])
            ])
          ])
        ]);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      listWrap.appendChild(table);
      return;
    }

    const grid = el('div', { class: 'grid-cards' });
    for (const e of rows) {
      const photoSrc = resolveUploadSrc(e.foto_url);
      const photoNode = photoSrc
        ? el('img', { src: photoSrc })
        : el('div', { class: 'equip-photo', text: 'Sin foto' });

      grid.appendChild(el('div', { class: 'equip-card' }, [
        el('div', { class: 'equip-photo' }, [photoNode]),
        el('div', { class: 'equip-title', text: e.nombre || '' }),
        el('div', { class: 'equip-sub', text: `${e.categoria || ''} • ${estadoLabel(e.estado)}${e.ubicacion ? ` • ${e.ubicacion}` : ''}` }),
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn', type: 'button', onClick: async () => renderDetalle(await window.api.equipos.get(e.id)) }, ['Ver']),
          el('button', { class: 'btn', type: 'button', disabled: !canEdit, onClick: () => openEdit(e.id) }, ['Editar']),
          el('button', { class: 'btn danger', type: 'button', disabled: !canDelete, onClick: () => onDelete(e.id) }, ['Eliminar'])
        ])
      ]));
    }
    listWrap.appendChild(grid);
  }

  async function openEdit(id) {
    const equipo = await window.api.equipos.get(id);
    const form = makeEquipoForm({
      initial: equipo,
      onSubmit: async (payload, errorBox) => {
        const res = await window.api.equipos.update(payload);
        if (!res.ok) {
          errorBox.appendChild(el('div', { class: 'error', text: res.error || 'No se pudo actualizar.' }));
          return;
        }
        closeModal();
        await renderList(true);
      }
    });
    openModal({
      title: `Editar Equipo #${id}`,
      bodyNode: form.node,
      footerNode: el('div', {}, [
        el('button', { class: 'btn', type: 'button', onClick: () => closeModal() }, ['Cancelar']),
        el('button', { class: 'btn primary', type: 'button', onClick: () => form.submit() }, ['Guardar'])
      ])
    });
  }

  async function onDelete(id) {
    const ok = confirm(`¿Eliminar el equipo #${id}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await window.api.equipos.delete(id);
      await renderList(true);
    } catch (e) {
      alert('No se pudo eliminar (permiso o error).');
    }
  }

  await renderList();
}

