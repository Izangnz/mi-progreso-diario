/* Catálogo provisional. Datos separados de interfaz y almacenamiento.
   Nuevas rutas usan identificadores estables; status: demo o published.
   format identifica el tipo de lección sin implementar reproductores. */
(() => {
  const demo = {
    id:"problema-antes-idea",
    title:"Empieza por un problema, no por una idea",
    duration:"Lectura y práctica · 15–20 min orientativos",
    summary:[
      "Primero elige a quién quieres ayudar y describe una dificultad concreta.",
      "Después pregunta cómo la resuelve hoy. Escucha experiencias reales antes de ofrecer nada.",
      "Por último, escribe una posible solución y piensa en una prueba pequeña. Que alguien diga «me gusta» no significa que vaya a comprar."
    ],
    explanation:[
      {title:"1. Conoce a la persona y su problema", paragraphs:[
        "Un cliente es alguien que podría comprar lo que ofreces. Para empezar, elige un grupo concreto al que puedas escuchar: estudiantes, familias o pequeños comercios. No tienes que ayudar a todo el mundo.",
        "Un problema es una dificultad para conseguir algo. Describe qué intenta hacer esa persona, cuándo le cuesta y por qué le importa. «Necesitan mi producto» no describe el problema: ya decide la solución.",
        "Distingue un hecho de una suposición. Un hecho es algo que has observado o que alguien te ha contado; una suposición es algo que crees pero todavía debes comprobar. Si no has hablado con nadie, puedes escribir «creo que…» sin presentarlo como un hecho."
      ],example:"Caso ficticio: una estudiante cuenta que el asa de su mochila se rompió al llevar varios libros. La persona es una estudiante que lleva libros; la dificultad es transportarlos sin que se rompa la mochila. Todavía no sabemos si otras personas tienen el mismo problema ni qué comprarían.",exercises:["persona","problema"],questions:["problema"]},
      {title:"2. Descubre cómo lo resuelve hoy", paragraphs:[
        "Una alternativa es lo que la persona hace ahora para resolver su dificultad. Puede comprar un producto, pedir ayuda, hacerlo a mano o decidir no hacer nada. Antes de proponer algo, descubre qué le sirve y qué le sigue costando.",
        "Una pregunta abierta permite explicar una experiencia en lugar de responder solo sí o no. Prueba «¿Qué hiciste la última vez?» o «¿Qué te resultó difícil?». Evita «¿Verdad que necesitas lo que vendo?», porque sugiere la respuesta.",
        "No des por hecho que tu opción será mejor. Si no sabes qué hace hoy tu posible cliente, escribe «por comprobar» y prepara una pregunta para averiguarlo."
      ],example:"Caso ficticio: alguien no entiende un ejercicio de matemáticas y estudia con un amigo. Esa es su alternativa actual. Podrías preguntar «¿Cómo preparaste el último examen?» y «¿En qué parte necesitaste ayuda?». Dar clases particulares sería una posible solución posterior, no el punto de partida de la conversación.",exercises:["alternativa"],questions:["evidencia"]},
      {title:"3. Propón una solución y prueba el interés", paragraphs:[
        "Una solución es una forma de ayudar con el problema: por ejemplo, un producto físico o un servicio, que es una tarea que haces para otra persona. Una tienda online vende por Internet; es una forma de llegar al cliente, pero no demuestra que alguien necesite lo que vendes.",
        "Una hipótesis es una idea que necesitas comprobar. Escríbela así: «Creo que [grupo] tiene dificultad para [tarea]. Podría ayudar [solución], pero necesito comprobar [duda]». Puedes imaginar una reparación, clases, un producto o ayuda a un comercio. Elige algo sencillo relacionado con el problema que has descrito.",
        "Una prueba pequeña busca aprender antes de invertir mucho. Escucha primero; después puedes enseñar un dibujo, una muestra o proponer una prueba de un servicio explicando qué incluye. Decide qué observarás: por ejemplo, si alguien acuerda probarlo en una fecha concreta. Eso aporta más información que un «me gusta», aunque tampoco garantiza que comprará.",
        "No necesitas comprar muchas unidades ni preparar un negocio completo para este ejercicio. Si nadie muestra interés, revisa la necesidad y la solución antes de gastar más."
      ],example:"Caso ficticio: crees que a algunos compañeros les cuesta distinguir sus botellas reutilizables. Podrías enseñar un dibujo de etiquetas personalizadas y preguntar quién quiere probar una muestra la próxima semana. Acordar esa prueba sería una señal concreta; elogiar el dibujo no equivale a comprar. Antes de fabricar muchas etiquetas, comprobarías también si les resultan útiles.",exercises:["hipotesis","preguntas"],questions:["hipotesis"]}
    ],
    practice:{
      intro:"Avanza paso a paso y utiliza el mismo caso en los cinco ejercicios. Puedes mantener el que ya habías empezado. Los ejemplos son ficticios y orientativos, no respuestas que debas copiar. Escribe tus respuestas y pulsa Guardar en cada ejercicio. Se conservan solo en este dispositivo.",
      steps:[
        "Elige una persona o un grupo concreto al que puedas escuchar.",
        "Describe una situación reciente: ¿qué quería conseguir y qué se lo dificultó?",
        "Escribe cómo lo resuelve hoy. Si no lo sabes, márcalo como «por comprobar».",
        "Redacta una hipótesis sobre el problema y una posible solución que todavía debas comprobar.",
        "Prepara dos preguntas sobre experiencias pasadas y una prueba pequeña de interés antes de invertir."
      ],
      example:"Ejemplo de pregunta: «Cuéntame la última vez que buscaste un recambio para un producto. ¿Cómo elegiste dónde comprarlo?»",
      outcome:"Resultado esperado: un cliente concreto, un problema por investigar, sus alternativas actuales, una posible solución y un siguiente paso pequeño para comprobar el interés. Estos primeros pasos no demuestran todavía que el negocio vaya a funcionar."
    }
  };
  const routes = [{
    id:"emprendimiento-desde-cero",
    title:"Emprendimiento desde cero",
    description:"De una primera pregunta a un proyecto pequeño que puedas poner a prueba. Explora a tu ritmo y empieza por lo que necesites.",
    modules:[
      {id:"fundamentos",title:"Fundamentos del emprendimiento",level:"Principiante",description:"Comprender problemas, personas y propuestas de valor antes de construir.",lessons:[demo]},
      {id:"modelos",title:"Modelos de negocio",level:"Principiante",description:"Explorar cómo una propuesta crea valor, llega a sus clientes y se sostiene.",lessons:[]},
      {id:"investigacion",title:"Investigación de mercados y oportunidades",level:"Intermedio",description:"Conocer a las personas, sus alternativas y las oportunidades que merece la pena investigar.",lessons:[]},
      {id:"validacion",title:"Validación de ideas",level:"Intermedio",description:"Convertir suposiciones en preguntas y diseñar pruebas pequeñas para aprender.",lessons:[]},
      {id:"marketing",title:"Marketing y ventas",level:"Intermedio",description:"Comunicar una propuesta con claridad y aprender de conversaciones con posibles clientes.",lessons:[]},
      {id:"proyecto",title:"Creación de un primer proyecto",level:"Avanzado",description:"Unir lo aprendido en un primer proyecto con alcance reducido y próximos pasos claros.",lessons:[]}
    ]
  }];

  // Presentación opcional: los bloques y registros anteriores siguen siendo la fuente educativa.
  demo.journey = {
    id:"problema-recorrido",
    visuals:{
      intro:[{symbol:"○",title:"Persona",text:"¿A quién quieres ayudar?"},{symbol:"!",title:"Dificultad",text:"¿Qué le cuesta conseguir?"},{symbol:"?",title:"Investiga",text:"Escucha antes de vender."}],
      story:[{symbol:"▤",title:"Muchos libros",text:"Un estudiante va a clase."},{art:"learning-backpack",title:"Asa rota",text:"La mochila no aguanta."},{symbol:"?",title:"Una pista",text:"¿Qué pasó? ¿Cómo lo resolvió?"}],
      challenge:[{symbol:"○",title:"Persona",text:"Un grupo concreto."},{symbol:"▤",title:"Situación",text:"Qué intenta hacer."},{symbol:"!",title:"Dificultad",text:"Qué se lo impide."}],
      finish:[{symbol:"✓",title:"Observar",text:"Detectar una dificultad."},{symbol:"?",title:"Investigar",text:"Escuchar experiencias."},{symbol:"→",title:"Comprender",text:"Separar hechos de dudas."}]
    },
    decision:{question:"Antes de empezar un negocio, ¿qué harías?",options:[
      "Comprar productos y pensar después a quién venderlos.",
      "Escuchar a personas y descubrir una dificultad concreta.",
      "Elegir un nombre y dar por hecho que habrá clientes."
    ],correct:1,explanations:[
      "Comprar primero supone un gasto antes de conocer la necesidad. Empieza escuchando.",
      "Escuchar te ayuda a conocer qué cuesta resolver antes de elegir una solución.",
      "Un nombre no demuestra una necesidad. Primero investiga qué les ocurre a tus posibles clientes."
    ]},
    story:{question:"A un estudiante se le rompe el asa de la mochila al llevar libros. ¿Cómo investigarías?",options:[
      "Preguntaría: «¿Verdad que comprarías mi mochila?».",
      "Concluiría que todos los estudiantes necesitan una nueva.",
      "Preguntaría qué ocurrió, cómo lo resolvió y si le había pasado antes."
    ],correct:2,explanations:[
      "Esa pregunta sugiere la respuesta y propone vender antes de comprender. Prueba una pregunta abierta.",
      "Un caso es una pista, no una conclusión sobre todo el mundo. Escucha más experiencias.",
      "Estas preguntas abiertas permiten conocer hechos y alternativas, sin empujar a comprar."
    ]}
  };
  demo.status = "demo";
  demo.format = "blocks";
  demo.practice.exercises = [
    {id:"persona",prompt:"¿A quién quieres ayudar?",hint:"Elige un grupo concreto de personas o pequeños negocios al que puedas escuchar.",example:"Estudiantes que llevan varios libros al centro de estudios.",criteria:"Un grupo reconocible, no «todo el mundo». Todavía no necesitas decidir qué vas a vender."},
    {id:"problema",prompt:"¿Qué le cuesta conseguir a esa persona?",hint:"Describe una dificultad, cuándo ocurre y qué has observado. Si es una suposición, indícalo.",example:"Una estudiante contó que se rompió el asa de su mochila al llevar varios libros. Me falta comprobar si les ocurre a más compañeros.",criteria:"Una dificultad concreta del cliente. Separa lo observado de lo que crees y evita presentar tu producto como si fuera el problema."},
    {id:"alternativa",prompt:"¿Cómo lo resuelve hoy?",hint:"Escribe qué hace ahora y qué necesitas preguntarle. Si no lo sabes, indica «por comprobar».",example:"Para estudiar una materia difícil, un compañero pide ayuda a un amigo. Quiero preguntarle qué parte consigue resolver y cuál le sigue costando.",criteria:"Una alternativa actual o una duda explícita, con una pregunta sobre una experiencia real. No supongas que necesita cambiar."},
    {id:"hipotesis",prompt:"¿Qué solución podrías probar?",hint:"Creo que [grupo] tiene dificultad para [tarea]. Podría ayudar [solución], pero necesito comprobar [duda].",example:"Creo que algunos compañeros confunden sus botellas. Podrían ayudar unas etiquetas personalizadas, pero necesito comprobar si les interesa usarlas y si se despegan al lavarlas.",criteria:"Una solución sencilla que responda a tu problema y una duda por comprobar. No necesitas escoger un modelo de negocio ni hacer cálculos todavía."},
    {id:"preguntas",prompt:"¿Qué preguntarías y qué prueba pequeña harías?",hint:"Escribe dos preguntas abiertas sobre lo que ocurre hoy. Después elige una prueba sencilla y una acción que te indicaría interés.",example:"«¿Cómo reconociste tu botella la última vez?» y «¿Qué ocurrió cuando se parecía a otra?». Enseñaría un dibujo de la etiqueta y comprobaría si alguien acuerda probar una muestra la próxima semana.",criteria:"Preguntas que no sugieran la respuesta y una prueba que no exija invertir mucho. Distingue un elogio de una acción concreta; ninguna señal garantiza una venta."}
  ];
  demo.quiz = [
    {id:"problema",question:"¿Cuál describe un problema del cliente?",options:["Tengo que vender mochilas nuevas.","A una estudiante se le rompe la mochila cuando lleva varios libros.","Todo el mundo necesita mi producto."],correct:1,explanations:["Ya has elegido qué vender. Primero describe la dificultad de la persona.","Describe a quién le ocurre, qué intenta hacer y qué se lo dificulta, como en el ejemplo anterior.","Es una suposición general, no una dificultad concreta que puedas investigar."]},
    {id:"evidencia",question:"Quieres entender cómo estudia alguien antes de ofrecer clases. ¿Qué pregunta ayuda más?",options:["¿Verdad que necesitas mis clases?","¿Te gustaría un servicio perfecto?","¿Cómo preparaste el último examen y qué te costó más?"],correct:2,explanations:["Sugiere la respuesta y ofrece una solución antes de escuchar.","Habla de una situación imaginaria, no de lo que la persona hace hoy.","Es abierta y pregunta por una experiencia real. Puede mostrar qué hace ahora y dónde necesita ayuda."]},
    {id:"hipotesis",question:"Enseñas un dibujo de etiquetas para botellas. ¿Qué aporta más información que un «me gusta»?",options:["Que alguien acuerde probar una muestra en una fecha concreta.","Que tú estés muy convencido de tu idea.","Que compres muchas etiquetas antes de hablar con nadie."],correct:0,explanations:["Es una acción concreta para tu prueba pequeña. Aporta una señal de interés, aunque aún no garantiza una compra.","Tu entusiasmo no indica si otra persona necesita la solución.","Gastar más no demuestra interés del cliente. Primero escucha y prueba con poco."]}
  ];
  // Piloto local: sin archivos multimedia. El texto alternativo enseña el mismo concepto.
  // Los ids de los bloques son editoriales; nunca sustituyen los ids de respuestas.
  const stepIds = ["cliente-problema","alternativas-actuales","solucion-prueba"];
  demo.completion = {type:"manual",description:"Finalización personal después de revisar y practicar. Reproducir medios no completa la lección."};
  demo.contentSteps = demo.explanation.map((part,index) => {
    const id = stepIds[index];
    const teaching = index < 2 ? {
      id:id+"-concepto",type:index===0 ? "video" : "audio",phase:"teach",
      title:index===0 ? "Conoce a la persona y su problema" : "Escucha cómo lo resuelve hoy",
      src:null,poster:null,captions:[],transcript:part.paragraphs,
      fallback:{paragraphs:part.paragraphs}
    } : {id:id+"-concepto",type:"explanation",paragraphs:part.paragraphs};
    const blocks = [teaching];
    if(index===0)blocks.push({
      id:"cliente-problema-esquema",type:"image",phase:"show",src:null,
      title:"Separa la persona, la dificultad y lo que falta comprobar",
      alt:"Una estudiante transporta libros, el asa se rompe y todavía falta preguntar si les ocurre a otros.",
      caption:"Esquema didáctico en HTML. No hay un archivo de imagen asociado.",
      fallback:{paragraphs:["Describe primero a quién le ocurre y qué le cuesta. Después comprueba tus dudas."],
        visual:[{label:"Persona",text:"Estudiante que lleva libros"},{label:"Dificultad",text:"El asa de la mochila se rompe"},{label:"Por comprobar",text:"¿Le ocurre también a otras personas?"}]}
    });
    blocks.push({id:id+"-ejemplo",type:"example",text:part.example});
    part.exercises.forEach(exerciseId => blocks.push({id:"ejercicio-"+exerciseId,type:"exercise",exerciseId}));
    part.questions.forEach(questionId => blocks.push({id:"pregunta-"+questionId,type:"question",questionId}));
    return {id,title:part.title,blocks};
  });

  // Adaptación de contenido puro: no presenta elementos ni accede al almacenamiento.
  // contentSteps es el nuevo formato; explanation sigue siendo compatible.
  const phases = {teach:0,show:1,practice:2,check:3};
  const defaultPhase = {video:"teach",audio:"teach",image:"show",explanation:"teach",example:"show",exercise:"practice",question:"check"};
  function identifier(value) { return typeof value === "string" && /^[a-z0-9-]+$/.test(value); }
  function normalize(lesson) {
    const exerciseRegistry = lesson.practice?.exercises || [];
    const questionRegistry = lesson.quiz || [];
    const legacy = !Array.isArray(lesson.contentSteps);
    const steps = legacy ? (lesson.explanation || []).map((part,index) => {
      const id = part.id || "paso-"+(part.exercises?.[0] || part.questions?.[0] || index+1);
      return {id,title:part.title,blocks:[
        {id:id+"-concepto",type:"explanation",paragraphs:part.paragraphs || []},
        {id:id+"-ejemplo",type:"example",text:part.example || ""},
        ...(part.exercises || []).map(exerciseId => ({id:"ejercicio-"+exerciseId,type:"exercise",exerciseId})),
        ...(part.questions || []).map(questionId => ({id:"pregunta-"+questionId,type:"question",questionId}))
      ]};
    }) : lesson.contentSteps;
    if(!steps.length)throw new Error("La lección todavía no tiene pasos educativos.");
    const blockIds = new Set(),stepIdSet = new Set(),exerciseIds = new Set(),questionIds = new Set();
    const normalizedSteps = steps.map(part => {
      if(!identifier(part.id) || stepIdSet.has(part.id) || !Array.isArray(part.blocks) || !part.blocks.length)throw new Error("Revisa los identificadores y bloques del paso.");
      stepIdSet.add(part.id);
      let previous=-1,taught=false,shown=false;
      const blocks=part.blocks.map(block => {
        if(!identifier(block.id) || blockIds.has(block.id) || !Object.hasOwn(defaultPhase,block.type))throw new Error("Bloque desconocido o identificador duplicado.");
        blockIds.add(block.id);
        const phase=block.phase || defaultPhase[block.type];
        if(!Object.hasOwn(phases,phase) || phases[phase]<previous ||
          (["exercise","question"].includes(block.type) && phase!==defaultPhase[block.type]))throw new Error("Los bloques deben respetar enseñar, mostrar, practicar y comprobar.");
        previous=phases[phase];if(phase==="teach")taught=true;if(phase==="show")shown=true;
        const hasText=value=>typeof value==="string" ? !!value.trim() : Array.isArray(value) && value.some(text=>typeof text==="string"&&text.trim());
        if(["video","audio"].includes(block.type) && !hasText(block.transcript) && !hasText(block.fallback?.paragraphs))throw new Error("Añade una transcripción o alternativa escrita al recurso audiovisual.");
        if(block.type==="explanation" && !hasText(block.paragraphs))throw new Error("La explicación está vacía.");
        if(block.type==="example" && !hasText(block.text))throw new Error("Falta el ejemplo del concepto.");
        if(["exercise","question"].includes(block.type) && (!taught || !shown))throw new Error("Explica el concepto y muestra un ejemplo antes de proponer la actividad.");
        if(block.type==="exercise") {
          if(!identifier(block.exerciseId) || exerciseIds.has(block.exerciseId) || !exerciseRegistry.some(item=>item.id===block.exerciseId))throw new Error("Referencia de ejercicio no válida o repetida.");
          exerciseIds.add(block.exerciseId);
        }
        if(block.type==="question") {
          if(!identifier(block.questionId) || questionIds.has(block.questionId) || !questionRegistry.some(item=>item.id===block.questionId))throw new Error("Referencia de pregunta no válida o repetida.");
          questionIds.add(block.questionId);
        }
        return {...block,phase};
      });
      return {...part,blocks};
    });
    const completion = lesson.completion || (legacy ? {type:"manual"} : {type:"undefined"});
    return {steps:normalizedSteps,exercises:[...exerciseIds].map(id=>exerciseRegistry.find(item=>item.id===id)),
      questions:[...questionIds].map(id=>questionRegistry.find(item=>item.id===id)),completion,
      summary:lesson.summary || [],intro:lesson.practice?.intro || "Revisa cada concepto antes de realizar sus actividades.",outcome:lesson.practice?.outcome || ""};
  }
  window.MPDLearningBlocks = Object.freeze({normalize});
  window.MPDLearningCatalog = routes;
})();
