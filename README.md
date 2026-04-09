# SGILC Inventario (Electron + SQLite)

Aplicación de escritorio portable para gestión de inventario, **autónoma**: crea/usa su SQLite en `app.getPath('userData')` sin servidores externos.

## Requisitos (para desarrollo)

- Node.js + npm

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

## Empaquetar

- Windows portable (`.exe`):

```bash
npm run pack:win
```

- Linux AppImage:

```bash
npm run pack:linux
```

## Datos locales (portabilidad)

- **DB**: `.../userData/data/inventario.db`
- **Fotos**: `.../userData/images/`

Las fotos se guardan en `userData/images` y se referencian con el esquema `appdata://images/...` (registrado por la app).

