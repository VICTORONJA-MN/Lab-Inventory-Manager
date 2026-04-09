const bcrypt = require('bcryptjs');
const { get, run } = require('./db');

let currentSession = null;

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    nombre_completo: row.nombre_completo,
    rol_id: row.rol_id,
    nombre_rol: row.nombre_rol || 'Usuario',
    can_edit: !!row.can_edit,
    can_delete: !!row.can_delete,
    can_create: !!row.can_create,
    can_report: !!row.can_report,
    avatar_path: row.avatar_path
  };
}

async function sessionStatus() {
  const usersCount = await get('SELECT COUNT(*) AS c FROM usuarios;');
  if (currentSession) {
    const row = await get(
      `SELECT u.*, r.nombre_rol, r.can_edit, r.can_delete, r.can_create, r.can_report
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.rol_id
       WHERE u.id = ?`,
      [currentSession.id]
    );
    currentSession = sanitizeUser(row);
  }
  return {
    loggedIn: !!currentSession,
    user: currentSession,
    needsBootstrap: (usersCount?.c ?? 0) === 0
  };
}

async function login({ username, password }) {
  const row = await get(
    `SELECT u.*, r.nombre_rol, r.can_edit, r.can_delete, r.can_create, r.can_report
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     WHERE u.username = ?`,
    [username]
  );
  if (!row) return { ok: false, error: 'Credenciales inválidas.' };
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return { ok: false, error: 'Credenciales inválidas.' };

  currentSession = sanitizeUser(row);
  return { ok: true, user: currentSession };
}

async function logout() {
  currentSession = null;
  return { ok: true };
}

async function bootstrapAdmin({ username, password, nombre_completo }) {
  const usersCount = await get('SELECT COUNT(*) AS c FROM usuarios;');
  if ((usersCount?.c ?? 0) > 0) return { ok: false, error: 'Bootstrap no permitido.' };

  const adminRole = await get('SELECT id FROM roles WHERE nombre_rol = ?;', ['Admin']);
  if (!adminRole) return { ok: false, error: 'Rol Admin no disponible.' };

  const hash = await bcrypt.hash(password, 10);
  await run(
    'INSERT INTO usuarios (username, password_hash, nombre_completo, rol_id, avatar_path) VALUES (?, ?, ?, ?, ?);',
    [username, hash, nombre_completo || null, adminRole.id, 'default.png']
  );

  return { ok: true };
}

function requireSession() {
  if (!currentSession) {
    const err = new Error('No autenticado.');
    err.code = 'UNAUTH';
    throw err;
  }
  return currentSession;
}

function requireAdmin() {
  const s = requireSession();
  if (s.nombre_rol !== 'Admin') {
    const err = new Error('Requiere permisos de Admin.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return s;
}

module.exports = { sessionStatus, login, logout, bootstrapAdmin, requireSession, requireAdmin };

