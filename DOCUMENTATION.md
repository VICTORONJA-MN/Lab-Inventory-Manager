# Kanri — Documentación Técnica
### Sistema de Gestión de Inventario para el Laboratorio de Cómputo I

---

## Descripción General

**Kanri** (管理, "gestión" en japonés) es una aplicación de escritorio desarrollada como proyecto de servicio social para digitalizar y centralizar el control del inventario del Laboratorio de Cómputo I. El sistema permite registrar, consultar, editar y dar seguimiento a los equipos, software y recursos del laboratorio, sustituyendo el control manual en papel o en hojas de cálculo desconectadas.

**Problema que resuelve:** Los laboratorios de cómputo institucionales suelen carecer de un sistema unificado para llevar el historial de sus equipos: estado operativo, mantenimientos, ubicación y responsables. Kanri centraliza esta información en una base de datos local, sin depender de conexión a internet ni de servidores externos, lo que la hace adecuada para entornos con infraestructura limitada.

**Características principales:**
- Inventario de equipos con foto, categoría, estado y ubicación
- Registro y seguimiento de mantenimientos programados con alertas
- Generación de reportes exportables en formato Excel (.xlsx)
- Gestión de usuarios con roles y permisos granulares
- Backup y restauración de la base de datos
- Interfaz de escritorio nativa para Windows con soporte potencial para Linux

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime de escritorio | Electron | 30.5.1 |
| Entorno de ejecución | Node.js | 25.9.0 |
| Base de datos | sql.js (SQLite compilado a WebAssembly) | 1.14.1 |
| Hash de contraseñas | bcryptjs | 2.4.3 |
| Generación de Excel | ExcelJS | 4.4.0 |
| Empaquetado | electron-builder | 24.13.3 |
| Frontend | JavaScript Vanilla (ES Modules) | — |
| Estilos | CSS puro con variables CSS | — |
| Lenguaje principal | JavaScript (CommonJS en main, ESM en renderer) | — |

**Sin frameworks de frontend.** La interfaz se construye enteramente con JavaScript Vanilla usando un sistema de creación de elementos DOM propio (`dom.js`), sin React, Vue ni Angular.

---

## 2. Requisitos del Sistema

### Requisitos de ejecución (usuario final)
- **Sistema operativo:** Windows 10 / Windows 11 (64-bit)
- **Espacio en disco:** ~150 MB para la app empaquetada
- **RAM:** mínimo 256 MB disponibles
- **Conexión a internet:** No requerida

### Requisitos de desarrollo
- **Node.js:** v25.9.0 o superior
- **npm:** incluido con Node.js
- **Sistema operativo:** Windows 10/11 o Linux (para compilar)

### Instalación de dependencias de desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/VICTORONJA-MN/Lab-Inventory-Manager
cd Lab-Inventory-Manager

# Instalar dependencias
npm install
```

### Dependencias de producción (`dependencies`)

```json
{
  "bcryptjs": "^2.4.3",
  "exceljs": "^4.4.0",
  "sql.js": "^1.14.1"
}
```

### Dependencias de desarrollo (`devDependencies`)

```json
{
  "electron": "^30.5.1",
  "electron-builder": "^24.13.3"
}
```

---

## 3. Arquitectura de Software

### Patrón general

Kanri sigue la arquitectura estándar de Electron: **dos procesos aislados** que se comunican mediante IPC (Inter-Process Communication).

```
┌─────────────────────────────────────────────────────────────┐
│                      PROCESO PRINCIPAL (main)               │
│                                                             │
│  main.js ──► initDatabase() ──► BrowserWindow               │
│      │                                                      │
│      ├── services/auth.js       (autenticación y sesión)    │
│      ├── services/db.js         (SQLite en memoria)         │
│      ├── services/equipos.js    (CRUD de equipos)           │
│      ├── services/usuarios.js   (CRUD de usuarios)          │
│      ├── services/mantenimientos.js                         │
│      ├── services/backups.js    (export/import/reset)       │
│      └── services/reportes.js  (generación de Excel)        │
│                                                             │
│  ipcMain.handle('canal', handler)                           │
└────────────────────────┬────────────────────────────────────┘
                         │  IPC (contextBridge)
                         │  Solo canales permitidos
