const { all, get, run } = require('./db');
const { requireAdmin } = require('./auth');

async function listMantenimientos() {
  requireAdmin();
  return all(`
    SELECT m.*, e.nombre AS equipo_nombre, e.serie, e.categoria
    FROM mantenimientos m
    LEFT JOIN equipos e ON e.id = m.equipo_id
    ORDER BY m.fecha_proximo ASC;
  `);
}

async function getMantenimientoById(id) {
  requireAdmin();
  return get(`
    SELECT m.*, e.nombre AS equipo_nombre, e.serie, e.categoria
    FROM mantenimientos m
    LEFT JOIN equipos e ON e.id = m.equipo_id
    WHERE m.id = ?;
  `, [id]);
}

async function createMantenimiento({ equipo_id, fecha_proximo, estado }) {
  requireAdmin();
  // Verificar que el equipo existe
  const equipo = await get('SELECT id FROM equipos WHERE id = ?;', [equipo_id]);
  if (!equipo) return { ok: false, error: 'Equipo no existe.' };

  const finalEstado = String(estado || 'pendiente').trim().toLowerCase();

  await run(
    'INSERT INTO mantenimientos (equipo_id, fecha_proximo, estado) VALUES (?, ?, ?);',
    [equipo_id, fecha_proximo, finalEstado]
  );
  return { ok: true };
}

async function updateMantenimiento({ id, fecha_proximo, estado, fecha_realizado }) {
  requireAdmin();
  const existing = await get('SELECT id FROM mantenimientos WHERE id = ?;', [id]);
  if (!existing) return { ok: false, error: 'Mantenimiento no existe.' };

  const finalEstado = String(estado || 'pendiente').trim().toLowerCase();

  await run(
    'UPDATE mantenimientos SET fecha_proximo = ?, estado = ?, fecha_realizado = ? WHERE id = ?;',
    [fecha_proximo, finalEstado, fecha_realizado || null, id]
  );
  return { ok: true };
}

async function deleteMantenimiento(id) {
  requireAdmin();
  await run('DELETE FROM mantenimientos WHERE id = ?;', [id]);
  return { ok: true };
}

async function getMantenimientosProximos() {
  // requireSession(); // Remover para permitir notificaciones sin sesión activa
  // Mantenimientos en los próximos 7 días
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const todayStr = today.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  return all(`
    SELECT m.*, e.nombre AS equipo_nombre, e.serie, e.categoria
    FROM mantenimientos m
    LEFT JOIN equipos e ON e.id = m.equipo_id
    WHERE LOWER(m.estado) = ? AND m.fecha_proximo BETWEEN ? AND ?
    ORDER BY m.fecha_proximo ASC;
  `, ['pendiente', todayStr, nextWeekStr]);
}

module.exports = {
  listMantenimientos,
  getMantenimientoById,
  createMantenimiento,
  updateMantenimiento,
  deleteMantenimiento,
  getMantenimientosProximos
};