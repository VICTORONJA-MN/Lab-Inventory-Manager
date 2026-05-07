//backups.js (servicio)
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getDbPaths, persistDb, get } = require('./db');
const { requireAdmin } = require('./auth');

async function exportDb({ dialog }) {
  requireAdmin();
  const { dbPath } = getDbPaths();

  persistDb();

  const res = await dialog.showSaveDialog({
    title: 'Exportar base de datos',
    defaultPath: path.basename(dbPath),
    filters: [{ name: 'SQLite DB', extensions: ['db'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };

  fs.copyFileSync(dbPath, res.filePath);
  return { ok: true, filePath: res.filePath };
}

async function importDb({ dialog }) {
  requireAdmin();
  const { dbPath, dataDir } = getDbPaths();

  const res = await dialog.showOpenDialog({
    title: 'Importar base de datos',
    properties: ['openFile'],
    filters: [{ name: 'SQLite DB', extensions: ['db'] }]
  });
  if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.copyFileSync(res.filePaths[0], dbPath);
  return { ok: true };
}

async function resetSystem({ password }) {
  const session = requireAdmin();

  // Verificar contraseña del usuario en sesión antes de borrar nada
  const row = await get('SELECT password_hash FROM usuarios WHERE id = ?;', [session.id]);
  if (!row) return { ok: false, error: 'Usuario no encontrado.' };

  const valid = await bcrypt.compare(String(password || ''), row.password_hash);
  if (!valid) return { ok: false, error: 'Contraseña incorrecta.' };

  const { dbPath, uploadsPath } = getDbPaths();

  // Borrar base de datos
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Borrar carpeta de uploads recursivamente
  if (fs.existsSync(uploadsPath)) {
    fs.rmSync(uploadsPath, { recursive: true, force: true });
  }

  return { ok: true };
}

module.exports = { exportDb, importDb, resetSystem };