┌────────────────────────▼────────────────────────────────────┐
│                    PRELOAD (preload.js)                     │
│  Puente seguro — expone window.api al renderer              │
│  contextIsolation: true │ sandbox: true │ nodeIntegration: false │
└────────────────────────┬────────────────────────────────────┘
                         │  window.api.*
┌────────────────────────▼────────────────────────────────────┐
│                   PROCESO RENDERER (renderer)               │
│                                                             │
│  index.html ──► app.js ──► bootstrap()                      │
│                    │                                        │
│                    ├── authView.js   (login / bootstrap)    │
│                    └── shellView.js  (shell principal)      │
│                              │                              │
│                    ┌─────────▼───────────┐                  │
│                    │   views/            │                  │
│                    │   inicio.js         │                  │
│                    │   inventario.js     │                  │
│                    │   mantenimientos.js │                  │
│                    │   reportes.js       │                  │
│                    │   backups.js        │                  │
│                    │   configuracion.js  │                  │
│                    │   perfil.js         │                  │
│                    └─────────────────────┘                  │
│                                                             │
│  Módulos de soporte:                                        │
│  dom.js │ modal.js │ notify.js │ store.js                   │
│  media.js │ loader.js │ theme.js                            │
└─────────────────────────────────────────────────────────────┘
```

### Patrón de servicios

El proceso principal organiza la lógica de negocio en módulos de servicio independientes. Cada servicio tiene responsabilidad única y accede a la base de datos a través de las funciones `run`, `get` y `all` expuestas por `db.js`.

### Patrón de estado en el renderer

El renderer usa un store centralizado (`store.js`) de estado mínimo en memoria: sesión del usuario, ruta activa, query de búsqueda global y modo de vista del inventario. No hay reactividad automática — cada vista se re-renderiza explícitamente cuando el estado cambia.

---

## 4. Estructura de Directorios

```
Kanri/
├── assets/
│   ├── icon.ico                    # Ícono para el ejecutable Windows
│   ├── icon.png                    # Ícono en PNG
│   ├── mona.gif                    # GIF animado para notificaciones
│   ├── añadir.png
│   ├── dashboard.png
│   ├── generar_reportes.png
│   ├── gestion_usurios_roles.png
│   ├── importar_exportar_db.png
│   ├── login.png
│   ├── mantenimientos.png
│   ├── modo_tabla.png
│   ├── modo_tajetas.png
│   ├── perfil.png
│   ├── reporte.png
│   └── .gitkeep
│
├── src/
│   ├── main/
│   │   ├── main.js                 # Punto de entrada, BrowserWindow, handlers IPC
│   │   ├── preload.js              # Puente seguro entre main y renderer
│   │   └── services/
│   │       ├── auth.js             # Autenticación y gestión de sesión
│   │       ├── backups.js          # Export, import y reset del sistema
│   │       ├── db.js               # Inicialización y operaciones de SQLite
│   │       ├── equipos.js          # CRUD de equipos
│   │       ├── mantenimientos.js   # CRUD de mantenimientos
│   │       ├── reportes.js         # Generación de reportes Excel
│   │       └── usuarios.js         # CRUD de usuarios y roles
│   │
│   └── renderer/
│       ├── index.html              # Punto de entrada del renderer + splash screen
│       ├── styles/
│       │   └── app.css             # Estilos globales con sistema de variables CSS
│       └── js/
│           ├── app.js              # Bootstrap del renderer
│           ├── authView.js         # Vista de login y primer usuario
│           ├── dom.js              # Utilidades de creación de elementos DOM
│           ├── loader.js           # Overlay de carga
│           ├── media.js            # Resolución de rutas de imágenes
│           ├── modal.js            # Sistema de modales
│           ├── notify.js           # Sistema de notificaciones toast
│           ├── shellView.js        # Shell principal (sidebar, header, navegación)
│           ├── store.js            # Estado global del renderer
│           ├── theme.js            # Gestión de tema claro/oscuro
│           └── modules/
│               └── views/
│                   ├── backups.js
│                   ├── configuracion.js
│                   ├── inicio.js
│                   ├── inventario.js
│                   ├── mantenimientos.js
│                   ├── perfil.js
│                   └── reportes.js
│
├── dist/                           # Salida del empaquetado (generado por electron-builder)
├── uploads/                        # Fotos y avatares (solo en desarrollo)
├── database.db                     # Base de datos SQLite (solo en desarrollo)
├── package.json
├── package-lock.json
├── .gitignore
├── LICENSE
└── README.md
```
Nota sobre rutas en producción: Al empaquetar, src/ queda dentro del archivo .asar. Los assets de assets/ se copian a resources/assets/ fuera del asar mediante extraResources en electron-builder. En producción, uploads/ y database.db viven en %APPDATA%\kanri\.

**Nota sobre rutas en producción:** Al empaquetar, `src/` queda dentro del archivo `.asar`. Los assets de `assets/` se copian a `resources/assets/` fuera del asar mediante `extraResources` en `electron-builder`, lo que permite acceder a ellos desde el proceso principal con `process.resourcesPath`.

---

## 5. Modelado de Base de Datos

### Motor

SQLite gestionado por **sql.js** (compilado a WebAssembly). La base de datos vive íntegramente **en memoria RAM** durante la ejecución y se serializa al disco como archivo binario (`database.db`) solo al finalizar operaciones de escritura. Esto elimina el overhead de I/O en lecturas pero requiere llamar explícitamente a `persistDb()` después de cada escritura.

### Ubicación del archivo

| Modo | Ruta |
|---|---|
| Desarrollo | `{raíz del proyecto}/database.db` |
| Producción | `%APPDATA%\kanri\database.db` (Windows) |

### Diagrama Entidad-Relación

```
┌──────────────┐          ┌──────────────────┐
│    roles     │          │    usuarios      │
├──────────────┤          ├──────────────────┤
│ id (PK)      │◄─────────│ id (PK)          │
│ nombre_rol   │  1     N │ username         │
│ can_edit     │          │ password_hash    │
│ can_delete   │          │ nombre_completo  │
│ can_create   │          │ rol_id (FK)      │
│ can_report   │          │ avatar_path      │
└──────────────┘          └──────────────────┘

