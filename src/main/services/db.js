const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

let SQLModule;
let dbInstance;

function getDbPaths() {
  const isDev = !app.isPackaged;
  const baseDir = isDev ? process.cwd() : app.getPath('userData');
  const dbPath = path.join(baseDir, 'database.db');
  const uploadsPath = path.join(baseDir, 'uploads');
  return {
    isDev,
    baseDir,
    dbPath,
    uploadsPath,
    userDataDir: baseDir,
    dataDir: baseDir,
    imagesDir: uploadsPath
  };
}

async function ensureDb() {
  if (dbInstance) return dbInstance;

  if (!SQLModule) {
    SQLModule = await initSqlJs();
  }

  const { baseDir, uploadsPath, dbPath } = getDbPaths();
  fs.mkdirSync(baseDir, { recursive: true });
  fs.mkdirSync(uploadsPath, { recursive: true });

  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    dbInstance = new SQLModule.Database(filebuffer);
  } else {
    dbInstance = new SQLModule.Database();
  }

  return dbInstance;
}

function persistDb() {
  if (!dbInstance) return;
  const { dbPath } = getDbPaths();
  const data = dbInstance.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function run(sql, params = []) {
  return (async () => {
    const database = await ensureDb();
    database.run(sql, params);
    const changes = database.getRowsModified();
    const lastIdResult = database.exec('SELECT last_insert_rowid() AS id;');
    const lastID = lastIdResult[0]?.values?.[0]?.[0] ?? 0;
    persistDb();
    return { lastID, changes };
  })();
}

function get(sql, params = []) {
  return (async () => {
    const database = await ensureDb();
    const stmt = database.prepare(sql);
    try {
      if (params && params.length) stmt.bind(params);
      if (!stmt.step()) return undefined;
      return stmt.getAsObject();
    } finally {
      stmt.free();
    }
  })();
}

function all(sql, params = []) {
  return (async () => {
    const database = await ensureDb();
    const stmt = database.prepare(sql);
    try {
      if (params && params.length) stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
  })();
}

async function initDatabase() {
  await ensureDb();
  await run('PRAGMA foreign_keys = ON;');

  await run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_rol VARCHAR(20) UNIQUE NOT NULL,
      can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      can_create INTEGER DEFAULT 0,
      can_report INTEGER DEFAULT 0
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre_completo VARCHAR(100),
      rol_id INTEGER,
      avatar_path TEXT DEFAULT 'default.png',
      FOREIGN KEY (rol_id) REFERENCES roles(id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS equipos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre VARCHAR(100) NOT NULL,
      serie VARCHAR(50),
      categoria VARCHAR(30) NOT NULL,
      estado VARCHAR(20) CHECK(estado IN ('activo', 'mantenimiento', 'baja')),
      foto_url TEXT,
      ubicacion VARCHAR(100),
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
      observaciones TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS mantenimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipo_id INTEGER NOT NULL,
      fecha_proximo DATE NOT NULL,
      estado VARCHAR(20) DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'realizado', 'cancelado', 'pospuesto')),
      fecha_realizado DATE,
      notas TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
    );
  `);

  await run('ALTER TABLE roles ADD COLUMN can_report INTEGER DEFAULT 0;').catch(() => {});

  const rolesCount = await get('SELECT COUNT(*) AS c FROM roles;');
  if ((rolesCount?.c ?? 0) === 0) {
    await run('INSERT INTO roles (nombre_rol, can_edit, can_delete, can_create, can_report) VALUES (?, 1, 1, 1, 1);', ['Admin']);
    await run('INSERT INTO roles (nombre_rol, can_edit, can_delete, can_create, can_report) VALUES (?, 0, 0, 0, 0);', ['Usuario']);
  }

  let adminRole = await get('SELECT id FROM roles WHERE nombre_rol = ?;', ['Admin']);
  if (!adminRole) {
    await run('INSERT INTO roles (nombre_rol, can_edit, can_delete, can_create, can_report) VALUES (?, 1, 1, 1, 1);', ['Admin']);
    adminRole = await get('SELECT id FROM roles WHERE nombre_rol = ?;', ['Admin']);
  }

  let usuarioRole = await get('SELECT id FROM roles WHERE nombre_rol = ?;', ['Usuario']);
  if (!usuarioRole) {
    await run('INSERT INTO roles (nombre_rol, can_edit, can_delete, can_create, can_report) VALUES (?, 0, 0, 0, 0);', ['Usuario']);
    usuarioRole = await get('SELECT id FROM roles WHERE nombre_rol = ?;', ['Usuario']);
  }

  if (adminRole) {
    await run('UPDATE usuarios SET rol_id = ? WHERE username = ? AND rol_id IS NULL;', [adminRole.id, 'admin']).catch(() => {});
  }
  if (usuarioRole) {
    await run('UPDATE usuarios SET rol_id = ? WHERE rol_id IS NULL;', [usuarioRole.id]).catch(() => {});
  }

}
module.exports = { getDbPaths, initDatabase, run, get, all };
