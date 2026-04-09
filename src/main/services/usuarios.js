const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { all, get, run, getDbPaths } = require('./db');
const { requireSession, requireAdmin } = require('./auth');

async function listUsuarios() {
  requireAdmin();
  return all(
    `SELECT u.id, u.username, u.nombre_completo, u.rol_id, u.avatar_path,
            r.nombre_rol, r.can_edit, r.can_delete, r.can_create, r.can_report
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     ORDER BY u.id ASC;`
  );
}

async function createUsuario(payload) {
  requireAdmin();
  const { username, password, nombre_completo, rol_id } = payload || {};
  if (!username || !String(username).trim()) return { ok: false, error: 'Username es obligatorio.' };
  if (!password || String(password).trim().length < 4) return { ok: false, error: 'Password mínimo 4 caracteres.' };

  const exists = await get('SELECT id FROM usuarios WHERE username = ?;', [String(username).trim()]);
  if (exists) return { ok: false, error: 'El usuario ya existe.' };

  const hash = await bcrypt.hash(String(password), 10);
  await run(
    'INSERT INTO usuarios (username, password_hash, nombre_completo, rol_id, avatar_path) VALUES (?, ?, ?, ?, ?);',
    [String(username).trim(), hash, nombre_completo || null, rol_id || null, 'default.png']
  );
  return { ok: true };
}

async function updateUsuario(payload) {
  const session = requireSession();
  const isAdmin = session.nombre_rol === 'Admin';
  const { id, username, nombre_completo, password, rol_id } = payload || {};
  if (!id) return { ok: false, error: 'Usuario inválido.' };
  if (!isAdmin && Number(id) !== Number(session.id)) return { ok: false, error: 'No autorizado.' };

  const target = await get('SELECT * FROM usuarios WHERE id = ?;', [id]);
  if (!target) return { ok: false, error: 'Usuario no encontrado.' };

  const nextUsername = String(username || target.username || '').trim();
  if (!nextUsername) return { ok: false, error: 'Username es obligatorio.' };
  const sameNameOther = await get('SELECT id FROM usuarios WHERE username = ? AND id <> ?;', [nextUsername, id]);
  if (sameNameOther) return { ok: false, error: 'El username ya está en uso.' };

  let nextHash = target.password_hash;
  if (password && String(password).trim()) {
    if (String(password).trim().length < 4) return { ok: false, error: 'Password mínimo 4 caracteres.' };
    nextHash = await bcrypt.hash(String(password), 10);
  }

  const nextRoleId = isAdmin ? (rol_id || target.rol_id || null) : target.rol_id;

  await run(
    `UPDATE usuarios
     SET username = ?, nombre_completo = ?, password_hash = ?, rol_id = ?
     WHERE id = ?;`,
    [nextUsername, nombre_completo || null, nextHash, nextRoleId, id]
  );

  return { ok: true };
}

async function deleteUsuario(id) {
  const session = requireAdmin();
  const targetId = Number(id);
  if (!targetId) return { ok: false, error: 'Usuario inválido.' };
  if (targetId === Number(session.id)) return { ok: false, error: 'No puedes eliminar tu propio usuario en sesión.' };
  await run('DELETE FROM usuarios WHERE id = ?;', [targetId]);
  return { ok: true };
}

async function saveAvatar({ originalName, bytesBase64 }) {
  const session = requireSession();
  if (!bytesBase64) return { ok: false, error: 'Sin archivo.' };

  const { uploadsPath } = getDbPaths();
  const safeName = String(originalName || 'avatar').replace(/[^\w.\-]+/g, '_').slice(0, 80);
  const ext = path.extname(safeName) || '.png';
  const fileName = `avatar_${session.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(uploadsPath, fileName);

  const buffer = Buffer.from(bytesBase64, 'base64');
  fs.writeFileSync(filePath, buffer);

  await run('UPDATE usuarios SET avatar_path = ? WHERE id = ?;', [fileName, session.id]);
  return { ok: true, storedPath: fileName };
}

async function listRoles() {
  requireAdmin();
  return all('SELECT * FROM roles ORDER BY id ASC;');
}

async function updateRolePerms(payload) {
  requireAdmin();
  const { role_id, can_create, can_edit, can_delete, can_report } = payload || {};
  if (!role_id) return { ok: false, error: 'Rol inválido.' };
  await run(
    `UPDATE roles
     SET can_create = ?, can_edit = ?, can_delete = ?, can_report = ?
     WHERE id = ?;`,
    [can_create ? 1 : 0, can_edit ? 1 : 0, can_delete ? 1 : 0, can_report ? 1 : 0, role_id]
  );
  return { ok: true };
}

module.exports = {
  listUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  saveAvatar,
  listRoles,
  updateRolePerms
};
