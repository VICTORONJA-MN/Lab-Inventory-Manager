import { el, clear, formatDateTime } from '../dom.js';
import { store } from '../store.js';

export async function renderInicio({ root }) {
  clear(root);
  root.appendChild(
    el('div', { class: 'page-title' }, [
      el('div', {}, [
        el('h2', { text: 'Inicio' }),
        el('p', { class: 'hint', text: 'Dashboard (conteos y estado general).' })
      ])
    ])
  );

  const wrap = el('div', { class: 'cards' });
  root.appendChild(wrap);

  const q = store.get().globalQuery.trim();
  const equipos = await window.api.equipos.list({ q });

  const total = equipos.length;
  const activos = equipos.filter((e) => e.estado === 'activo').length;
  const mantenimiento = equipos.filter((e) => e.estado === 'mantenimiento').length;
  const baja = equipos.filter((e) => e.estado === 'baja').length;

  // Card: Últimos registros (grande, span-6)
  const ultimos = equipos.slice(0, 3);
  const listaUltimos = el('div', { class: 'records-list' });
  if (ultimos.length > 0) {
    ultimos.forEach((e) => {
      listaUltimos.appendChild(
        el('div', { class: 'record-item' }, [
          el('div', { class: 'record-name', text: e.nombre || '(sin nombre)' }),
          el('div', { class: 'record-meta', text: `${e.categoria || 'N/A'} • ${e.estado || 'N/A'}` }),
          el('div', { class: 'record-time', text: formatDateTime(e.fecha_registro) })
        ])
      );
    });
  } else {
    listaUltimos.appendChild(el('div', { class: 'hint', text: 'Sin registros recientes.' }));
  }

  wrap.appendChild(el('div', { class: 'card span-6' }, [
    el('div', { class: 'card-header' }, [
      el('h3', { class: 'card-title', text: 'Últimos Registros' })
    ]),
    listaUltimos
  ]));

  // Cards: Estadísticas (pequeñas, span-3 o span-4)
  wrap.appendChild(el('div', { class: 'card span-3' }, [
    el('div', { class: 'card-title', text: 'Equipos Totales' }),
    el('div', { class: 'kpi', text: String(total) }),
    el('div', { class: 'card-meta', text: q ? `Filtro: "${q}"` : 'Sin filtro' })
  ]));
  wrap.appendChild(el('div', { class: 'card span-3' }, [
    el('div', { class: 'card-title', text: 'Activos' }),
    el('div', { class: 'kpi ok', text: String(activos) }),
    el('div', { class: 'card-meta', text: 'Estado: activo' })
  ]));
  wrap.appendChild(el('div', { class: 'card span-3 right-left' }, [
    el('div', { class: 'card-title', text: 'Mantenimiento' }),
    el('div', { class: 'kpi warn', text: String(mantenimiento) }),
    el('div', { class: 'card-meta', text: 'Estado: mantenimiento' })
  ]));
  wrap.appendChild(el('div', { class: 'card span-3 right-right' }, [
    el('div', { class: 'card-title', text: 'En Baja' }),
    el('div', { class: 'kpi danger', text: String(baja) }),
    el('div', { class: 'card-meta', text: 'Estado: baja' })
  ]));

  // Card: Mantenimientos Próximos
  const proximos = await window.api.mantenimientos.proximos();
  const listaProximos = el('div', { class: 'records-list' });
  if (proximos.length > 0) {
    proximos.slice(0, 3).forEach((m) => {
      listaProximos.appendChild(
        el('div', { class: 'record-item' }, [
          el('div', { class: 'record-name', text: m.equipo_nombre || '(sin nombre)' }),
          el('div', { class: 'record-meta', text: `Próximo: ${new Date(m.fecha_proximo).toLocaleDateString('es-ES')}` })
        ])
      );
    });
  } else {
    listaProximos.appendChild(el('div', { class: 'hint', text: 'No hay mantenimientos próximos.' }));
  }

  wrap.appendChild(el('div', { class: 'card span-6' }, [
    el('div', { class: 'card-header' }, [
      el('h3', { class: 'card-title', text: 'Mantenimientos Próximos' })
    ]),
    listaProximos
  ]));

  if (total === 0) {
    root.appendChild(el('div', { class: 'empty', text: 'Sin registros.' }));
  }
}

