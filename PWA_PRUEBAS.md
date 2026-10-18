# Mi Progreso Diario · PWA v0.10.1

Versión visible: **v0.10.1**. Caché: **0.10.1**.

Inicio compacto: progreso horizontal, accesos prioritarios y detalles secundarios desplegables.
El contenido permite desplazamiento normal con texto ampliado o pantallas pequeñas.

Incluye el dashboard de Inicio, navegación, tarjetas de hábitos, aprendizaje visual
interactivo, arquitectura audiovisual y el piloto Detective de problemas.
No requiere cuentas, paquetes de terceros ni servicios de pago.

## Actualizar la PWA instalada sin perder datos

1. Con conexión a Internet, abre la aplicación desde su icono habitual en el iPhone.
2. Guarda respuestas educativas, el objetivo y cualquier borrador de la misión.
3. Mantén una sola ventana de esta aplicación; cierra otras pestañas abiertas con la misma app.
4. Espera el aviso «Nueva versión disponible». Si no aparece, cambia a otra aplicación
   y vuelve a Mi Progreso Diario: se comprueba al recuperar visibilidad y conexión.
5. Pulsa Actualizar. Se espera el fin de los guardados y se recarga al activar la versión.
6. Confirma «Mi Progreso Diario · v0.10.1» en Inicio. Comprueba hábitos, objetivo,
   estadísticas, respuestas y progreso; la misión no modifica las respuestas anteriores.
7. Si no aparece el aviso, cierra la app y vuelve a abrirla con conexión. Si sigue
   sin aparecer, revisa que GitHub Pages haya terminado de publicar. No borres datos
   ni desinstales la PWA para forzar una actualización.

El aviso no debe aparecer otra vez sin una nueva actualización real. Si se bloquea
por borradores o ventanas adicionales, guarda o cierra esas ventanas y reintenta.
La v0.9 no contenía misiones; tras actualizar, los nuevos borradores de misión también
se protegen antes de futuras actualizaciones.

## Pruebas locales con datos ficticios

En la carpeta del proyecto, utiliza un puerto nuevo:

```sh
python3 -m http.server 8016 --bind 127.0.0.1
```

Abre http://127.0.0.1:8016/ en Safari. El puerto tiene datos independientes de producción.

- Prueba Inicio, añadir/marcar/eliminar hábitos y objetivo.
- Consulta Tu semana y sus estados: 0 %, sin registro, sin hábitos y futuro.
- Guarda respuestas y revisa las tres modalidades de aprendizaje.
- Guarda una misión, recarga y comprueba Retomar misión.
- Tras la primera carga completa y recarga, detén SOLO el servidor de pruebas y
  recarga: la interfaz, los ejercicios y la misión deben abrir sin conexión.
- Vuelve a arrancar el servidor al terminar. No detengas otros procesos.

Las pruebas automatizadas usan datos y cachés simulados:

```sh
node --test pruebas/audiovisual.test.cjs
```

Para el iPhone instalado: después de actualizar con conexión, activa modo avión,
abre la app y comprueba interfaz y misión usando datos de prueba. Vuelve a activar
la conexión al terminar. Las pruebas técnicas no sustituyen esta comprobación real.

## Contrato de datos y caché

Se mantienen las claves y estructuras actuales:

- `mi-panel-habitos-v1`: hábitos, objetivo e historial.
- `mi-progreso-aprendizaje-v1`: respuestas y finalización educativa.
- `mi-aprendizaje-modalidades-v1`: preferencias.
- `mi-progreso-misiones-v1`: nuevo registro independiente del piloto.

El service worker almacena archivos, nunca respuestas. Incluye los tres archivos
`misiones-contenido.js`, `misiones-storage.js` y `misiones.js` junto a toda la interfaz.
Solo elimina cachés antiguas de su propio ámbito; no borra localStorage.
La instalación falla si falta algún archivo obligatorio y no fuerza la activación.
No se descargan vídeos grandes ni recursos externos.

No cambiar dominio, ruta de instalación ni claves sin un plan específico. Los datos
no se transfieren automáticamente entre Safari, PWA, Mac, iPhone o puertos locales.
Conserva copias de seguridad: instalar una PWA no garantiza almacenamiento permanente.
Para futuras publicaciones, cambia VERSION, incluye los nuevos recursos y verifica
la URL pública. No reutilices la misma versión de caché para contenidos distintos.
