/* Selección editorial de muestra, sin noticias, autores simulados ni red.
   Separada de perfiles y almacenamiento privado. Orden fijo, sin personalización. */
(() => {
  const posts = [
    {id:'ia-primer-borrador',category:'IA',title:'Usa la IA para preparar preguntas, no para inventar respuestas',description:'Convierte una idea inicial en una entrevista que te ayude a escuchar.',paragraphs:[
      'Describe el problema que quieres investigar sin incluir nombres ni datos personales. Pide un borrador de cinco preguntas abiertas sobre situaciones pasadas: qué ocurrió, cómo lo resolvieron y qué les costó.',
      'Revisa las preguntas y elimina las que sugieran una respuesta. «¿Qué hiciste la última vez?» aporta más evidencia que «¿Usarías mi aplicación?». Las respuestas generadas por IA no sustituyen entrevistas reales.'
    ],action:'Tu siguiente paso: elige tres preguntas y conversa con una persona que haya vivido el problema.'},
    {id:'ecommerce-coste-pedido',category:'E-commerce',title:'Calcula lo que deja un pedido antes de abrir tu tienda',description:'Un precio atractivo no siempre cubre el coste de vender.',paragraphs:[
      'Haz una estimación por pedido: precio cobrado menos producto, embalaje, envío que asumes, comisiones de pago y captación. Reserva también una cantidad para devoluciones. Es una primera aproximación, no el beneficio final.',
      'Ejemplo hipotético: vender por 30 € con 12 € de producto, 2 € de embalaje, 4 € de envío, 1 € de comisión y 5 € de captación deja 6 € antes de devoluciones, impuestos y costes fijos. Cambia cada cifra por una estimación propia y comprueba qué ocurre si sube el coste de captación.'
    ],action:'Tu siguiente paso: calcula tres escenarios de coste antes de comprar inventario.'},
    {id:'marketing-mensaje',category:'Marketing',title:'Un mensaje claro empieza por una situación concreta',description:'Explica a quién ayudas y qué puede conseguir sin prometer resultados garantizados.',paragraphs:[
      'Escribe una frase con tres piezas: una persona concreta, una dificultad que reconozca y la ayuda que ofreces. «Ayudo a tiendas de barrio a preparar las fotos de su catálogo» se puede contrastar mejor que «Transformamos tu negocio».',
      'Muestra dos versiones a varias personas del público elegido y pídeles que expliquen qué han entendido. No busques solo cuál les gusta más: observa si identifican el servicio y qué dudas les quedan.'
    ],action:'Tu siguiente paso: reescribe la primera frase de tu proyecto y comprueba si se entiende sin explicaciones.'},
    {id:'negocios-prueba',category:'Negocios',title:'Prueba la parte más incierta de tu idea',description:'Antes de construir más, decide qué necesitas aprender.',paragraphs:[
      'Anota las suposiciones de tu proyecto: quién tiene el problema, con qué frecuencia aparece y cómo lo resuelve hoy. Elige la que, si fuera falsa, cambiaría más tu propuesta.',
      'Diseña una prueba pequeña y honesta: una conversación, un boceto o una demostración manual identificada como prototipo. Decide de antemano qué evidencia te haría continuar, cambiar o detener la idea. Una opinión favorable por sí sola no confirma demanda.'
    ],action:'Tu siguiente paso: escribe una suposición y una prueba que puedas realizar esta semana.'},
    {id:'productividad-bloque',category:'Productividad',title:'Dale a tu próxima sesión un resultado visible',description:'Reduce una tarea grande a una acción que puedas terminar y revisar.',paragraphs:[
      '«Trabajar en mi negocio» no indica por dónde empezar. «Escribir un borrador de la propuesta para una tienda» permite reconocer el avance. Elige una tarea pequeña y prepara lo necesario antes de empezar.',
      'Reserva un bloque realista, silencia interrupciones y termina anotando qué has hecho y qué falta. Si no acabas, reduce el alcance de la siguiente sesión. Usa tus hábitos como apoyo, sin convertir cada día en una prueba de rendimiento.'
    ],action:'Tu siguiente paso: define un resultado concreto para tu próximo bloque de 20 minutos.'},
    {id:'experiencias-reflexion',category:'Experiencias emprendedoras',title:'Convierte una prueba que no funcionó en una decisión',description:'Guía de reflexión editorial; no es el testimonio de una persona real.',paragraphs:[
      'Después de una prueba, separa lo observado de tu interpretación. «Tres personas no entendieron el botón» es una observación; «a nadie le interesa» es una conclusión que esa prueba quizá no permite sacar.',
      'Registra qué esperabas, qué ocurrió y qué cambiarás. Conserva también lo que no sabes todavía. Si compartes el aprendizaje en el futuro, pide permiso antes de incluir nombres, fotos o frases de otras personas.'
    ],action:'Tu siguiente paso: anota una observación y una decisión de tu última prueba, aunque haya sido pequeña.'}
  ];
  window.MPDPostData = Object.freeze({
    editorial: Object.freeze({list: () => JSON.parse(JSON.stringify(posts))}),
    public: Object.freeze({available:false, list: () => []})
  });
})();
