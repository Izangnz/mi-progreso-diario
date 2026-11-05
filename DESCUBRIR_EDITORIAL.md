# Descubrir · v0.15.0

Una única pestaña inferior Descubrir contiene dos secciones: Para ti (seleccionada al cargar) y Personas. Controles nativos con aria-pressed y aria-controls; ambas secciones tienen títulos y el panel inactivo queda oculto. La selección dura solo durante la sesión y no modifica almacenamiento.

Para ti muestra seis guías editoriales de muestra: IA, e-commerce, marketing, negocios, productividad y experiencias emprendedoras. Son una selección fija, no personalizada, sin noticias, fechas de actualidad, autores ficticios ni atribuciones a usuarios. Cada tarjeta incluye categoría, título, descripción, etiqueta editorial y contenido ampliable con details/summary nativos, accesibles mediante teclado y toque. Los ejemplos numéricos se identifican como hipotéticos. No hay enlaces ni servicios externos.

Personas conserva búsqueda, diálogo y acceso opcional a cuatro perfiles ficticios DEMO. El directorio real sigue vacío y el perfil privado no se publica.

## Organización y reversibilidad

- `publicaciones-datos.js`: catálogo editorial independiente y copias de lectura mediante MPDPostData.editorial.list(). MPDPostData.public está deshabilitado y devuelve una lista vacía. Las publicaciones futuras necesitarán un adaptador asíncrono con carga, error, paginación, permisos y moderación; no hay integración remota actual.
- `descubrir.js`: navegación interna y representación con textContent, sin interpretar HTML. No lee ni escribe hábitos, perfiles ni fotos.
- `comunidad.js`, `comunidad-datos.js` y `perfil-datos.js`: fuentes y explorador de personas separados de las publicaciones.
- `comunidad.css`: estilos del feed de una sola columna, tipografía adaptable, ajuste de texto y controles de al menos 48 px; mantiene tonos oscuros y dorados.
- `sw.js`: caché 0.15.0 con ambos módulos nuevos. Sin cambios en claves, esquemas, IndexedDB o reglas de caché de datos personales. No se añaden dependencias.

Revertir el commit revierte la interfaz y los recursos sin migrar datos. En una nueva publicación de reversión debe incrementarse de nuevo la versión de caché.

## Verificación

58 pruebas superadas con el ejecutor Node (node:test), incluida la suite anterior completa y tres pruebas nuevas para navegación, categorías, expansión semántica, aislamiento de datos, texto seguro, feed vacío y recursos offline. `git diff --check` sin errores. No se realizó comprobación visual en Safari/iPhone: el navegador automatizado no estaba disponible y el entorno no permitió abrir el servidor local. El diseño móvil está preparado con CSS adaptable, pero requiere revisión en dispositivo real.

Trabajo sobre copia aislada `/private/tmp/mpd-beta-sprint`, partiendo de origin/main 25e5b58. El directorio del IDE conserva su trabajo local previo y no se actualiza ni limpia; Buba Friends no se modifica.

Pendiente: backend, usuarios auténticos y publicaciones reales. No hay likes, seguidores, comentarios, chat, publicación por usuarios ni recomendaciones personalizadas.