┌──────────────────────┐          ┌─────────────────────────┐
│       equipos        │          │     mantenimientos      │
├──────────────────────┤          ├─────────────────────────┤
│ id (PK)              │◄─────────│ id (PK)                 │
│ nombre               │  1     N │ equipo_id (FK)          │
│ serie                │          │ fecha_proximo           │
│ categoria            │          │ estado                  │
│ estado               │          │ fecha_realizado         │
│ foto_url             │          │ notas                   │
│ ubicacion            │          │ fecha_creacion          │
│ fecha_registro       │          └─────────────────────────┘
│ observaciones        │
└──────────────────────┘
```

### Diccionario de Datos

#### Tabla `roles`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Identificador único del rol |
| nombre_rol | VARCHAR(20) | UNIQUE, NOT NULL | Nombre del rol (`Admin`, `Usuario`) |
| can_edit | INTEGER | DEFAULT 0 | Permiso para editar equipos (0/1) |
| can_delete | INTEGER | DEFAULT 0 | Permiso para eliminar equipos (0/1) |
| can_create | INTEGER | DEFAULT 0 | Permiso para crear equipos (0/1) |
| can_report | INTEGER | DEFAULT 0 | Permiso para generar reportes (0/1) |

**Registros predeterminados:** `Admin` (todos los permisos en 1) y `Usuario` (todos los permisos en 0, configurables).

#### Tabla `usuarios`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Identificador único del usuario |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Nombre de usuario para login |
| password_hash | TEXT | NOT NULL | Hash bcrypt de la contraseña (salt rounds: 10) |
| nombre_completo | VARCHAR(100) | — | Nombre completo del usuario |
| rol_id | INTEGER | FK → roles.id | Rol asignado al usuario |
| avatar_path | TEXT | DEFAULT 'default.png' | Nombre del archivo de avatar en uploads/ |

#### Tabla `equipos`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Identificador único del equipo |
| nombre | VARCHAR(100) | NOT NULL | Nombre descriptivo del equipo |
| serie | VARCHAR(50) | — | Número de serie del equipo |
| categoria | VARCHAR(30) | NOT NULL | Categoría (ej: PC, Monitor, Impresora) |
| estado | VARCHAR(20) | CHECK IN ('activo','mantenimiento','baja') | Estado operativo del equipo |
| foto_url | TEXT | — | Nombre del archivo de foto en uploads/ |
| ubicacion | VARCHAR(100) | — | Ubicación física dentro del laboratorio |
| fecha_registro | DATETIME | DEFAULT CURRENT_TIMESTAMP | Fecha y hora de registro |
| observaciones | TEXT | — | Notas adicionales sobre el equipo |

#### Tabla `mantenimientos`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Identificador único del mantenimiento |
| equipo_id | INTEGER | FK → equipos.id ON DELETE CASCADE | Equipo al que pertenece |
| fecha_proximo | DATE | NOT NULL | Fecha programada del mantenimiento |
| estado | VARCHAR(20) | CHECK IN ('pendiente','realizado','cancelado','pospuesto') | Estado del mantenimiento |
| fecha_realizado | DATE | — | Fecha en que se realizó (si aplica) |
| notas | TEXT | — | Observaciones del mantenimiento |
| fecha_creacion | DATETIME | DEFAULT CURRENT_TIMESTAMP | Fecha de creación del registro |

---

## 6. Documentación de la API IPC

Kanri no tiene una API HTTP. La comunicación entre renderer y proceso principal se realiza mediante **Electron IPC** a través de `window.api.*` expuesto por el preload. Todos los canales usan `ipcMain.handle` / `ipcRenderer.invoke` (asíncronos, basados en Promise).

### Convención de respuesta

Las operaciones de escritura retornan siempre un objeto con la forma:
```js
{ ok: true }                          // Éxito
{ ok: false, error: 'Mensaje' }       // Error controlado
```

---

### Módulo `app`

| Canal IPC | Método window.api | Parámetros | Respuesta | Descripción |
|---|---|---|---|---|
| `app:getPaths` | `api.getPaths()` | — | `{ dbPath, uploadsPath, baseDir, ... }` | Rutas del sistema de archivos |
| `app:reload` | `api.app.reload()` | — | — | Recarga la ventana |
| `app:getAssetsPath` | `api.getAssetsPath()` | — | `string` (ruta absoluta) | Ruta a la carpeta assets |

---

### Módulo `auth`

| Canal IPC | Método window.api | Parámetros | Respuesta | Descripción |
|---|---|---|---|---|
| `auth:sessionStatus` | `api.auth.sessionStatus()` | — | `{ loggedIn, user, needsBootstrap }` | Estado actual de sesión |
| `auth:login` | `api.auth.login(payload)` | `{ username, password }` | `{ ok, user? }` | Iniciar sesión |
| `auth:logout` | `api.auth.logout()` | — | `{ ok }` | Cerrar sesión |
| `auth:bootstrapAdmin` | `api.auth.bootstrapAdmin(payload)` | `{ username, password, nombre_completo }` | `{ ok }` | Crear primer administrador |

---

### Módulo `usuarios`

Requiere sesión activa. Las operaciones de gestión requieren rol `Admin`.

| Canal IPC | Método window.api | Parámetros | Respuesta | Descripción |
|---|---|---|---|---|
| `usuarios:list` | `api.usuarios.list()` | — | `Array<Usuario>` | Lista todos los usuarios con su rol |
| `usuarios:create` | `api.usuarios.create(payload)` | `{ username, password, nombre_completo, rol_id }` | `{ ok }` | Crear usuario |
| `usuarios:update` | `api.usuarios.update(payload)` | `{ id, username, nombre_completo, password?, rol_id }` | `{ ok }` | Actualizar usuario |
| `usuarios:delete` | `api.usuarios.delete(id)` | `id: number` | `{ ok }` | Eliminar usuario |
| `usuarios:saveAvatar` | `api.usuarios.saveAvatar(payload)` | `{ originalName, bytesBase64 }` | `{ ok, storedPath }` | Guardar avatar en disco |

---

### Módulo `roles`

Requiere rol `Admin`.

| Canal IPC | Método window.api | Parámetros | Respuesta | Descripción |
|---|---|---|---|---|
| `roles:list` | `api.roles.list()` | — | `Array<Rol>` | Lista todos los roles |
| `roles:update` | `api.roles.update(payload)` | `{ role_id, can_create, can_edit, can_delete, can_report }` | `{ ok }` | Actualizar permisos del rol |

---

### Módulo `equipos`

Requiere sesión activa. Escrituras requieren permiso correspondiente.

| Canal IPC | Método window.api | Parámetros | Respuesta | Descripción |
|---|---|---|---|---|
| `equipos:list` | `api.equipos.list({ q })` | `{ q?: string }` | `Array<Equipo>` | Listar equipos, con búsqueda opcional |
| `equipos:get` | `api.equipos.get(id)` | `id: number` | `Equipo` | Obtener un equipo por ID |
| `equipos:create` | `api.equipos.create(payload)` | `{ nombre, serie, categoria, estado, foto_url, ubicacion, observaciones, fecha_mantenimiento? }` | `{ ok, id }` | Crear equipo |
| `equipos:update` | `api.equipos.update(payload)` | mismo que create + `id` | `{ ok }` | Actualizar equipo |
| `equipos:delete` | `api.equipos.delete(id)` | `id: number` | `{ ok }` | Eliminar equipo |
| `equipos:savePhoto` | `api.equipos.savePhoto(payload)` | `{ equipoId, originalName, bytesBase64 }` | `{ ok, storedPath }` | Guardar foto en disco |

---

### Módulo `mantenimientos`

Requiere rol `Admin`.

| Canal IPC | Método window.api | Parámetros | Respuesta | Descripción |
|---|---|---|---|---|
| `mantenimientos:list` | `api.mantenimientos.list()` | — | `Array<Mantenimiento>` | Lista todos los mantenimientos con nombre de equipo |
| `mantenimientos:get` | `api.mantenimientos.get(id)` | `id: number` | `Mantenimiento` | Obtener mantenimiento por ID |
| `mantenimientos:create` | `api.mantenimientos.create(payload)` | `{ equipo_id, fecha_proximo, estado }` | `{ ok }` | Crear mantenimiento |
| `mantenimientos:update` | `api.mantenimientos.update(payload)` | `{ id, fecha_proximo, estado, fecha_realizado? }` | `{ ok }` | Actualizar mantenimiento |
| `mantenimientos:delete` | `api.mantenimientos.delete(id)` | `id: number` | `{ ok }` | Eliminar mantenimiento |
| `mantenimientos:proximos` | `api.mantenimientos.proximos()` | — | `Array<Mantenimiento>` | Mantenimientos pendientes en los próximos 7 días |

---

### Módulo `backups`

Requiere rol `Admin`.

| Canal IPC | Método window.api | Parámetros | Respuesta | Descripción |
|---|---|---|---|---|
| `backups:exportDb` | `api.backups.exportDb()` | — | `{ ok, filePath? }` | Exportar DB a archivo elegido por el usuario |
| `backups:importDb` | `api.backups.importDb()` | — | `{ ok }` | Importar DB desde archivo elegido por el usuario |
| `system:reset` | `api.system.reset(payload)` | `{ password }` | `{ ok }` | Verificar contraseña, borrar DB + uploads y cerrar la app |

---

### Módulo `reportes`

Requiere sesión con permiso `can_report` o rol `Admin`.

| Canal IPC | Método window.api | Parámetros | Respuesta | Descripción |
|---|---|---|---|---|
| `reportes:generar` | `api.reportes.generar(payload)` | `{ desde?, hasta?, categorias? }` | `{ ok, buffer, count }` | Generar reporte Excel en memoria |
| `reportes:getCategorias` | `api.reportes.getCategorias()` | — | `Array<string>` | Obtener categorías únicas de equipos |

---

## 7. Variables de Entorno y Configuración

Kanri **no utiliza variables de entorno** ni archivos de configuración externos (`.env`, `config.json`, etc.). Toda la configuración es interna al código.

### Valores de configuración relevantes

| Configuración | Valor | Ubicación |
|---|---|---|
| Ruta DB en desarrollo | `process.cwd()/database.db` | `db.js → getDbPaths()` |
| Ruta DB en producción | `app.getPath('userData')/database.db` | `db.js → getDbPaths()` |
| Ruta uploads | `{baseDir}/uploads/` | `db.js → getDbPaths()` |
| Ruta assets empaquetados | `process.resourcesPath/assets/` | `main.js → app:getAssetsPath` |
| Salt rounds bcrypt | 10 | `auth.js`, `usuarios.js` |
| Intervalo notificaciones | 6 horas | `main.js → setInterval` |
| Ventana de mantenimientos próximos | 7 días | `mantenimientos.js → getMantenimientosProximos` |
| Duración splash screen | 2200 ms | `index.html` |

---

## 8. Flujo de Control y Lógica de Negocio

### Flujo de arranque

```
app.whenReady()
    │
    ├── Crear directorios (baseDir, uploads) si no existen
    ├── initDatabase()
    │       ├── ensureDb() → cargar sql.js WASM → leer database.db del disco
    │       ├── Crear tablas si no existen (CREATE TABLE IF NOT EXISTS)
    │       ├── Insertar roles predeterminados si la tabla está vacía
    │       └── persistDb() → una sola escritura al disco al terminar
    │
    ├── createWindow()
    │       ├── Verificar si hay usuarios → determinar needsBootstrap
    │       ├── loadFile(index.html, { query: { bootstrap } })
    │       └── mainWindow.show() en ready-to-show
    │
    └── setTimeout(checkMantenimientosNotificaciones, 5000)
