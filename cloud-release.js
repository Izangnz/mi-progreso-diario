/* La publicación del paquete y la activación de Cloud son operaciones distintas. */
(() => {
  const backend = 'https://aeumsxoqlqsfqdfxykwx.supabase.co';
  const authorizedSite = location.origin === 'https://progressmate.app' ||
    (location.origin === 'https://izangnz.github.io' && location.pathname.startsWith('/mi-progreso-diario/'));
  const enabled = () => authorizedSite && window.MPD_SUPABASE?.url === backend &&
    window.MPD_SUPABASE.sync?.enabled === true;
  window.MPDCloudRelease = Object.freeze({backend, enabled});
})();
