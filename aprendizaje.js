/* Catálogo ampliable. Sin cuentas, pagos, progreso guardado ni acceso a localStorage.
   Para añadir rutas: crear otro objeto con id, título, descripción y módulos.
   Las futuras lecciones reutilizan resumen, explicación y práctica. */
(() => {
  const demo = {
    id:"problema-antes-idea",
    title:"Empieza por un problema, no por una idea",
    duration:"Lectura y práctica · 15–20 min orientativos",
    summary:[
      "Emprender comienza por entender una necesidad concreta de una persona, no por construir una aplicación.",
      "Una idea es una propuesta que todavía necesita pruebas. Tu entusiasmo no confirma que alguien vaya a utilizarla.",
      "El primer paso es observar un problema y escribir qué sabes y qué estás suponiendo."
    ],
    explanation:[
      {title:"1. Define a quién quieres ayudar", paragraphs:[
        "Decir «mi producto es para todo el mundo» dificulta aprender. Elige un grupo al que puedas acercarte: por ejemplo, personas que trabajan por turnos y quieren organizar sus comidas. No necesitas acertar para siempre; necesitas un punto de partida concreto.",
        "Piensa en una situación real: cuándo aparece la dificultad, qué intenta conseguir esa persona y qué hace hoy para resolverla. Describe acciones que puedas observar, en lugar de imaginar características de tu futuro producto."
      ]},
      {title:"2. Separa el problema de tu solución", paragraphs:[
        "«Necesitan una app de recetas» ya propone una solución. «Al terminar el turno no saben qué cocinar con lo que tienen y acaban improvisando» describe una dificultad que puedes investigar. Quizá una app ayude; quizá sea suficiente una lista o un servicio distinto.",
        "Una propuesta de valor explica para quién trabajas, qué dificultad atiendes y qué mejora esperas aportar. Al principio es una hipótesis: no una promesa demostrada ni una garantía de negocio."
      ]},
      {title:"3. Busca hechos antes de construir", paragraphs:[
        "Pregunta por la última vez que ocurrió el problema. Escucha qué hizo la persona, qué alternativa utilizó y qué le resultó difícil. Una respuesta amable como «qué buena idea» no demuestra uso ni intención de compra.",
        "Anota también las respuestas que contradigan tu idea. Si la dificultad apenas importa o ya está bien resuelta, cambiar de enfoque es aprendizaje. El objetivo de este primer paso es elegir qué investigar después, no decidir que tu proyecto ya está validado."
      ]}
    ],
    practice:{
      intro:"Dedica unos minutos a un problema que hayas observado. Puedes responder en papel o en tus notas; esta demostración no guarda respuestas.",
      steps:[
        "Elige una persona o un grupo concreto al que puedas escuchar.",
        "Describe una situación reciente: ¿qué quería conseguir y qué se lo dificultó?",
        "Escribe cómo lo resuelve hoy. Si no lo sabes, márcalo como «por comprobar».",
        "Redacta una hipótesis: «Creo que [grupo] tiene dificultad para [tarea] cuando [situación]».",
        "Prepara dos preguntas sobre experiencias pasadas, sin presentar ni vender tu solución."
      ],
      example:"Ejemplo de pregunta: «Cuéntame la última vez que llegaste de un turno y tuviste que decidir qué cenar. ¿Qué hiciste?»",
      outcome:"Resultado esperado: una hipótesis concreta, tus dudas identificadas y dos preguntas para investigar. No es todavía una validación de mercado."
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

  function node(tag,className,text) {
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  }
  function list(items,ordered=false) {
    const result=node(ordered ? "ol" : "ul");
    items.forEach(text=>result.append(node("li","",text)));
    return result;
  }
  function panel(title,children,open=false) {
    const details=node("details","learning-panel");details.open=open;
    const body=node("div","learning-panel-body");body.append(...children);
    details.append(node("summary","",title),body);
    return details;
  }
  function lessonView(lesson,routeId,moduleId) {
    const article=node("article");
    const title=node("h4","",lesson.title);title.id=`${routeId}-${moduleId}-${lesson.id}`;
    article.setAttribute("aria-labelledby",title.id);
    article.append(node("p","learning-provisional","Lección de demostración · Contenido provisional"),title,node("p","muted",lesson.duration));
    const explanation=[];
    lesson.explanation.forEach(part=>{
      explanation.push(node("h5","",part.title));
      part.paragraphs.forEach(text=>explanation.push(node("p","",text)));
    });
    article.append(
      panel("1. Resumen rápido",[list(lesson.summary)],true),
      panel("2. Lección completa",explanation),
      panel("3. Ponlo en práctica",[
        node("p","",lesson.practice.intro),list(lesson.practice.steps,true),
        node("blockquote","",lesson.practice.example),node("p","",lesson.practice.outcome)
      ])
    );
    return article;
  }
  const container=document.getElementById("learningRoutes");
  if(!container)return;
  routes.forEach(route=>{
    const section=node("section","learning-route");
    const heading=node("h3","",route.title);heading.id=`route-${route.id}`;
    section.setAttribute("aria-labelledby",heading.id);
    const intro=node("div","card");
    const levels=node("ul","learning-levels");levels.setAttribute("aria-label","Niveles orientativos");
    ["Principiante","Intermedio","Avanzado"].forEach(level=>levels.append(node("li","learning-badge",level)));
    intro.append(node("p","eyebrow",`Ruta práctica · ${route.modules.length} módulos`),heading,node("p","muted",route.description),levels,
      node("p","learning-order","Los niveles son orientativos: todos los módulos están abiertos. Si empiezas de cero, sigue el orden recomendado del 01 al 06."));
    section.append(intro);
    route.modules.forEach((module,index)=>{
      const details=node("details","learning-module");details.open=index===0;
      const summary=node("summary");
      const label=node("span","learning-module-heading");
      label.append(node("span","learning-module-name",module.title),node("span","learning-badge",module.level));
      summary.append(node("span","learning-number",String(index+1).padStart(2,"0")),label);
      const body=node("div","learning-module-body");body.append(node("p","",module.description));
      if(module.lessons.length){
        module.lessons.forEach(lesson=>body.append(lessonView(lesson,route.id,module.id)));
      }else{
        body.append(node("p","learning-provisional","Contenido provisional · Lecciones en preparación"),node("p","","Puedes explorar este módulo libremente. Sus lecciones se añadirán en una próxima fase; no necesitas completar otros módulos para acceder."));
      }
      details.append(summary,body);section.append(details);
    });
    container.append(section);
  });
})();
