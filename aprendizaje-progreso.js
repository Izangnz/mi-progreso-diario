/* Reglas de progreso de solo lectura, reutilizables por ruta.
   Los logros reflejan acciones guardadas actuales, no premios ni certificaciones.
   No crea claves, migra datos ni guarda recompensas duplicadas. */
(() => {
  function describe(route,data) {
    const lessons = route.modules.flatMap(module => module.lessons
      .filter(lesson => ["demo","published"].includes(lesson.status))
      .map(lesson => ({lesson,module,key:`${route.id}/${module.id}/${lesson.id}`})));
    const entries = lessons.flatMap(item => {
      let content;
      try {content=window.MPDLearningBlocks.normalize(item.lesson);} catch(error) {return [];}
      const exercises = content.exercises.map(exercise => {
        const key = `${item.key}/${exercise.id}`;
        return {key,title:exercise.prompt,saved:!!data?.answers?.[key]?.text?.trim(),target:`practice-${key.replaceAll("/","-")}`};
      });
      return [{...item,content,exercises,saved:exercises.filter(exercise => exercise.saved).length,
        marked:!!data?.completed?.[item.key],target:`completion-${item.key.replaceAll("/","-")}`}];
    });
    const demos = entries.filter(item => item.lesson.status === "demo");
    const activities = demos.flatMap(item => item.exercises);
    const saved = activities.filter(item => item.saved).length;
    const published = entries.filter(item => item.lesson.status === "published");
    const allExercises = entries.flatMap(item => item.exercises);
    const badges = [
      {id:"primera-respuesta",title:"Primer paso práctico",description:"Guardar una respuesta de una lección disponible.",earned:allExercises.some(item => item.saved)},
      {id:"primera-demostracion",title:"Primera demostración",description:"Marcar una demostración como completada.",earned:demos.some(item => item.marked)},
      {id:"practica-demostracion",title:"Ideas en práctica",description:"Guardar todos los ejercicios de una demostración disponible.",earned:demos.some(item => item.exercises.length > 0 && item.saved === item.exercises.length)}
    ];
    let next;
    // Respeta los pasos pedagógicos del catálogo, aunque los ejercicios cambien de orden.
    for (const item of entries) {
      const order = item.content.steps.flatMap(part => part.blocks.filter(block=>block.type==="exercise").map(block=>block.exerciseId));
      const pending = order.map(id => item.exercises.find(exercise => exercise.key.endsWith("/"+id))).find(exercise => exercise && !exercise.saved);
      if (pending) {
        next = {title:"Continúa con una actividad",description:`${item.lesson.title}: ${pending.title} Lee primero el concepto y su ejemplo en ese paso.`,target:pending.target,button:"Ir al siguiente ejercicio"};
        break;
      }
      if (!item.marked) {
        next = {title:"Cierra tu práctica",description:item.exercises.length ? "Tus respuestas están guardadas. Repasa las preguntas de cada paso y, cuando lo consideres terminado, marca la lección. Las autoevaluaciones no se guardan." : "Revisa las actividades y el criterio de finalización de esta lección. Reproducir un recurso no demuestra comprensión.",target:item.target,button:"Revisar finalización"};
        break;
      }
    }
    if (!next) next = entries.length ? {
      title:"Práctica disponible realizada",
      description:"Has guardado los ejercicios y marcado las lecciones disponibles. Puedes repasar sus ejemplos y repetir las autoevaluaciones. Los próximos módulos siguen en preparación.",
      target:`${route.id}-${entries[0].module.id}`,button:"Repasar lo aprendido"
    } : {title:"Contenido en preparación",description:"Todavía no hay actividades disponibles en esta ruta."};
    return {entries,demos,published,activities,saved,badges,next};
  }
  // Criterios explícitos para futuras lecciones, sin nuevos campos de almacenamiento.
  // manual conserva exactamente la regla existente. No hay criterio «vídeo visto».
  function completionPolicy(lesson,data,key) {
    let content;
    try {content=window.MPDLearningBlocks.normalize(lesson);} catch(error) {return {eligible:false,message:error.message};}
    const rule=content.completion;
    if(rule.type==="manual")return {eligible:true,message:rule.description || "Finalización personal al terminar la revisión y la práctica."};
    if(rule.type==="saved-exercises") {
      const ids=rule.exerciseIds || content.exercises.map(exercise=>exercise.id);
      const valid=Array.isArray(ids) && ids.length>0 && ids.every(id=>content.exercises.some(exercise=>exercise.id===id));
      return {eligible:!!valid && ids.every(id=>data?.answers?.[`${key}/${id}`]?.text?.trim()),message:"Este criterio requiere guardar los ejercicios indicados; no evalúa automáticamente su calidad."};
    }
    return {eligible:false,message:"El criterio de finalización de esta lección aún no está definido o implementado."};
  }
  window.MPDLearningProgress = Object.freeze({describe,completionPolicy});
})();
