# Mi perfil y fotografía privada · 0.13.0

La navegación principal sigue siendo Inicio, Hábitos, Descubrir y Mi perfil. Mi perfil muestra una tarjeta personal y un estado vacío que invita a completarlo. Editar perfil abre una vista independiente; guardar actualiza la tarjeta y cancelar descarta el borrador. Volver a entrar en la pestaña muestra la tarjeta y mantiene el borrador recuperable desde Editar perfil.

Se añade ocupación y fotografía opcional. El archivo se selecciona desde el dispositivo (fototeca incluida), admitiendo JPEG, PNG o WebP hasta 10 MB. Se recorta al centro a un cuadrado, se comprime a JPEG de 512 × 512 y se muestra circular. Se rechazan imágenes de más de 40 megapíxeles y resultados mayores de 512 KB. HEIC y otros formatos no están admitidos directamente: deben convertirse antes. La orientación depende de la decodificación nativa del navegador; no hay ajuste manual del encuadre.

Los datos estructurados conservan la clave `mi-progreso-perfil-v1` con formato `{version:1, visibility:"local", fields:{...}, links:[], photoId, updatedAt}`. Se leen los perfiles de 0.12.0 sin escrituras ni migraciones automáticas. La foto se guarda en IndexedDB `mi-progreso-fotos-v1`, almacén `photos`, y se referencia por ID. No se envían datos ni imágenes a servidores. El avatar sigue disponible si no hay foto o falla IndexedDB.

El borrador de foto no se persiste hasta guardar. Primero se guarda un nuevo blob; después se actualiza la referencia del perfil. Si falla localStorage, se conserva el perfil anterior y se intenta retirar el blob nuevo. Tras guardar se intenta retirar la foto sustituida. Una interrupción abrupta entre operaciones puede dejar un blob sin referencia; no se sacrifica la foto anterior para evitarlo. La cancelación ignora compresiones tardías. Se comprueban conflictos entre ventanas antes y después de la escritura asíncrona y se usa Web Locks cuando está disponible.

Podcasts solo tiene entrada desde Inicio y conserva el contenido actual (Próximamente). Aprendizaje, cuestionarios y misiones ya no se cargan, no aparecen en la interfaz y no forman parte de la caché PWA. Se conservan los archivos antiguos sin referenciar como material recuperable, así como todos los datos educativos antiguos de localStorage. Hábitos, historial y Descubrir no cambian de funcionamiento. El commit permite revertir la evolución.

Verificación: `node --test pruebas/audiovisual.test.cjs` con regresiones de módulos conservados, hábitos, navegación, Descubrir, perfil y fotografías. Incluye simulaciones de IndexedDB y decodificación/canvas, errores, persistencia, cancelación, enlaces seguros, caché offline y protección de borradores PWA. Las simulaciones no sustituyen la comprobación física en Safari/iPhone: esa revisión queda pendiente por falta de permisos de control del ordenador en este entorno.

La publicación se prepara en `/private/tmp/mpd-comunidad` para preservar los cambios locales preexistentes del directorio original.
