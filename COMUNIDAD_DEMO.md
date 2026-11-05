# Comunidad · v0.11.0

Prototipo local con cuatro perfiles ficticios, búsqueda sin distinción de acentos y perfiles ampliados mediante un diálogo nativo accesible. Sin cuentas, base de datos, seguimiento ni escrituras de almacenamiento. Los enlaces de ejemplo apuntan a example.com; no representan personas ni redes reales.

Los registros están separados en comunidad-datos.js. Cada registro contiene id, name, initials, age, city, interests, description, project, pitch, story, experience y links (label/url). Para perfiles reales será necesario diseñar consentimiento y gestión de datos; este prototipo no incorpora esos servicios.

Verificación: ejecutar `node --test pruebas/audiovisual.test.cjs` (42 pruebas). Incluye navegación por cinco pestañas, hábitos, aprendizaje, búsqueda, diálogo, retorno de foco, enlaces seguros y caché PWA. La versión de caché y la versión visible son 0.11.0. No se ha podido realizar comprobación visual en Safari/iPhone: el servicio de navegador del entorno no estaba disponible.

La publicación se prepara desde una copia aislada de origin/main para preservar los cambios locales preexistentes del directorio de trabajo original.

## Actualización v0.14.0

Descubrir comienza vacío. Los ejemplos ficticios se activan explícitamente con Ver ejemplos DEMO; no son cuentas registradas. La separación de datos y el plan para usuarios reales están documentados en BETA_COMUNIDAD.md. Las instrucciones y cifras anteriores describen versiones históricas.
