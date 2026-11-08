/* Fronteras de datos: el perfil privado nunca alimenta Descubrir.
   Sin migraciones, autenticación, red ni publicación implícita. */
(() => {
  const key = 'mi-progreso-perfil-v1';
  const unavailable = () => { throw Error('Las cuentas y los perfiles públicos todavía no están disponibles.'); };
  window.MPDProfileData = Object.freeze({
    local: Object.freeze({
      key,
      readRaw: () => window.MPDUserStorage.readProfile(),
      writeRaw: (raw, baseline) => window.MPDUserStorage.writeProfile(raw, baseline)
    }),
    // Contrato independiente: nunca devuelve fields, photoId o hábitos locales.
    public: Object.freeze({
      available: false,
      list: () => [],
      publish: unavailable
    }),
    demo: Object.freeze({
      list: () => JSON.parse(JSON.stringify(window.MPDCommunityProfiles || []))
    })
  });
})();
