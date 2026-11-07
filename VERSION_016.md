# ProgressMate v0.16.0

Cuenta Supabase opcional con acceso, registro y recuperación; configuración de sesión;
perfil público voluntario con alias; selector visible Pública/Privada; Personas con
búsqueda parcial y perfiles visitables; Para ti como feed vacío sin guías antiguas.
Fotos, perfil privado, hábitos y progreso continúan locales, sin migraciones.

Validación: 63 regresiones y pruebas simuladas de autenticación/privacidad superadas.
El propietario confirmó seis PASS con dos sesiones reales: lectura propia A/B,
lectura ajena cero filas A/B y modificación ajena exactamente cero filas A/B.
Confirmó búsqueda parcial real, retirada de privados y Redirect URL de producción.

Configuración cliente: URL y clave publishable públicas, sin credenciales administrativas.
La herramienta temporal está ignorada por Git y no forma parte de la PWA.

Actualización: mismo manifest, identidad y scope; SW 0.16.0 actualiza solo cachés propias.
No se borra localStorage ni IndexedDB. Guardar borradores antes de pulsar Actualizar.

Límites: revalidación pública cada 30 segundos; sin publicaciones reales, avatar o bio
públicos. Limitación de consultas en cliente eludible; no sustituye protección en servidor.
Pendiente comprobar actualización física en iPhone y recuperación de correo en producción.