```

### Flujo de autenticación

```
Renderer: app.js → bootstrap()
    │
    ├── api.auth.sessionStatus()
    │       ├── needsBootstrap = true  →  renderAuth (modo bootstrap)
    │       │       └── Formulario de creación del primer admin
    │       │               └── api.auth.bootstrapAdmin() → crear usuario Admin
    │       │
    │       └── needsBootstrap = false
    │               ├── loggedIn = false  →  renderAuth (modo login)
    │               │       └── api.auth.login() → bcrypt.compare → currentSession
    │               │
    │               └── loggedIn = true  →  renderShell()
```

### Flujo de persistencia de datos

```
Operación de escritura (create/update/delete)
    │
    ├── run(sql, params)         ← modifica DB en memoria RAM (via WASM)
    │       └── NO escribe al disco
    │
    └── persistDb()              ← serializa DB completa → escribe database.db en disco
            └── Una sola escritura por operación de usuario
```

### Verificación de permisos

Cada función de servicio verifica permisos antes de ejecutar:

```
requireSession()     → lanza error UNAUTH si no hay sesión
requireAdmin()       → lanza error FORBIDDEN si el rol no es Admin
requirePerm(action)  → Admin siempre pasa; otros roles verifican can_create/can_edit/can_delete
```

---

## 9. Manual de Despliegue e Instalación

### Modo desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Ejecutar en modo desarrollo sin sandbox (Linux/root)
npm run dev
```

