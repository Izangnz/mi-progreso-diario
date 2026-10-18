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
  let storageProblem = false;
  function read() {
    try {
      const data = store.read();
      storageProblem = false;
      notice.textContent = "Respuestas y progreso guardados solo en este dispositivo. Pulsa Guardar para conservar cada respuesta.";
      notice.classList.remove("learning-error");
      return data;
    } catch (error) {
      storageProblem = true;
      notice.hidden = false;
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
  // Las vistas se construyen una sola vez: ocultarlas conserva los borradores.
  const preferences = window.MPDLearningPreferences;
  const screens = new Map(), targetScreens = new Map(), modeViews = [];
  let currentScreen = "learning-home";
  let chosenModes = {};
  const preferenceNotice = node("p","learning-save-status");
  preferenceNotice.setAttribute("role","status");preferenceNotice.hidden=true;
  container.append(preferenceNotice);
  function preferenceError(error) {
    preferenceNotice.hidden=false;
    preferenceNotice.textContent="La modalidad está disponible durante esta sesión, pero no se ha guardado. "+error.message;
  }
  try { chosenModes={...preferences.read().routes}; }
  catch(error) { preferenceNotice.hidden=false;preferenceNotice.textContent="No se han podido leer las modalidades. Puedes elegir una para esta sesión. "+error.message; }
  function makeScreen(id,title,back) {
    const element=node("section","learning-screen");element.id=id;element.hidden=true;
    const header=node("div","learning-screen-header");
    if(back){const buttonBack=button("← Volver",true);buttonBack.addEventListener("click",back);header.append(buttonBack);}
    const heading=node("h3","learning-screen-title",title);heading.tabIndex=-1;
    heading.id=id+"-title";element.setAttribute("aria-labelledby",heading.id);
    header.append(heading);element.append(header);container.append(element);
    screens.set(id,{element,heading});return element;
  }
  function showScreen(id,focus=true) {
    const selected=screens.get(id);if(!selected)return;
    screens.forEach((screen,key)=>{screen.element.hidden=key!==id;});currentScreen=id;
    notice.hidden=!storageProblem && !id.startsWith("lesson-");
    if(focus){selected.heading.focus({preventScroll:true});selected.element.scrollIntoView({block:"start",behavior:"auto"});}
  }
  const routeScreenId=routeId=>"route-"+routeId;
  const moduleScreenId=(routeId,moduleId)=>`${routeId}-${moduleId}`;
  const lessonScreenId=key=>"lesson-"+key.replaceAll("/","-");
  const modeChoosers=new Map();
  function updateModes(){modeViews.forEach(update=>update());}
  function openChooser(routeId,after) {
    const chooser=modeChoosers.get(routeId);
    chooser.back=currentScreen;chooser.after=after;showScreen(chooser.id);
  }
  function ensureMode(routeId,after) {
    if(chosenModes[routeId])after();else openChooser(routeId,after);
  }
  function jumpTo(id) {
    const destination=targetScreens.get(id);if(!destination)return;
    ensureMode(destination.routeId,()=>{
      showScreen(destination.screenId);
      const resolved=destination.showStep ? destination.showStep() || id : id;
      const target=document.getElementById(resolved);if(!target)return;
      for(let parent=target;parent;parent=parent.parentElement){if(parent.tagName==="DETAILS")parent.open=true;}
      target.tabIndex=-1;target.focus({preventScroll:true});
      target.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
    });
  }
  function modeBar(route) {
    const bar=node("div","learning-mode-bar"),text=node("span","learning-input-hint");
    const change=button("Cambiar modalidad",true);
    change.addEventListener("click",()=>{const previous=currentScreen;openChooser(route.id,()=>showScreen(previous));});
    modeViews.push(()=>{text.textContent="Modalidad: "+(preferences.modes[chosenModes[route.id]] || "Por elegir");});
    bar.append(text,change);return bar;
  }
  function buildChooser(route) {
    const id="mode-"+route.id,chooser={id,back:"learning-explore",after:()=>showScreen(routeScreenId(route.id))};
    modeChoosers.set(route.id,chooser);
    const view=makeScreen(id,"¿Cómo quieres aprender?",()=>showScreen(chooser.back));
    view.append(node("p","muted","El contenido es el mismo. Solo cambia cómo navegas; puedes cambiar de modalidad cuando quieras."));
    const descriptions={guided:"Un paso cada vez: concepto, ejemplo, práctica y pregunta.",quick:"Resumen y accesos rápidos a cada paso, concepto y ejercicio.",free:"Todos los módulos y pasos abiertos a tu elección, sin bloqueos."};
    const choices=[];let choosing=false;
    Object.entries(preferences.modes).forEach(([mode,label])=>{
      const choice=button("",true);choice.className+=" learning-mode-choice";
      choice.append(node("strong","",label),node("span","",descriptions[mode]));
      choice.addEventListener("click",async()=>{
        if(choosing)return;choosing=true;choices.forEach(item=>{item.disabled=true;});
        try {const saved=await preferences.save(route.id,mode);chosenModes={...saved.routes};preferenceNotice.hidden=true;}
        catch(error){chosenModes[route.id]=mode;preferenceError(error);}
        finally {choosing=false;choices.forEach(item=>{item.disabled=false;});}
        updateModes();
        if(currentScreen===id)chooser.after();
      });
      choices.push(choice);view.append(choice);
      modeViews.push(()=>{choice.setAttribute("aria-pressed",String(chosenModes[route.id]===mode));});
    });
  }
  function practiceDetails(route) {
    const box=node("section","card learning-practice-progress");
    const label=node("p","learning-progress-label"),bar=node("progress"),detail=node("p","learning-input-hint");
    bar.max=100;bar.setAttribute("aria-label","Práctica escrita de demostración");
    box.append(node("h4","learning-dashboard-title",route.title),label,bar,detail,node("p","learning-input-hint","Las respuestas guardadas no acreditan dominio del tema. La demostración no completa la ruta; las autoevaluaciones son repetibles y no guardan intentos."));
    const achievements=panel("Tus tres logros de práctica",[]),list=node("ul","learning-achievements");
    const status=node("p","learning-save-status");status.setAttribute("role","status");
    achievements.children[1].append(node("p","learning-input-hint","Reflejan tus acciones guardadas actuales. No son certificados."),list,status);box.append(achievements);
    let previous=null;
    progressViews.push(()=>{
      if(!data){label.textContent="Progreso no disponible. Revisa el aviso de almacenamiento.";return;}
      const model=window.MPDLearningProgress.describe(route,data);
      label.textContent=`${model.saved}/${model.activities.length} respuestas de demostración guardadas`;
      bar.value=model.activities.length ? Math.round(model.saved/model.activities.length*100) : 0;
      bar.setAttribute("aria-valuetext",label.textContent);
      const completed=model.published.filter(item=>item.marked).length;
      detail.textContent=`${model.demos.filter(item=>item.marked).length}/${model.demos.length} demostraciones marcadas. Formación publicada: ${model.published.length ? completed+"/"+model.published.length+" lecciones" : "todavía no hay lecciones publicadas"}.`;
      list.replaceChildren();
      model.badges.forEach(badge=>{
        const item=node("li",`learning-achievement${badge.earned ? " is-earned" : ""}`);
        item.append(node("span","learning-achievement-state",badge.earned ? "✓ Obtenido" : "Pendiente"),node("strong","",badge.title),node("span","",badge.description));list.append(item);
      });
      const earned=new Set(model.badges.filter(badge=>badge.earned).map(badge=>badge.id));
      achievements.children[0].textContent=`Tus logros · ${earned.size}/${model.badges.length}`;
      if(previous)status.textContent=model.badges.filter(badge=>badge.earned&&!previous.has(badge.id)).map(badge=>"Logro obtenido: "+badge.title).join(". ");
      previous=earned;
    });return box;
  }
  function routeMap(route) {
    const nav=node("nav","learning-map");nav.setAttribute("aria-label","Módulos de "+route.title);
    const list=node("ol","learning-map-list");nav.append(node("h4","learning-dashboard-title","Tu recorrido"),node("p","learning-input-hint","Orden recomendado del 01 al 06. Entra libremente en cualquier módulo."),list);
    route.modules.forEach((module,index)=>{
      const item=node("li","learning-map-item"),entry=button("",true);entry.className+=" learning-map-button";
      const copy=node("span","learning-map-copy"),state=node("span","learning-map-state");
      copy.append(node("span","learning-map-title",module.title),node("span","learning-map-level",module.level),state);
      entry.append(node("span","learning-map-number",String(index+1).padStart(2,"0")),copy);
      const target=moduleScreenId(route.id,module.id);entry.setAttribute("aria-controls",target);
      entry.addEventListener("click",()=>showScreen(target));item.append(entry);list.append(item);
      progressViews.push(()=>{
        const model=window.MPDLearningProgress.describe(route,data);
        const lessons=model.entries.filter(item=>item.module.id===module.id);
        const total=lessons.reduce((sum,item)=>sum+item.exercises.length,0),saved=lessons.reduce((sum,item)=>sum+item.saved,0);
        state.textContent=!lessons.length ? "En preparación · Explorar" : (lessons.every(item=>item.lesson.status==="demo") ? "Demostración" : "Disponible")+(data ? ` · ${saved}/${total} respuestas` : " · Progreso no disponible");
        entry.classList.toggle("learning-map-done",!!data&&lessons.length>0&&lessons.every(item=>item.marked&&item.saved===item.exercises.length));
      });
    });return nav;
  }
  function exerciseView(exercise,key) {
    const box = node("section","learning-exercise");
    box.id = `practice-${key.replaceAll("/","-")}`;
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
      data = latest; applySaved(latest.answers[key]); preview.hidden = true; refreshProgress();
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
    box.id = `completion-${key.replaceAll("/","-")}`;
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
    const key=`${routeId}/${moduleId}/${lesson.id}`,screenId=lessonScreenId(key);
    const article=node("article");
    const title=node("h4","",lesson.title);title.id=key.replaceAll("/","-");article.setAttribute("aria-labelledby",title.id);
    article.append(node("p","learning-provisional",lesson.status==="published" ? "Lección disponible" : "Demostración interactiva · Contenido provisional"),title,node("p","muted",lesson.duration));
    const summary=panel("Resumen rápido",[list(lesson.summary)]);
    article.append(summary,node("p","learning-input-hint",lesson.practice.intro));
    const quick=node("nav","learning-quick-links");quick.setAttribute("aria-label","Accesos a los pasos de la lección");article.append(quick);
    const stepPanels=[];let step=0,lastMode;
    const controls=node("div","learning-step-controls"),previous=button("← Paso anterior",true),next=button("Siguiente paso →"),counter=node("p","learning-input-hint");
    function applyMode() {
      const mode=chosenModes[routeId] || "guided";
      const changed=mode!==lastMode;
      summary.open=mode==="quick" ? true : changed ? false : summary.open;
      quick.hidden=mode!=="quick";controls.hidden=mode!=="guided";
      stepPanels.forEach((part,index)=>{
        part.hidden=mode==="guided" && index!==step;
        if(mode==="guided")part.open=true;
        else if(changed)part.open=index===0 && mode==="free";
      });
      previous.disabled=step===0;next.disabled=step===stepPanels.length-1;
      counter.textContent=`Paso ${step+1} de ${stepPanels.length} · Puedes volver o explorar sin bloqueos.`;
      completion.hidden=mode==="guided" && step!==stepPanels.length-1;
      lastMode=mode;
    }
    function reveal(index) {step=index;applyMode();return chosenModes[routeId]==="guided" ? stepPanels[index].id : null;}
    function navigateStep(index) {
      if(index<0||index>=stepPanels.length)return;
      reveal(index);stepPanels[index].tabIndex=-1;stepPanels[index].focus({preventScroll:true});stepPanels[index].scrollIntoView({block:"start",behavior:"auto"});
    }
    lesson.explanation.forEach((part,index)=>{
      const contents=[node("h5","","El concepto")];part.paragraphs.forEach(text=>contents.push(node("p","",text)));
      contents.push(node("h5","","Un ejemplo sencillo"),node("blockquote","",part.example),node("h5","","Ponlo en práctica"));
      part.exercises.forEach(id=>{
        const exercise=lesson.practice.exercises.find(item=>item.id===id);
        contents.push(exerciseView(exercise,`${key}/${exercise.id}`));
        targetScreens.set(`practice-${key.replaceAll("/","-")}-${id}`,{routeId,screenId,showStep:()=>reveal(index)});
      });
      contents.push(node("h5","","Comprueba lo aprendido"),quizView(part.questions.map(id=>lesson.quiz.find(item=>item.id===id)),key));
      const view=panel(`Paso ${part.title}`,contents,index===0);view.id=`step-${key.replaceAll("/","-")}-${index}`;
      view.classList.add("learning-lesson-step");stepPanels.push(view);article.append(view);
      const link=button(`Paso ${index+1}`,true);link.addEventListener("click",()=>{view.open=true;view.tabIndex=-1;view.focus({preventScroll:true});view.scrollIntoView({block:"start",behavior:"auto"});});quick.append(link);
      const practiceLink=button(`Práctica ${index+1}`,true);practiceLink.addEventListener("click",()=>jumpTo(`practice-${key.replaceAll("/","-")}-${part.exercises[0]}`));quick.append(practiceLink);
    });
    const completion=completionView(lesson,key);
    targetScreens.set(`completion-${key.replaceAll("/","-")}`,{routeId,screenId,showStep:()=>{reveal(stepPanels.length-1);return null;}});
    previous.addEventListener("click",()=>navigateStep(step-1));next.addEventListener("click",()=>navigateStep(step+1));controls.append(counter,previous,next);
    article.append(controls,node("p","muted",lesson.practice.outcome),completion);
    modeViews.push(applyMode);
    return article;
  }
  // Portada: solo tres puntos de entrada. Los formularios viven en vistas propias.
  const home=makeScreen("learning-home","Aprende a tu ritmo");
  const continueCard=node("section","card learning-next"),continueTitle=node("h4","learning-dashboard-title","Continuar aprendiendo"),continueText=node("p","muted"),continueButton=button("Continuar");
  continueCard.append(continueTitle,continueText,continueButton);home.append(continueCard);
  const exploreCard=node("section","card"),exploreButton=button("Explorar rutas",true);
  exploreCard.append(node("h4","learning-dashboard-title","Explorar rutas"),node("p","muted","Emprendimiento y nuevas áreas por descubrir."),exploreButton);home.append(exploreCard);
  const progressCard=node("section","card"),compactProgress=node("p","muted"),progressButton=button("Ver mi progreso",true);
  progressCard.append(node("h4","learning-dashboard-title","Mi progreso"),compactProgress,progressButton);home.append(progressCard);
  const explore=makeScreen("learning-explore","Explorar rutas",()=>showScreen("learning-home"));
  const progressPage=makeScreen("learning-progress","Mi progreso",()=>showScreen("learning-home"));
  exploreButton.addEventListener("click",()=>showScreen("learning-explore"));progressButton.addEventListener("click",()=>showScreen("learning-progress"));
  let continueDestination;
  continueButton.addEventListener("click",()=>{if(continueDestination)jumpTo(continueDestination);});
  progressViews.push(()=>{
    if(!data){continueText.textContent="No se pudo leer tu progreso. Revisa el aviso antes de continuar.";continueButton.disabled=true;compactProgress.textContent="Progreso no disponible.";return;}
    const models=routes.map(route=>({route,model:window.MPDLearningProgress.describe(route,data)}));
    const active=models.find(item=>item.model.entries.some(lesson=>!lesson.marked||lesson.saved<lesson.exercises.length)) || models.find(item=>item.model.entries.length);
    continueButton.disabled=!active;
    continueDestination=active?.model.next.target;
    continueText.textContent=active ? `${active.route.title} · ${active.model.next.title}` : "Todavía no hay actividades disponibles.";
    const saved=models.reduce((sum,item)=>sum+item.model.saved,0),total=models.reduce((sum,item)=>sum+item.model.activities.length,0),badges=models.reduce((sum,item)=>sum+item.model.badges.filter(badge=>badge.earned).length,0);
    compactProgress.textContent=`${saved}/${total} respuestas de demostración · ${badges} logros obtenidos`;
  });
  routes.forEach(route=>{
    buildChooser(route);
    const entry=node("section","card learning-route-entry"),enter=button("Entrar en la ruta");
    entry.append(node("p","eyebrow","Ruta activa · Demostración provisional"),node("h4","learning-dashboard-title",route.title),node("p","muted",route.description),enter);explore.append(entry);
    enter.addEventListener("click",()=>ensureMode(route.id,()=>showScreen(routeScreenId(route.id))));
    const routePage=makeScreen(routeScreenId(route.id),route.title,()=>showScreen("learning-explore"));
    routePage.classList.add("learning-route");
    const intro=node("section","card");
    intro.append(node("p","muted",route.description),node("p","learning-badge","Principiante → Avanzado · Niveles orientativos"),node("p","learning-provisional","Contenido provisional. Una demostración disponible; otros módulos en preparación."),modeBar(route));
    const brief=node("p","learning-input-hint");intro.append(brief);routePage.append(intro,routeMap(route));
    progressViews.push(()=>{
      if(!data){brief.textContent="Progreso no disponible.";return;}
      const model=window.MPDLearningProgress.describe(route,data);
      brief.textContent=`Práctica: ${model.saved}/${model.activities.length} respuestas guardadas. Formación publicada: ${model.published.length ? model.published.filter(item=>item.marked).length+"/"+model.published.length+" lecciones" : "todavía no hay lecciones publicadas"}.`;
    });
    progressPage.append(practiceDetails(route));
    route.modules.forEach((module,index)=>{
      const moduleId=moduleScreenId(route.id,module.id);
      const modulePage=makeScreen(moduleId,module.title,()=>showScreen(routeScreenId(route.id)));
      targetScreens.set(moduleId,{routeId:route.id,screenId:moduleId});
      modulePage.append(node("p","eyebrow",`Módulo ${String(index+1).padStart(2,"0")} · ${module.level}`),node("p","muted",module.description),modeBar(route));
      if(!module.lessons.length){modulePage.append(node("div","learning-notice","Lecciones en preparación. Puedes explorar este módulo, pero todavía no tiene actividades ni cuenta como progreso."));return;}
      module.lessons.forEach(lesson=>{
        const key=`${route.id}/${module.id}/${lesson.id}`,id=lessonScreenId(key),card=node("section","card"),open=button("Abrir lección");
        card.append(node("p","learning-provisional",lesson.status==="published" ? "Lección publicada" : "Demostración interactiva · Provisional"),node("h4","learning-dashboard-title",lesson.title),node("p","muted",lesson.duration),open);modulePage.append(card);
        const lessonPage=makeScreen(id,lesson.title,()=>showScreen(moduleId));lessonPage.append(modeBar(route),lessonView(lesson,route.id,module.id));
        open.addEventListener("click",()=>showScreen(id));
      });
    });
  });
  // Áreas futuras: solo metadatos de navegación, sin cursos ni recursos inventados.
  // Las futuras portadas multimedia podrán asociarse al id de área/ruta.
  [{id:"desarrollo-personal",title:"Desarrollo personal"},{id:"inteligencia-artificial",title:"Inteligencia artificial"},{id:"programacion",title:"Programación"}].forEach(area=>{
    const card=node("section","card learning-planned-area");card.dataset.areaId=area.id;
    card.append(node("h4","learning-dashboard-title",area.title),node("p","learning-input-hint","Área prevista · Todavía sin rutas disponibles"));explore.append(card);
  });
  updateModes();
  refreshProgress();
  showScreen("learning-home",false);
  window.addEventListener("storage",event => {
    if(event.key===preferences.key || event.key===null) {
      try {chosenModes={...preferences.read().routes};updateModes();}
      catch(error){preferenceError(error);}
    }
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
