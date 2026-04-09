import { el, clear, formatDateTime } from '../dom.js';
import { store } from '../store.js';

export async function renderReportes({ root }) {
  clear(root);
  root.appendChild(
    el('div', { class: 'page-title' }, [
      el('div', {}, [
        el('h2', { text: 'Reportes' }),
        el('p', { class: 'hint', text: 'Filtra por rango de fechas y categorías. Genera reporte Excel descargable.' })
      ])
    ])
  );

  const state = store.get();
  const session = state.session || {};
  const canReport = session.nombre_rol === 'Admin' || !!session.can_report;

  if (!canReport) {
    root.appendChild(el('div', { class: 'empty', text: 'No tienes permisos para generar reportes.' }));
    return;
  }

  const desde = el('input', { type: 'datetime-local' });
  const hasta = el('input', { type: 'datetime-local' });

  // Obtener categorías únicas
  const categoriasRes = await window.api.reportes.getCategorias();
  const allCategorias = categoriasRes || [];
  const selectedCategorias = new Set();

  const categoriaContainer = el('div', { class: 'categoria-filter' });
  const categoriaToggle = el('button', {
    class: 'btn secondary',
    type: 'button',
    onClick: () => {
      const isOpen = categoriaContainer.classList.contains('open');
      if (isOpen) {
        categoriaContainer.classList.remove('open');
      } else {
        categoriaContainer.classList.add('open');
      }
    }
  }, ['Seleccionar Categorías ▼']);

  const categoriaList = el('div', { class: 'categoria-list' });
  const selectAllBtn = el('button', {
    class: 'btn',
    type: 'button',
    onClick: () => {
      selectedCategorias.clear();
      allCategorias.forEach(cat => selectedCategorias.add(cat));
      updateCategoriaChecks();
      updatePreview();
    }
  }, ['Seleccionar Todo']);

  const deselectAllBtn = el('button', {
    class: 'btn',
    type: 'button',
    onClick: () => {
      selectedCategorias.clear();
      updateCategoriaChecks();
      updatePreview();
    }
  }, ['Deseleccionar Todo']);

  categoriaList.appendChild(el('div', { class: 'categoria-actions' }, [selectAllBtn, deselectAllBtn]));

  allCategorias.forEach(cat => {
    const checkbox = el('input', { type: 'checkbox', value: cat, onChange: (e) => {
      if (e.target.checked) {
        selectedCategorias.add(cat);
      } else {
        selectedCategorias.delete(cat);
      }
      updatePreview();
    } });
    const label = el('label', {}, [checkbox, el('span', { text: cat })]);
    categoriaList.appendChild(label);
  });

  categoriaContainer.appendChild(categoriaToggle);
  categoriaContainer.appendChild(categoriaList);

  function updateCategoriaChecks() {
    categoriaList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = selectedCategorias.has(cb.value);
    });
  }

  const preview = el('div', { class: 'preview' });
  const generateBtn = el('button', {
    class: 'btn primary',
    type: 'button',
    onClick: async () => {
      const payload = {
        desde: desde.value ? new Date(desde.value).toISOString() : null,
        hasta: hasta.value ? new Date(hasta.value).toISOString() : null,
        categorias: Array.from(selectedCategorias)
      };
      const res = await window.api.reportes.generar(payload);
      if (!res.ok) {
        alert(res.error || 'Error al generar reporte.');
        return;
      }
      alert(`Reporte generado con ${res.count} registros. Guardado en: ${res.filePath}`);
    }
  }, ['Generar Reporte Excel']);

  function updatePreview() {
    clear(preview);
    const payload = {
      desde: desde.value ? new Date(desde.value).toISOString() : null,
      hasta: hasta.value ? new Date(hasta.value).toISOString() : null,
      categorias: Array.from(selectedCategorias)
    };

    // Mostrar filtros aplicados
    const filters = [];
    if (payload.desde) filters.push(`Desde: ${formatDateTime(payload.desde)}`);
    if (payload.hasta) filters.push(`Hasta: ${formatDateTime(payload.hasta)}`);
    if (payload.categorias.length > 0) filters.push(`Categorías: ${payload.categorias.join(', ')}`);
    else filters.push('Categorías: Todas');

    preview.appendChild(el('div', { class: 'filters-summary' }, [
      el('h3', { text: 'Filtros aplicados:' }),
      el('p', { text: filters.join(' | ') })
    ]));

    // Aquí podrías agregar una vista previa de los datos, pero por simplicidad, solo mostrar el resumen
  }

  desde.addEventListener('change', updatePreview);
  hasta.addEventListener('change', updatePreview);

  root.appendChild(el('div', { class: 'toolbar' }, [
    el('div', {}, [el('label', { class: 'hint', text: 'Desde' }), desde]),
    el('div', {}, [el('label', { class: 'hint', text: 'Hasta' }), hasta]),
    categoriaContainer,
    generateBtn
  ]));
  root.appendChild(preview);

  updatePreview();
}

