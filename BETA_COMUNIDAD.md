# Preparación de comunidad · v0.14.0 · 5 noviembre 2026

## Estado auditado y entregado

Repositorio Izangnz/mi-progreso-diario, main remoto inicialmente 5479624 (v0.13.0). La carpeta del usuario está en 0e9dea9 (v0.10.2), con HTML modificado, archivos eliminados y carpeta codificación sin seguimiento. Sprint realizado en copia aislada para preservar todo ese trabajo. Buba Friends no se modifica.

JavaScript sin compilación: HTML con núcleo de hábitos y navegación; módulos separados de perfil, fotos y comunidad. Perfil privado versionado en localStorage `mi-progreso-perfil-v1`; fotos JPEG 512×512 en IndexedDB `mi-progreso-fotos-v1`, máximo 512 KB tras compresión, entrada máxima 10 MB. Las fotos nunca se suben. Hay protección de borradores, errores de cuota, formatos inválidos y conflictos entre ventanas. Hábitos e historial permanecen locales; no se migran ni sincronizan.

`perfil-datos.js` separa tres fuentes: `local` conserva lectura/escritura raw sin modificar formato ni claves; `demo` entrega copias de ejemplos ficticios; `public` devuelve lista vacía y rechaza publicar. No hay sesión ni simulación de autenticación. `perfil.js` usa exclusivamente `local`; `comunidad.js` no accede al perfil privado. Descubrir empieza vacío; las tarjetas ficticias solo aparecen al activar Ver ejemplos DEMO y conservan etiquetas en nombres, contador y detalle. La preferencia no se persiste. La caché PWA incorpora el módulo y sube a 0.14.0, sin interceptar servicios externos ni almacenar respuestas de usuarios.

GitHub Pages sirve archivos estáticos: no ejecuta lógica privada ni guarda una base compartida. Es adecuado para mantener esta interfaz y conectar un servicio externo. Nada privado debe incorporarse a HTML, JS o al repositorio.
Fuente: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

## Backend mínimo recomendado (pendiente, no implementado)

Supabase permite Auth gestionada, PostgreSQL, Storage y funciones de servidor en un servicio. RLS facilita restringir cada fila al propietario; exige políticas y pruebas correctas, no basta con añadir el SDK. Firebase sería otra alternativa gestionada; para este pequeño directorio, PostgreSQL facilita relacionar perfiles, bloqueos y denuncias sin añadir otro servicio. No necesitamos chat, seguidores ni tiempo real.

Configurar por el propietario: crear proyecto Supabase en región UE, habilitar MFA del panel, facilitar URL y clave publicable (nunca service_role), configurar URL real de Pages y redirecciones exactas de Auth, proveedor SMTP y remitente verificado. Elegir acceso por correo con confirmación y recuperación gestionadas por Auth; configurar límites y protección contra abuso. Los secretos administrativos y SMTP van solo en configuración de servidor. Revisar acuerdos del proveedor, aviso de privacidad, responsable, finalidad, conservación y derechos antes de aceptar usuarios.

Contrato público futuro independiente, sin extender `visibility` del objeto privado: `id`, `owner_id`, alias, bio, ciudad opcional, intereses, proyecto, enlaces HTTPS, referencia a foto pública opcional, fecha y versión del consentimiento, estado draft/published/hidden y fechas. Nada de correo, edad exacta, objetivo privado, hábitos, progreso o photoId de IndexedDB en el directorio. Publicar requiere selección explícita de campos, previsualización y consentimiento separado para foto; no copiar el perfil local automáticamente. Leer solo perfiles publicados de usuarios autenticados en la beta; el propietario puede retirar su perfil inmediatamente. Cambiar el adaptador público a una API asíncrona con estados de carga/error/paginación al integrar el SDK; el actual es síncrono y deliberadamente deshabilitado.

Antes de abrir registros:

1. Migraciones revisadas, RLS por defecto denegado: escritura solo `auth.uid() = owner_id`, validaciones de tamaño y campos en servidor; listados con paginación y solo columnas permitidas. Pruebas con anónimo, A, B y administrador, incluidos intentos de leer borradores o modificar a otro usuario.
2. Fotos públicas en almacenamiento separado del local, bucket privado y acceso autorizado/URLs de corta duración; validar y recomprimir en servidor, retirar metadatos, límites de tamaño y tipo. Nunca reutilizar automáticamente una foto local. No guardar sesiones ni datos públicos de usuarios en caché PWA.
3. Bloqueos privados con propietario y perfil bloqueado, aplicados a listados y accesos directos en servidor. Denuncias con acceso del denunciante y moderadores únicamente, límite de frecuencia y canal real de revisión; capacidad administrativa de ocultar perfiles. No mostrar botones que solo simulen estas acciones.
4. Retirar perfil, exportar datos y eliminar cuenta desde función autenticada: ocultar primero, borrar fotos, filas y sesión/cuenta Auth con credencial privilegiada solo en servidor. Definir tratamiento de denuncias y plazos de borrado de backups, sin prometer borrado inmediato de copias. Probar fallos parciales y reintentos. La eliminación remota no debe borrar hábitos locales sin acción independiente del usuario.
5. Integrar registro, acceso, salida, recuperación, consentimiento, publicación/retirada y moderación; probar expiración de sesión y errores de red. Sin conexión, los hábitos siguen funcionando y las acciones remotas muestran indisponibilidad sin confirmar éxito.

## Coste previsto (consulta 5 noviembre 2026)

Free: 0 USD/mes, 50.000 usuarios activos/mes, base 500 MB, archivos 1 GB, salida 5 GB; pausa tras una semana sin actividad y sin backups automáticos de Pro. Previsiblemente suficiente en capacidad para 20–50 usuarios con fotos comprimidas; no garantiza disponibilidad. Pro desde 25 USD/mes para un proyecto pequeño, con backups diarios y límites mayores. SMTP/dominio, impuestos y excesos aparte; mantener límites de gasto y alertas. Para beta pública continua, presupuestar Pro más correo; para pruebas privadas, Free.
Fuentes: https://supabase.com/pricing y https://supabase.com/docs/guides/database/postgres/row-level-security

Siguiente paso exacto: crear el proyecto UE y configurar Auth, URLs y SMTP; después implementar y probar las migraciones RLS y funciones de borrado/moderación antes de conectar cuentas en la interfaz. No se ha desplegado SQL, creado perfiles ni solicitado credenciales en este sprint.

## Validación

`node --test pruebas/audiovisual.test.cjs`: 55 pruebas. Incluyen hábitos, historial, navegación, conflictos y fallos de almacenamiento, fotos, perfiles privados, DEMO optativa, rechazo de publicación, aislamiento de fuentes y recursos offline. Sin prueba manual en iPhone/Safari ni prueba de backend (todavía no existe).
