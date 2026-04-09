export const store = (() => {
  const state = {
    session: null,
    needsBootstrap: false,
    route: 'inicio',
    globalQuery: '',
    inventarioViewMode: 'tabla'
  };

  const listeners = new Set();
  function emit() {
    for (const fn of listeners) fn(get());
  }
  function get() {
    return { ...state };
  }
  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function setSession(session) {
    state.session = session;
    emit();
  }
  function setNeedsBootstrap(v) {
    state.needsBootstrap = !!v;
    emit();
  }
  function setRoute(route) {
    state.route = route;
    emit();
  }
  function setGlobalQuery(q) {
    state.globalQuery = String(q || '');
    emit();
  }
  function setInventarioViewMode(mode) {
    state.inventarioViewMode = mode === 'tarjetas' ? 'tarjetas' : 'tabla';
    emit();
  }

  return { get, subscribe, setSession, setNeedsBootstrap, setRoute, setGlobalQuery, setInventarioViewMode };
})();

