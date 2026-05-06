// theme.js
// Manejo de tema claro/oscuro para SGILC

const THEME_KEY = 'sgilc_theme';

const themes = {
  dark: {
    '--bg': '#090a0f',
    '--panel': 'rgba(20,24,32,0.95)',
    '--panel2': 'rgba(15,18,25,0.95)',
    '--text': '#e7eaf0',
    '--muted': '#98a0b2',
    '--primary': '#c2c6d5',
    '--danger': '#ef6f6f',
    '--ok': '#7ec38a',
    '--border': 'rgba(0,0,0,.12)',
    '--shadow': '0 24px 60px rgba(0,0,0,.28)',
    '--sidebarW': '260px',
    '--headerH': '66px',
    '--radius': '20px',
    '--radius2': '14px',
    '--font': "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    '--surface': 'rgba(255,255,255,.04)',
    '--surface-hover': 'rgba(255,255,255,.08)',
    '--surface-active': 'rgba(255,255,255,.09)',
    '--input-bg': 'rgba(255,255,255,.05)',
    '--nav-bg': 'rgba(18,22,32,.96)',
    '--header-bg': 'rgba(18,22,30,.86)',
    '--modal-bg': 'rgba(14,18,27,.92)',
    '--body-bg': 'linear-gradient(180deg, #11131a 0%, #08090f 100%)',
  },
  light: {
    '--bg': '#f0f2f7',
    '--panel': 'rgba(255,255,255,0.98)',
    '--panel2': 'rgba(244,246,251,0.98)',
    '--text': '#1a1d27',
    '--muted': '#6b7280',
    '--primary': '#3b4a6b',
    '--danger': '#dc2626',
    '--ok': '#16a34a',
    '--border': 'rgba(0,0,0,.10)',
    '--shadow': '0 24px 60px rgba(0,0,0,.10)',
    '--sidebarW': '260px',
    '--headerH': '66px',
    '--radius': '20px',
    '--radius2': '14px',
    '--font': "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    '--surface': 'rgba(0,0,0,.03)',
    '--surface-hover': 'rgba(0,0,0,.06)',
    '--surface-active': 'rgba(0,0,0,.07)',
    '--input-bg': 'rgba(0,0,0,.04)',
    '--nav-bg': 'rgba(255,255,255,.98)',
    '--header-bg': 'rgba(255,255,255,.92)',
    '--modal-bg': 'rgba(250,251,255,.97)',
    '--body-bg': 'linear-gradient(180deg, #eef0f7 0%, #e8ebf4 100%)',
  }
};

export function setTheme(theme) {
  const vars = themes[theme] || themes.dark;
  Object.entries(vars).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function applyThemeOnLoad() {
  setTheme(getTheme());
}