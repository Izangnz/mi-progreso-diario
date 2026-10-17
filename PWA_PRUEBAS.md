# Mi Progreso Diario · PWA 0.5.0

No necesita instalar paquetes ni crear cuentas de usuario. No se ha publicado.

## Probar en el Mac sin publicar

1. Guarda una copia de seguridad reciente. Las pruebas deben usar hábitos ficticios.
2. Abre Terminal en la carpeta del proyecto. Si tienes Python 3, ejecuta:

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

3. Abre `http://localhost:8000/` en Safari, preferiblemente en un perfil de pruebas.
   Esta dirección tiene almacenamiento propio: no mostrará los datos del archivo local.
   No importes tu copia real para estas pruebas.
4. Espera a que termine de cargar. Añade un hábito ficticio y un objetivo.
5. Recarga y comprueba hábitos, navegación, historial y «Tu semana».
6. Detén el servidor con Control+C y recarga la misma dirección. Tras haberse
   instalado correctamente el service worker, la aplicación debe seguir abriendo.
   Marca y desmarca el hábito; recarga y comprueba que se conserva.
7. Arranca otra vez el servidor para recuperar la conexión.

La primera visita necesita conexión al servidor. Abrir el archivo con doble clic
continúa siendo posible, pero no permite comprobar el service worker.
No borres los datos generales de Safari para probar o resolver una actualización.

## Probar una actualización

1. Con la versión 0.5.0 ya cargada desde localhost, mantén una sola ventana abierta.
2. En una futura versión, cambia los archivos y aumenta `VERSION` en `sw.js`
   (por ejemplo a `0.5.1`). Mantén el nombre `sw.js` y su ubicación.
3. Vuelve a la aplicación con el servidor activo. Se comprueban actualizaciones
   al abrir, volver a la aplicación y recuperar conexión; la detección puede tardar.
4. Cuando aparezca «Nueva versión disponible», pulsa «Actualizar».
5. La página debe recargarse conservando hábitos, identificadores, objetivo e historial.
6. Si hay otras ventanas de la aplicación, ciérralas y vuelve a intentarlo.
7. Comprueba que la nueva versión también abre sin conexión al servidor.

No reutilizar un número de caché para archivos distintos. Publicar todos los archivos
de cada versión juntos y añadir a `FILES` cualquier nuevo recurso necesario sin conexión.
La activación elimina solo cachés antiguas de esta aplicación y de este ámbito;
nunca elimina localStorage. No aplicar automáticamente actualizaciones mientras se edita.

## Antes de instalar en iPhone

- Elegir una dirección HTTPS estable y publicar los archivos del proyecto, sin `.git`
  ni copias de seguridad. GitHub Pages puede servirlos desde una subcarpeta: las rutas
  de esta PWA son relativas para admitir ese caso.
- No renombrar ni mover la dirección de instalación sin planificar los datos locales.
- Abrir la dirección publicada en Safari del iPhone y añadirla a la pantalla de inicio
  (activar «Abrir como app web» si aparece).
- Empezar a usarla desde su icono. Comprobar instalación, icono, guardado tras cerrar,
  modo avión y recepción de una segunda versión.
- Mantener las copias de seguridad: instalar una PWA no hace permanente su almacenamiento.

`localhost` en el iPhone se refiere al propio iPhone, no al Mac. Una dirección HTTP
de la red local del Mac no sustituye a HTTPS para probar correctamente esta PWA.
Las pruebas en Mac no sustituyen la comprobación final en el iPhone.

## Datos

La clave sigue siendo `mi-panel-habitos-v1` y su estructura no cambia. La PWA guarda
archivos de la aplicación en Cache Storage, separados de hábitos e historial.
El cambio de archivo local a dirección web no transfiere datos automáticamente.
Mac e iPhone mantienen datos independientes; no hay sincronización ni cuentas.
