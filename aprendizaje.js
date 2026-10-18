/* Interfaz educativa. El catálogo y el guardado viven en archivos independientes. */
(() => {
  const container = document.getElementById("learningRoutes");
  if (!container) return;
  const store = window.MPDLearningStore;
  const routes = window.MPDLearningCatalog;
  const dirty = new Set();
  const editors = [];
  const progressViews = [];
  const completionViews = [];
  window.MPDLearning = Object.freeze({hasUnsavedChanges:() => dirty.size > 0});
  function node(tag,className,text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function button(text,secondary=false) {
    const element = node("button",secondary ? "learning-button learning-secondary" : "learning-button",text);
    element.type = "button";
    return element;
  }
  function list(items,ordered=false) {
    const result = node(ordered ? "ol" : "ul");
    items.forEach(text => result.append(node("li","",text)));
    return result;
  }
  function panel(title,children,open=false) {
    const details = node("details","learning-panel"); details.open = open;
    const body = node("div","learning-panel-body"); body.append(...children);
    details.append(node("summary","",title),body);
    return details;
  }
  const notice = node("p","learning-storage-status");
  notice.setAttribute("role","status");
  container.append(notice);
  function read() {
    try {
      const data = store.read();
      notice.textContent = "Respuestas y progreso guardados solo en este dispositivo. Pulsa Guardar para conservar cada respuesta.";
      notice.classList.remove("learning-error");
      return data;
    } catch (error) {
      notice.textContent = "No se pueden leer los datos educativos. No se han borrado. " + error.message;
      notice.classList.add("learning-error");
      return null;
    }
  }
  let data = read();
  if (!store || !routes) { notice.textContent = "No se pudo cargar Aprendizaje. Vuelve a abrir la aplicación con conexión."; return; }
  function refreshProgress() {
    progressViews.forEach(update => update());
    completionViews.forEach(update => update());
  }
  function exerciseView(exercise,key) {
    const box = node("section","learning-exercise");
    const label = node("label","learning-exercise-label",exercise.prompt);
    const input = node("textarea","learning-answer");
    input.id = "answer-" + key.replaceAll("/","-");
    input.maxLength = 4000;
    input.rows = 4;
    label.htmlFor = input.id;
    const hint = node("p","learning-input-hint",exercise.hint);
    hint.id = input.id + "-hint";
    input.setAttribute("aria-describedby",hint.id);
    const status = node("p","learning-save-status"); status.setAttribute("role","status");
    const actions = node("div","learning-actions");
    const save = button("Guardar respuesta"), edit = button("Editar respuesta",true);
    const consult = button("Consultar respuesta guardada",true), load = button("Cargar guardada",true);
    const preview = node("blockquote","learning-saved-preview"); preview.hidden = true;
    const example = panel("Ver un ejemplo orientativo",[
      node("p","learning-example-note","Es una posibilidad, no la única respuesta correcta. No se evalúa automáticamente tu texto."),
      node("blockquote","",exercise.example),node("h5","","Qué debería tener una buena respuesta"),node("p","",exercise.criteria)
    ]);
    let revision = null, savedText = "", editing = true, saving = false;
    function applySaved(record) {
      revision = record?.revision ?? null;
      savedText = record?.text ?? "";
      input.value = savedText;
      editing = !record;
      input.readOnly = !!record;
      save.hidden = !!record;
      edit.hidden = !record;
      example.hidden = !record;
      status.textContent = record ? "Respuesta guardada en este dispositivo." : "Todavía no has guardado una respuesta.";
      status.classList.remove("learning-error");
      dirty.delete(key);
    }
    applySaved(data?.answers[key]);
    input.addEventListener("input",() => {
      if (input.value !== savedText) dirty.add(key); else dirty.delete(key);
      status.textContent = dirty.has(key) ? "Cambios sin guardar. Pulsa Guardar respuesta." : "Sin cambios pendientes.";
      status.classList.remove("learning-error");
    });
    edit.addEventListener("click",() => {
      editing = true; input.readOnly = false; save.hidden = false; edit.hidden = true;
      status.textContent = "Editando. La respuesta anterior se conserva hasta que guardes.";
      input.focus();
    });
    save.addEventListener("click",async () => {
      if (saving) return;
      if (!input.value.trim()) { status.textContent = "Escribe una respuesta antes de guardar."; status.classList.add("learning-error"); input.focus(); return; }
      saving = true; save.disabled = true; input.readOnly = true;
      try {
        data = await store.saveAnswer(key,input.value,revision);
        applySaved(data.answers[key]);
        status.textContent = "✓ Respuesta guardada correctamente.";
        preview.hidden = true;
        refreshProgress();
      } catch (error) {
        input.readOnly = false;
        status.textContent = "No se ha guardado. " + error.message;
        status.classList.add("learning-error");
      } finally { saving = false; save.disabled = false; }
    });
    consult.addEventListener("click",() => {
      const latest = read();
      if (!latest) return;
      preview.textContent = latest.answers[key]?.text ?? "No hay una respuesta guardada para este ejercicio.";
      preview.hidden = false;
    });
    load.addEventListener("click",() => {
      if (saving) return;
      const latest = read();
      if (!latest) return;
      if (dirty.has(key) && !window.confirm("Se sustituirá el borrador de este campo por la respuesta guardada. ¿Continuar?")) return;
      data = latest; applySaved(latest.answers[key]); preview.hidden = true;
    });
    editors.push(latest => {
      if (!saving && !editing) applySaved(latest.answers[key]);
      else if ((latest.answers[key]?.revision ?? null) !== revision) {
        status.textContent = "La respuesta guardada cambió en otra ventana. Tu borrador se conserva; consulta la guardada antes de continuar.";
        status.classList.add("learning-error");
      }
    });
    actions.append(save,edit);
    const recovery = panel("Consultar o recuperar una respuesta guardada",[consult,load,preview]);
    box.append(label,hint,input,actions,status,example,recovery);
    return box;
  }
  function quizView(quiz,key) {
    const wrapper = node("section","learning-quiz");
    wrapper.append(node("p","learning-input-hint","Autoevaluación de demostración. Puedes repetirla; los intentos no se guardan ni bloquean la lección."));
    quiz.forEach((question,index) => {
      const field = node("fieldset","learning-question");
      field.append(node("legend","",`${index+1}. ${question.question}`));
      const radios = question.options.map((text,i) => {
        const label = node("label","learning-option");
        const input = node("input"); input.type = "radio"; input.name = key + "-" + question.id; input.value = String(i);
        label.append(input,node("span","",text)); field.append(label);
        return input;
      });
      const feedback = node("p","learning-feedback"); feedback.setAttribute("role","status");
      const check = button("Comprobar"), retry = button("Volver a intentarlo",true);
      retry.hidden = true;
      check.addEventListener("click",() => {
        const choice = radios.findIndex(input => input.checked);
        if (choice < 0) { feedback.textContent = "Elige una respuesta para comprobarla."; return; }
        const correct = choice === question.correct;
        feedback.textContent = (correct ? "✓ Correcto. " : "Todavía no. ") + question.explanations[choice];
        feedback.className = "learning-feedback " + (correct ? "learning-correct" : "learning-error");
        radios.forEach(input => { input.disabled = true; });
        check.hidden = true; retry.hidden = false;
      });
      retry.addEventListener("click",() => {
        radios.forEach(input => { input.checked = false; input.disabled = false; });
        feedback.textContent = ""; check.hidden = false; retry.hidden = true;
        radios[0].focus();
      });
      const actions = node("div","learning-actions"); actions.append(check,retry);
      field.append(actions,feedback); wrapper.append(field);
    });
    return wrapper;
  }
  function completionView(lesson,key) {
    const box = node("div","learning-completion");
    const demo = lesson.status !== "published";
    const toggle = button("");
    const status = node("p","learning-save-status"); status.setAttribute("role","status");
    const update = () => {
      const completed = !!data?.completed[key];
      toggle.textContent = completed ? "✓ Completada · Desmarcar" : demo ? "Marcar demostración como completada" : "Marcar lección como completada";
      toggle.setAttribute("aria-pressed",String(completed));
    };
    completionViews.push(update); update();
    toggle.addEventListener("click",async () => {
      toggle.disabled = true;
      try {
        data = await store.setCompleted(key,!data?.completed[key]);
        refreshProgress();
        status.textContent = "✓ Estado guardado en este dispositivo.";
        status.classList.remove("learning-error");
      } catch (error) { status.textContent = "No se ha guardado. " + error.message; status.classList.add("learning-error"); }
      finally { toggle.disabled = false; }
    });
    box.append(node("p","muted",demo ? "Puedes registrar tu práctica de esta demostración. No cuenta como formación publicada ni acredita dominio del tema." : "Marca tu avance cuando consideres terminada la lección. Es un registro personal, no una certificación."),toggle,status);
    return box;
  }
  function lessonView(lesson,routeId,moduleId) {
    const key = `${routeId}/${moduleId}/${lesson.id}`;
    const article = node("article");
    const title = node("h4","",lesson.title); title.id = key.replaceAll("/","-");
    article.setAttribute("aria-labelledby",title.id);
    article.append(node("p","learning-provisional",lesson.status === "published" ? "Lección disponible" : "Demostración interactiva · Contenido provisional"),title,node("p","muted",lesson.duration));
    article.append(panel("Resumen rápido",[list(lesson.summary)]),node("p","learning-input-hint",lesson.practice.intro));
    // Cada paso presenta únicamente su explicación, ejemplo y actividades relacionadas.
    lesson.explanation.forEach((part,index) => {
      const contents = [node("h5","","El concepto")];
      part.paragraphs.forEach(text => contents.push(node("p","",text)));
      contents.push(node("h5","","Un ejemplo sencillo"),node("blockquote","",part.example),node("h5","","Ponlo en práctica"));
      part.exercises.forEach(id => {
        const exercise = lesson.practice.exercises.find(item => item.id === id);
        contents.push(exerciseView(exercise,`${key}/${exercise.id}`));
      });
      const questions = part.questions.map(id => lesson.quiz.find(item => item.id === id));
      contents.push(node("h5","","Comprueba lo aprendido"),quizView(questions,key));
      article.append(panel(`Paso ${part.title}`,contents,index===0));
    });
    article.append(node("p","muted",lesson.practice.outcome));
    article.append(completionView(lesson,key));
    return article;
  }
  routes.forEach(route => {
    const section = node("section","learning-route");
    const heading = node("h3","",route.title); heading.id = `route-${route.id}`;
    section.setAttribute("aria-labelledby",heading.id);
    const intro = node("div","card");
    const levels = node("ul","learning-levels"); levels.setAttribute("aria-label","Niveles orientativos");
    ["Principiante","Intermedio","Avanzado"].forEach(level => levels.append(node("li","learning-badge",level)));
    const progress = node("div","learning-progress");
    const label = node("p","learning-progress-label");
    const bar = node("progress"); bar.max = 100;
    bar.setAttribute("aria-label","Progreso de lecciones publicadas de la ruta");
    const detail = node("p","learning-input-hint");
    progress.append(label,bar,detail);
    progressViews.push(() => {
      const lessons = route.modules.flatMap(module => module.lessons.map(lesson => ({lesson,key:`${route.id}/${module.id}/${lesson.id}`})));
      const published = lessons.filter(item => item.lesson.status === "published");
      const count = published.filter(item => data?.completed[item.key]).length;
      const demos = lessons.filter(item => item.lesson.status === "demo");
      const practiced = demos.filter(item => data?.completed[item.key]).length;
      bar.value = published.length ? Math.round(count/published.length*100) : 0;
      bar.setAttribute("aria-valuetext",published.length ? `${count} de ${published.length} lecciones publicadas completadas` : "Sin lecciones publicadas todavía");
      label.textContent = published.length ? `${count} de ${published.length} lecciones publicadas · ${bar.value} %` : "Ruta en preparación · Sin lecciones publicadas";
      detail.textContent = `${demos.length} demostración disponible · ${practiced} practicada. Los módulos en preparación y las demostraciones no cuentan para el porcentaje de la ruta.`;
    });
    intro.append(node("p","eyebrow",`Ruta práctica · ${route.modules.length} módulos`),heading,node("p","muted",route.description),levels,node("p","learning-order","Los niveles son orientativos: explora sin bloqueos. Si empiezas de cero, sigue el orden del 01 al 06."),progress);
    section.append(intro);
    route.modules.forEach((module,index) => {
      const details = node("details","learning-module"); details.open = index === 0;
      const summary = node("summary");
      const label = node("span","learning-module-heading");
      label.append(node("span","learning-module-name",module.title),node("span","learning-badge",module.level));
      const publishedCount = module.lessons.filter(lesson => lesson.status === "published").length;
      const demoCount = module.lessons.filter(lesson => lesson.status === "demo").length;
      const availability = module.lessons.length ? [
        publishedCount ? `${publishedCount} lecciones disponibles` : "",
        demoCount ? `${demoCount} demostración disponible` : ""
      ].filter(Boolean).join(" · ") || "Contenido en preparación" : "En preparación";
      label.append(node("span","learning-availability",availability));
      summary.append(node("span","learning-number",String(index+1).padStart(2,"0")),label);
      const body = node("div","learning-module-body"); body.append(node("p","",module.description));
      if (module.lessons.length) module.lessons.forEach(lesson => body.append(lessonView(lesson,route.id,module.id)));
      else body.append(node("p","learning-provisional","Contenido provisional · Lecciones en preparación"),node("p","","Este módulo se puede explorar libremente. Sus lecciones aún no están disponibles y no cuentan como progreso."));
      details.append(summary,body); section.append(details);
    });
    container.append(section);
  });
  refreshProgress();
  window.addEventListener("storage",event => {
    if (event.key !== store.key && event.key !== null) return;
    const latest = read();
    if (!latest) return;
    data = latest;
    editors.forEach(update => update(latest));
    refreshProgress();
  });
  window.addEventListener("beforeunload",event => {
    if (!dirty.size) return;
    event.preventDefault(); event.returnValue = "";
  });
})();
