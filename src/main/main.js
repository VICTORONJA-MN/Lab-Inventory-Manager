const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, getDbPaths } = require('./services/db');
const auth = require('./services/auth');
const equipos = require('./services/equipos');
const usuarios = require('./services/usuarios');
const backups = require('./services/backups');
const reportes = require('./services/reportes');
const mantenimientos = require('./services/mantenimientos');

let mainWindow;
/*
// Para evitar problemas gráficos en Linux y al correr como root )
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-gpu');
  app.disableHardwareAcceleration();
}
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  app.commandLine.appendSwitch('no-sandbox');
}
*/
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer console] ${sourceId}:${line} [${level}] ${message}`);
  });
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[renderer crashed]', details);
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[did-fail-load]', errorCode, errorDescription, validatedURL);
  });

  // --- LÓGICA DE DETECCIÓN DE PRIMER INICIO ---
  let needsBootstrap = false;
  try {
    const listaUsuarios = await usuarios.listUsuarios();
    needsBootstrap = (listaUsuarios.length === 0);
  } catch (err) {
    console.error('[Main] Error al verificar usuarios:', err);
  }

  const preferredIndexPath = path.join(__dirname, 'src/index.html');
  const fallbackIndexPath = path.join(__dirname, '../renderer/index.html');
  const indexPath = fs.existsSync(preferredIndexPath) ? preferredIndexPath : fallbackIndexPath;

  // Cargamos el archivo pasando el estado de bootstrap por query string
  mainWindow.loadFile(indexPath, { 
    query: { bootstrap: needsBootstrap ? 'true' : 'false' } 
  });
  // --------------------------------------------

  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      const html = await mainWindow.webContents.executeJavaScript('document.documentElement.outerHTML');
      console.log('[PAGE HTML]', html.slice(0, 500));
    } catch (err) {
      console.error('[PAGE HTML ERROR]', err);
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
}

async function checkMantenimientosNotificaciones() {
  try {
    const proximos = await mantenimientos.getMantenimientosProximos();
    if (proximos.length > 0) {
      const { Notification } = require('electron');
      if (Notification.isSupported()) {
        const notif = new Notification({
          title: 'Mantenimientos Próximos',
          body: `Hay ${proximos.length} mantenimiento(s) esta semana. Revisa la sección de Mantenimientos.`,
          icon: path.join(__dirname, '../assets/icon.png')
        });
        notif.show();
      }
    }
  } catch (error) {
    console.error('Error checking mantenimientos:', error);
  }
}

app.whenReady().then(async () => {
  const { baseDir, uploadsPath } = getDbPaths();
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

  await initDatabase();
  await createWindow();

  setTimeout(() => {
    checkMantenimientosNotificaciones();
  }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app:getPaths', async () => getDbPaths());
ipcMain.handle('auth:sessionStatus', async () => auth.sessionStatus());
ipcMain.handle('auth:login', async (_evt, payload) => auth.login(payload));
ipcMain.handle('auth:logout', async () => auth.logout());
ipcMain.handle('auth:bootstrapAdmin', async (_evt, payload) => auth.bootstrapAdmin(payload));

ipcMain.handle('usuarios:list', async () => usuarios.listUsuarios());
ipcMain.handle('usuarios:create', async (_evt, payload) => usuarios.createUsuario(payload));
ipcMain.handle('usuarios:update', async (_evt, payload) => usuarios.updateUsuario(payload));
ipcMain.handle('usuarios:delete', async (_evt, payload) => usuarios.deleteUsuario(payload));
ipcMain.handle('usuarios:saveAvatar', async (_evt, payload) => usuarios.saveAvatar(payload));
ipcMain.handle('roles:list', async () => usuarios.listRoles());
ipcMain.handle('roles:update', async (_evt, payload) => usuarios.updateRolePerms(payload));

ipcMain.handle('equipos:list', async (_evt, payload) => equipos.listEquipos(payload));
ipcMain.handle('equipos:get', async (_evt, id) => equipos.getEquipo(id));
ipcMain.handle('equipos:create', async (_evt, payload) => equipos.createEquipo(payload));
ipcMain.handle('equipos:update', async (_evt, payload) => equipos.updateEquipo(payload));
ipcMain.handle('equipos:delete', async (_evt, id) => equipos.deleteEquipo(id));
ipcMain.handle('equipos:savePhoto', async (_evt, payload) => equipos.savePhoto(payload));

ipcMain.handle('mantenimientos:list', async () => mantenimientos.listMantenimientos());
ipcMain.handle('mantenimientos:get', async (_evt, id) => mantenimientos.getMantenimientoById(id));
ipcMain.handle('mantenimientos:create', async (_evt, payload) => mantenimientos.createMantenimiento(payload));
ipcMain.handle('mantenimientos:update', async (_evt, payload) => mantenimientos.updateMantenimiento(payload));
ipcMain.handle('mantenimientos:delete', async (_evt, id) => mantenimientos.deleteMantenimiento(id));
ipcMain.handle('mantenimientos:proximos', async () => mantenimientos.getMantenimientosProximos());

ipcMain.handle('backups:exportDb', async () => backups.exportDb({ dialog }));
ipcMain.handle('backups:importDb', async () => backups.importDb({ dialog }));

ipcMain.handle('reportes:generar', async (_evt, payload) => {
  const res = await reportes.generar(payload);
  if (!res.ok) return res;
  const fileName = `reporte_equipos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const result = await dialog.showSaveDialog(null, {
    title: 'Guardar Reporte Excel',
    defaultPath: fileName,
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  });
  if (result.canceled) return { ok: false, error: 'Cancelado por usuario.' };
  fs.writeFileSync(result.filePath, Buffer.from(res.buffer));
  return { ok: true, count: res.count, filePath: result.filePath };
});

ipcMain.handle('reportes:getCategorias', async () => reportes.getCategorias());
setInterval(checkMantenimientosNotificaciones, 6 * 60 * 60 * 1000);