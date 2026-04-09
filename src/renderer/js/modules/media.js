function toFileUrl(absolutePath) {
  if (!absolutePath) return null;
  const normalized = String(absolutePath).replace(/\\/g, '/');
  const encoded = encodeURI(normalized);
  if (encoded.startsWith('/')) return `file://${encoded}`;
  return `file:///${encoded}`;
}

function sanitizeFileName(value) {
  return String(value || '')
    .trim()
    .replace(/^file:\/\//, '')
    .split(/[\\/]/)
    .pop();
}

export function resolveUploadSrc(storedValue) {
  if (!storedValue) return null;
  const value = String(storedValue).trim();
  if (!value) return null;
  if (value.startsWith('file://')) return value;
  if (value.startsWith('/')) return toFileUrl(value);

  const fileName = sanitizeFileName(value);
  if (!fileName || fileName === 'default.png') return null;
  const uploadsPath = window.__APP_PATHS__?.uploadsPath;
  if (!uploadsPath) return null;
  const fullPath = `${String(uploadsPath).replace(/[\\/]$/, '')}/${fileName}`;
  return toFileUrl(fullPath);
}
