const path = require('path');
const fs = require('fs');
const { all, get, run, getDbPaths } = require('./db');
const { requireSession } = require('./auth');

function requirePerm(action) {
  const s = requireSession();
  if (s.nombre_rol === 'Admin') return s;
  if (action === 'create' && s.can_create) return s;
  if (action === 'edit' && s.can_edit) return s;
  if (action === 'delete' && s.can_delete) return s;
  const err = new Error('No tienes permisos para esta acción.');
  err.code = 'FORBIDDEN';
  throw err;
}

async function listEquipos({ q } = {}) {
  requireSession();
  const query = (q || '').trim();
  if (!query) {
    return all('SELECT * FROM equipos ORDER BY datetime(fecha_registro) DESC, id DESC;');
  }
  const like = `%${query}%`;
  return all(
    `SELECT * FROM equipos
     WHERE nombre LIKE ? OR serie LIKE ? OR categoria LIKE ? OR estado LIKE ? OR ubicacion LIKE ? OR observaciones LIKE ?
     ORDER BY datetime(fecha_registro) DESC, id DESC;`,
    [like, like, like, like, like, like]
  );
}

async function getEquipo(id) {
  requireSession();
  return get('SELECT * FROM equipos WHERE id = ?;', [id]);
}

async function createEquipo(payload) {
  requirePerm('create');
  const {
    nombre,
    serie,
    categoria,
    estado,
    foto_url,
    ubicacion,
    observaciones,
    fecha_mantenimiento
  } = payload || {};

  const res = await run(
    `INSERT INTO equipos (nombre, serie, categoria, estado, foto_url, ubicacion, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      nombre,
      serie || null,
      categoria,
      estado || 'activo',
      normalizeStoredFileName(foto_url),
      ubicacion || null,
      observaciones || null
    ]
  );

  // Si se especifica fecha de mantenimiento, crear registro
  if (fecha_mantenimiento) {
    const { run: runMantenimiento } = require('./db');
    await runMantenimiento(
      'INSERT INTO mantenimientos (equipo_id, fecha_proximo) VALUES (?, ?);',
      [res.lastID, fecha_mantenimiento]
    );
  }

  return { ok: true, id: res.lastID };
}

async function updateEquipo(payload) {
  requirePerm('edit');
  const {
    id,
    nombre,
    serie,
    categoria,
    estado,
    foto_url,
    ubicacion,
    observaciones,
    fecha_mantenimiento
  } = payload || {};

  await run(
    `UPDATE equipos
     SET nombre = ?, serie = ?, categoria = ?, estado = ?, foto_url = ?, ubicacion = ?, observaciones = ?
     WHERE id = ?;`,
    [
      nombre,
      serie || null,
      categoria,
      estado || 'activo',
      normalizeStoredFileName(foto_url),
      ubicacion || null,
      observaciones || null,
      id
    ]
  );

  // Gestionar mantenimiento
  if (fecha_mantenimiento) {
    const existingMantenimiento = await get('SELECT id FROM mantenimientos WHERE equipo_id = ? AND estado = ?;', [id, 'pendiente']);
    if (existingMantenimiento) {
      // Actualizar fecha si ya existe pendiente
      await run('UPDATE mantenimientos SET fecha_proximo = ? WHERE id = ?;', [fecha_mantenimiento, existingMantenimiento.id]);
    } else {
      // Crear nuevo si no existe
      await run('INSERT INTO mantenimientos (equipo_id, fecha_proximo) VALUES (?, ?);', [id, fecha_mantenimiento]);
    }
  }

  return { ok: true };
}

async function deleteEquipo(id) {
  requirePerm('delete');
  await run('DELETE FROM equipos WHERE id = ?;', [id]);
  return { ok: true };
}

async function savePhoto({ equipoId, originalName, bytesBase64 }) {
  requirePerm(equipoId ? 'edit' : 'create');
  if (!bytesBase64) return { ok: false, error: 'Sin archivo.' };

  const { uploadsPath } = getDbPaths();
  const safeName = String(originalName || 'foto').replace(/[^\w.\-]+/g, '_').slice(0, 80);
  const ext = path.extname(safeName) || '.png';
  const fileName = `equipo_${equipoId || 'nuevo'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(uploadsPath, fileName);

  const buffer = Buffer.from(bytesBase64, 'base64');
  fs.writeFileSync(filePath, buffer);

  return { ok: true, storedPath: fileName };
}

function normalizeStoredFileName(value) {
  if (!value) return null;
  const input = String(value).trim();
  if (!input) return null;
  if (input.startsWith('file://')) return path.basename(input.slice('file://'.length));
  return path.basename(input);
}

module.exports = {
  listEquipos,
  getEquipo,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  savePhoto
}

