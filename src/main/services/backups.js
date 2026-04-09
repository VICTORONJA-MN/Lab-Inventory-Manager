const fs = require('fs');
const path = require('path');
const { getDbPaths } = require('./db');
const { requireAdmin } = require('./auth');

async function exportDb({ dialog }) {
  requireAdmin();
  const { dbPath } = getDbPaths();

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

module.exports = { exportDb, importDb };

