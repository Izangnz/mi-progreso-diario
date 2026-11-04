# Navegación y perfil local · 0.12.0

Navegación principal: Inicio, Hábitos, Descubrir y Mi perfil. La vista interna `comunidad` conserva su ID para evitar cambios innecesarios; su título y pestaña visibles son Descubrir. Aprendizaje y Podcasts siguen íntegros y accesibles desde Mi perfil → Más recursos, además de los accesos de Inicio existentes.

El perfil se guarda únicamente al pulsar Guardar en `mi-progreso-perfil-v1`, con estructura `{version:1, visibility:"local", fields:{...}, links:[], updatedAt}`. No se publica ni aparece entre los perfiles DEMO. Incluye avatar opcional mediante iniciales o emoji; esta versión no incorpora carga de fotografías. No existen cuentas ni servicios externos.

Se limita la longitud de los campos, se muestra texto mediante textContent y se permiten hasta cinco enlaces HTTPS sin credenciales. Los enlaces usan noopener/noreferrer. Los datos inválidos se conservan y bloquean el guardado. Los errores de cuota mantienen el borrador; se detectan cambios previos al guardado de otra ventana. La actualización PWA protege también el borrador de perfil. Los datos de hábitos, aprendizaje, preferencias y misiones mantienen sus claves y código.

Verificación: `node --test pruebas/audiovisual.test.cjs`. Incluye regresiones, las cuatro pestañas, módulos conservados, búsqueda DEMO, perfil, recuperación, enlaces inseguros, cuota, datos inválidos, conflictos y protección de actualización. La comprobación visual en navegador y Safari/iPhone queda pendiente: el host de navegador del entorno no está disponible.

Publicación desde la copia aislada `/private/tmp/mpd-comunidad`; el directorio original del IDE conserva sus modificaciones preexistentes. La misión se puede revertir con el commit correspondiente, sin borrar las claves de datos locales.
