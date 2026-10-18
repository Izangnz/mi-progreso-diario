# Detective de problemas · v0.10

Actividad opcional de la primera lección, sin quinta pestaña ni logros nuevos.

## Prueba personal

Desde la carpeta del proyecto, inicia un servidor en un puerto nuevo:

```sh
python3 -m http.server 8015 --bind 127.0.0.1
```

Abre http://127.0.0.1:8015/ en Safari. Usa solo datos ficticios.

1. En Inicio, entra desde la tarjeta educativa. Empieza la misión.
2. Escribe una observación y pulsa Guardar progreso. Recarga y comprueba Retomar misión.
3. En Investiga, elige lo que realmente has hecho. Se puede dejar pendiente.
4. Añade una reflexión y visita Resultado. Visitarlo no finaliza la misión.
5. Finaliza manualmente. Comprueba que el progreso y logros de la lección no cambian.
6. Guarda respuestas ficticias a los ejercicios Problema y Alternativa. En la misión,
   abre sus referencias y copia voluntariamente. Cambiar la misión no cambia los ejercicios.
7. Escribe un borrador y vuelve a Inicio o a la lección: se mantiene durante la navegación.
   Antes de cerrar o recargar, guarda; los borradores en memoria no son copias permanentes.
8. Con dos ventanas, edita antes de guardar en ambas. El conflicto debe conservar el borrador
   y ofrecer consultar o cargar la versión guardada. Cargar exige confirmar si hay cambios.
9. Recorre botones y campos con Tab. Comprueba iPhone, teclado en pantalla y texto ampliado.

La finalización requiere una observación y una reflexión, pero no obliga a inventar una
conversación ni una respuesta de investigación. La situación declarada se muestra en el resumen.

## Datos y distribución

- Nueva clave independiente: `mi-progreso-misiones-v1`.
- Ninguna migración de hábitos o ejercicios; una única misión piloto y una revisión compartida
  del registro para evitar que otra ventana sobrescriba respuestas antiguas.
- Las respuestas educativas solo se leen como referencia. No hay sincronización automática.
- Versión visible v0.10 y caché 0.10.0.
- Los archivos `misiones-contenido.js`, `misiones-storage.js` y `misiones.js` están incluidos
  en la caché inicial. La primera carga requiere conexión y una instalación correcta
  del service worker; después la misión y su guardado pueden utilizarse sin conexión.
- `pwa.js` comprueba los borradores y guardados de la misión antes de aplicar actualizaciones.

## Pruebas técnicas

```sh
node --test pruebas/audiovisual.test.cjs
```

Las pruebas usan DOM, almacenamiento y ventanas simuladas. No leen datos reales de Safari.
No sustituyen la revisión visual en Safari y en un iPhone.
