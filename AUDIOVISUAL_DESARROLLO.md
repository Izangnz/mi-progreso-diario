# Base audiovisual · v0.10

La etiqueta visible es **v0.10** y el service worker utiliza **0.10.0**.
No hay medios externos y no se ha migrado ningún dato.

## Organización

- `aprendizaje-contenido.js`: catálogo, bloques y adaptador de formato anterior.
- `aprendizaje.js` y `aprendizaje.css`: presentación y controles nativos.
- `aprendizaje-storage.js`: respuestas y finalización existentes, sin modificaciones.
- `aprendizaje-progreso.js`: cálculo del progreso y criterios de finalización.
- `aprendizaje-preferencias.js`: modalidades existentes, sin modificaciones.

No se han creado dependencias de ejecución nuevas: los cuatro archivos modificados
ya forman parte de la lista de caché. Los tests y esta guía no se añaden a la caché.

## Contrato de contenido

Una lección nueva puede declarar `contentSteps`. Cada paso tiene `id`, `title` y
una lista ordenada de `blocks`. Cada bloque tiene `id` estable y `type`:

| Tipo | Datos principales | Fase por defecto |
| --- | --- | --- |
| `video` | `src`, `title`, `poster`, `captions`, `transcript`, `fallback` | enseñar |
| `audio` | `src`, `title`, `transcript`, `fallback` | enseñar |
| `image` | `src`, `alt`, `caption`, `fallback` | mostrar |
| `explanation` | `paragraphs` | enseñar |
| `example` | `text` | mostrar |
| `exercise` | `exerciseId` existente | practicar |
| `question` | `questionId` existente | comprobar |

`phase` permite usar un medio para enseñar o mostrar, respetando el orden.
Se comprueban ids, referencias, duplicados, alternativas escritas y secuencia.
No se permite evaluar antes de enseñar y mostrar. Los ejercicios y preguntas se
definen una sola vez en sus registros actuales, y los bloques los referencian por id.

Las lecciones anteriores con `explanation`, `practice.exercises` y `quiz` se
adaptan en memoria. No se reescriben respuestas ni se cambian sus claves.
Las ids automáticas del adaptador se derivan de las referencias existentes;
al editar contenido nuevo, hay que asignar ids editoriales explícitas y estables.

En el piloto, los dos primeros conceptos tienen bloques de vídeo/audio **sin src**:
se presenta la explicación escrita completa. El primer ejemplo incluye un esquema
HTML de persona → dificultad → duda. No hay reproductores vacíos ni imágenes rotas.

## Recursos reales, cuando se autoricen

Solo se aceptan archivos locales al proyecto, nunca URLs externas ni ejecutables.
Los medios utilizan controles nativos, `preload="none"` y no reproducen solos.
Los vídeos incluyen `playsinline`, portada y pistas locales de subtítulos cuando
se proporcionen. Cada pista puede declarar `src`, `lang`, `label`, `kind` y `default`.
La transcripción está accesible y los errores dejan visible la alternativa educativa.
Las imágenes requieren alt salvo que se marquen explícitamente como decorativas.

No se guarda posición de reproducción ni se concede progreso al recibir `ended`.
Los medios se pausan al ocultar una lección, un paso o el apartado Aprendizaje.

## Finalización

- `completion: {type: "manual", description: "..."}`: la regla actual.
- `completion: {type: "saved-exercises", exerciseIds: [...]}`: exige respuestas
  guardadas para esos ejercicios; no acredita que sean correctas.
- Una lección nueva sin criterio explícito no permite marcar finalización.

El formato antiguo conserva finalización manual por compatibilidad.
Las lecciones sin ejercicios escritos pueden declarar revisión manual explícita.
No hay finalización por visualizar medios ni nuevas recompensas.

## Probar en Safari sin afectar datos reales

1. Desde la carpeta del proyecto, usa un puerto de pruebas que no hayas utilizado:

   ```sh
   python3 -m http.server 8010 --bind 127.0.0.1
   ```

2. Abre `http://127.0.0.1:8010/`. El puerto forma parte del origen: los datos de
   la app en el puerto 8000 o en su dirección pública no se transfieren aquí.
3. Utiliza respuestas ficticias. Entra en la primera demostración y prueba las
   tres modalidades. Revisa el esquema y las alternativas de vídeo y audio.
4. Guarda, recarga, navega con un borrador y comprueba que sigue disponible.
5. Tras una primera carga completa y recarga, detén el servidor con Control+C y
   vuelve a recargar la misma dirección para comprobar la interfaz offline.

Una instalación anterior con caché 0.9.1 recibe el aviso de actualización al detectar
el nuevo service worker. Guarda los borradores y pulsa Actualizar. No borres sus datos.
Para pruebas separadas, utiliza un puerto local nuevo.

## Pruebas técnicas

Con Node disponible, sin paquetes adicionales:

```sh
node --test pruebas/audiovisual.test.cjs
```

La batería usa DOM, almacenamiento, reloj, eventos y caché simulados. Los nombres
de recursos que aparecen en las pruebas son fixtures en memoria, no archivos
educativos publicados ni peticiones reales. No accede a Safari.

Queda pendiente probar controles con medios reales autorizados, subtítulos reales,
lector de pantalla y reproducción en un iPhone. Las comprobaciones simuladas de
CSS y atributos no sustituyen una revisión visual ni una auditoría de accesibilidad.
El vídeo/audio offline queda fuera de esta fase: no se precachean medios grandes
ni se implementan descargas o respuestas parciales de caché.
