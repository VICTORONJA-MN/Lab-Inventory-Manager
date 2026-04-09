const { all, get } = require('./db');
const { requireSession } = require('./auth');
const ExcelJS = require('exceljs');

function requireReportPerm() {
  const s = requireSession();
  if (s.nombre_rol === 'Admin' || s.can_report) return s;
  const err = new Error('No tienes permisos para generar reportes.');
  err.code = 'FORBIDDEN';
  throw err;
}

async function getCategorias() {
  requireReportPerm();
  const rows = await all('SELECT DISTINCT categoria FROM equipos WHERE categoria IS NOT NULL AND categoria != "" ORDER BY categoria;');
  return rows.map(r => r.categoria);
}

async function generar({ desde, hasta, categorias } = {}) {
  requireReportPerm();
  const clauses = [];
  const params = [];

  if (desde) {
    clauses.push('datetime(fecha_registro) >= datetime(?)');
    params.push(desde);
  }
  if (hasta) {
    clauses.push('datetime(fecha_registro) <= datetime(?)');
    params.push(hasta);
  }
  if (categorias && categorias.length > 0) {
    const placeholders = categorias.map(() => '?').join(',');
    clauses.push(`categoria IN (${placeholders})`);
    params.push(...categorias);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await all(
    `SELECT id, nombre, serie, categoria, estado, ubicacion, fecha_registro
     FROM equipos
     ${where}
     ORDER BY datetime(fecha_registro) DESC, id DESC;`,
    params
  );

  // Generar Excel
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Equipos');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Serie', key: 'serie', width: 20 },
    { header: 'Categoría', key: 'categoria', width: 20 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Ubicación', key: 'ubicacion', width: 25 },
    { header: 'Fecha Registro', key: 'fecha_registro', width: 20 }
  ];

  rows.forEach(row => {
    worksheet.addRow({
      id: row.id,
      nombre: row.nombre || '',
      serie: row.serie || '',
      categoria: row.categoria || '',
      estado: row.estado || '',
      ubicacion: row.ubicacion || '',
      fecha_registro: formatDateTime(row.fecha_registro)
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { ok: true, buffer, count: rows.length };
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

module.exports = { generar, getCategorias };