La base de datos se crea automáticamente en la raíz del proyecto al primer arranque.

### Compilar para producción (Windows portable)

```bash
npm run pack:win
```

Genera el ejecutable en `dist/Kanri*.exe` como aplicación portable (sin instalador). El usuario puede ejecutarla directamente sin instalar nada.

### Compilar para Linux

```bash
npm run pack:linux
```

Genera un archivo `.AppImage` en `dist/`.

### Compilar sin empaquetar (inspección)

```bash
npm run pack:dir
```

Genera la app desempaquetada en `dist/` para inspeccionar su estructura.

### Datos de usuario en producción

Al ejecutar el `.exe` por primera vez, la app crea automáticamente:

```
%APPDATA%\kanri\
    ├── database.db      # Base de datos SQLite
    └── uploads\         # Fotos de equipos y avatares de usuarios
```

**Estos archivos persisten al cerrar o desinstalar la app.** Para limpiar completamente, usar la función "Borrar sistema" dentro de la app o eliminar manualmente la carpeta `%APPDATA%\kanri\`.

---

## 10. Protocolos de Seguridad y Validaciones

### Seguridad del proceso Electron

| Medida | Configuración | Efecto |
|---|---|---|
| Context Isolation | `contextIsolation: true` | El renderer no puede acceder a APIs de Node.js directamente |
| No Node Integration | `nodeIntegration: false` | El renderer no puede usar `require()` |
| Sandbox | `sandbox: true` | El proceso renderer corre en sandbox de Chromium |
| Preload controlado | `contextBridge.exposeInMainWorld` | Solo los canales explícitamente expuestos son accesibles |

### Seguridad de autenticación

- Las contraseñas se almacenan como hashes **bcrypt con salt rounds 10**. Nunca se almacena texto plano.
- La sesión existe únicamente en memoria del proceso principal (`currentSession` en `auth.js`). No se persiste en disco ni en cookies.
- Al cerrar la app, la sesión se pierde automáticamente.
- El reset del sistema requiere verificación de contraseña del usuario administrador en sesión mediante `bcrypt.compare` antes de ejecutar cualquier operación destructiva.

### Validaciones de negocio

| Validación | Ubicación |
|---|---|
| Username único | `usuarios.js → createUsuario`, `updateUsuario` |
| Password mínimo 4 caracteres | `usuarios.js`, `auth.js → bootstrapAdmin` |
| Bootstrap solo si no hay usuarios | `auth.js → bootstrapAdmin` |
| Estado de equipo restringido a valores válidos | `db.js` (CHECK constraint en SQLite) |
| Estado de mantenimiento restringido | `db.js` (CHECK constraint en SQLite) |
| No eliminar propio usuario en sesión | `usuarios.js → deleteUsuario` |
| Equipo debe existir para crear mantenimiento | `mantenimientos.js → createMantenimiento` |
| Foreign keys habilitadas | `db.js → PRAGMA foreign_keys = ON` |
| Sanitización de nombres de archivo | `equipos.js → normalizeStoredFileName`, `savePhoto` |

---

## 11. Pruebas

Kanri **no cuenta con pruebas unitarias ni de integración automatizadas** en su versión actual. Las pruebas realizadas durante el desarrollo fueron manuales, verificando los flujos principales de la aplicación.

### Flujos verificados manualmente

- Creación del primer administrador (bootstrap)
- Login y logout
- CRUD completo de equipos (crear, editar, eliminar, buscar, ver detalle)
- Carga y visualización de fotos de equipos
- CRUD de mantenimientos y alertas de mantenimientos próximos
- Creación y gestión de usuarios con diferentes roles
- Configuración de permisos del rol Usuario
- Generación de reportes Excel con filtros de fecha y categoría
- Exportación e importación de la base de datos
- Reset del sistema con verificación de contraseña
- Cambio de tema claro/oscuro
- Edición de perfil y carga de avatar

### Recomendación para pruebas futuras

Para una versión futura se recomienda implementar pruebas con **Vitest** o **Jest** para los servicios del proceso principal (especialmente `db.js`, `auth.js` y `equipos.js`), ya que son módulos de Node.js puros sin dependencia de la ventana de Electron.

---

## 12. Gestión de Errores y Logs

### Gestión de errores

Los errores se manejan en dos niveles:

**Proceso principal:** Los servicios lanzan errores con códigos específicos que el handler IPC captura y retorna como respuesta controlada:

```js
// Códigos de error internos
err.code = 'UNAUTH'     // No hay sesión activa
err.code = 'FORBIDDEN'  // Sin permisos suficientes
```

Los handlers IPC en `main.js` no tienen try/catch global — los errores no controlados se propagan y Electron los registra en la consola del proceso principal.

**Renderer:** Cada vista maneja errores de forma local mostrando notificaciones toast (`error()`, `warning()`) al usuario. No hay pantalla de error global salvo el fallback en `app.js`:

```js
catch (error) {
  root.innerHTML = `<h1>Error al iniciar</h1><pre>${String(error)}</pre>`;
}
```

### Sistema de logs

Kanri **no implementa un sistema de logs persistente**. Los eventos se registran únicamente en la consola del proceso principal mediante `console.error` y `console.log`:

| Evento | Nivel |
|---|---|
| Crash del renderer | `console.error('[renderer crashed]')` |
| Fallo de carga de página | `console.error('[did-fail-load]')` |
| Error al verificar usuarios en arranque | `console.error('[Main]')` |
| Error en notificaciones de mantenimiento | `console.error` |

Para ver estos logs en producción se requiere ejecutar el `.exe` desde una terminal, o implementar en el futuro un sistema de logs en archivo usando la ruta `app.getPath('logs')`.

---

## 13. Guía de Mantenimiento y Escalabilidad

### Agregar una nueva sección/vista

1. Crear `src/renderer/js/modules/views/nueva-seccion.js` con la función `export async function renderNuevaSeccion({ root })`
2. Importarla en `shellView.js` y agregar la ruta al array `routes`
3. Agregar el ícono SVG correspondiente en el objeto `routeIcons` de `shellView.js`
4. Agregar el caso en `renderMain()` de `shellView.js`

### Agregar un nuevo canal IPC

1. Crear o modificar el servicio correspondiente en `src/main/services/`
2. Agregar `ipcMain.handle('modulo:accion', handler)` en `main.js`
3. Exponer el canal en `preload.js` dentro del objeto correspondiente
4. Consumir desde el renderer con `window.api.modulo.accion()`

### Agregar un nuevo campo a la base de datos

Agregar la columna con `ALTER TABLE` en `initDatabase()` usando `.catch(() => {})` para que no falle si ya existe (patrón ya establecido en el código para `can_report`).

### Migrar de sql.js a better-sqlite3

Para mejorar el rendimiento (5-10x más rápido, API síncrona, sin WASM), el candidato de migración es `better-sqlite3`. El cambio requiere:
- Reemplazar `initSqlJs()` por `new Database(dbPath)`
- Eliminar `persistDb()` (better-sqlite3 escribe directamente al disco)
- Convertir las funciones `run`, `get`, `all` a síncronas
- Ajustar `electron-builder` para compilar el módulo nativo con `npmRebuild: true`

### Soporte para Linux

La app es compatible con Linux sin cambios de código. Solo se requiere:
- Cambiar el target en `package.json` a `AppImage` o `deb`
- Si se ejecuta como root, descomentar el bloque `--no-sandbox` en `main.js`

---

*Documentación generada para Kanri v0.1.0 — Autor: @VICTORONJA-MN — Licencia MIT*