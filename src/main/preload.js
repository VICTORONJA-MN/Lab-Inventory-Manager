const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld('api', {
  getPaths: () => invoke('app:getPaths'),
  auth: {
    sessionStatus: () => invoke('auth:sessionStatus'),
    login: (payload) => invoke('auth:login', payload),
    logout: () => invoke('auth:logout'),
    bootstrapAdmin: (payload) => invoke('auth:bootstrapAdmin', payload)
  },
  usuarios: {
    list: () => invoke('usuarios:list'),
    create: (payload) => invoke('usuarios:create', payload),
    update: (payload) => invoke('usuarios:update', payload),
    saveAvatar: (payload) => invoke('usuarios:saveAvatar', payload),
    delete: (id) => invoke('usuarios:delete', id)
  },
  roles: {
    list: () => invoke('roles:list'),
    update: (payload) => invoke('roles:update', payload)
  },
  equipos: {
    list: (payload) => invoke('equipos:list', payload),
    get: (id) => invoke('equipos:get', id),
    create: (payload) => invoke('equipos:create', payload),
    update: (payload) => invoke('equipos:update', payload),
    delete: (id) => invoke('equipos:delete', id),
    savePhoto: (payload) => invoke('equipos:savePhoto', payload)
  },
  mantenimientos: {
    list: () => invoke('mantenimientos:list'),
    get: (id) => invoke('mantenimientos:get', id),
    create: (payload) => invoke('mantenimientos:create', payload),
    update: (payload) => invoke('mantenimientos:update', payload),
    delete: (id) => invoke('mantenimientos:delete', id),
    proximos: () => invoke('mantenimientos:proximos')
  },
  backups: {
    exportDb: () => invoke('backups:exportDb'),
    importDb: () => invoke('backups:importDb')
  },
  reportes: {
    generar: (payload) => invoke('reportes:generar', payload),
    getCategorias: () => invoke('reportes:getCategorias')
  }
});

