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
  const globalIssues=new Set();
  function learningIssue(key,failed){
    if(failed)globalIssues.add(key);else globalIssues.delete(key);
    const target=document.getElementById("learningGlobalStatus");
    if(target){target.hidden=!globalIssues.size;target.textContent=globalIssues.size ? "Aviso: hay datos educativos o preferencias que no se han podido leer o guardar. Revisa Aprendizaje; los borradores se conservan durante la navegación." : "";}
  }
  let dashboardRecommendation={available:false,text:"Preparando tu siguiente paso…"};
  function syncLearningDashboard(){
    const text=document.getElementById("dashboardLearningText"),action=document.getElementById("dashboardLearningButton");
    if(text)text.textContent=dashboardRecommendation.text;
    if(action)action.disabled=!dashboardRecommendation.available;
  }
  window.MPDLearning = Object.freeze({hasUnsavedChanges:() => dirty.size > 0 || !!window.MPDMission?.hasUnsavedChanges(),
    continueRecommended:()=>{window.MPDMission?.suspend();if(dashboardRecommendation.available && continueDestination)jumpTo(continueDestination);}
  });
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
      storageProblem = false;learningIssue("read",false);
      notice.textContent = "Respuestas y progreso guardados solo en este dispositivo. Pulsa Guardar para conservar cada respuesta.";
      notice.classList.remove("learning-error");
      return data;
    } catch (error) {
      storageProblem = true;learningIssue("read",true);
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
  const returnScreens=new Map();
  let currentScreen = "learning-home";
  let chosenModes = {};
  const preferenceNotice = node("p","learning-save-status");
  preferenceNotice.setAttribute("role","status");preferenceNotice.hidden=true;
  container.append(preferenceNotice);
  function preferenceError(error) {
    learningIssue("preferences",true);
    preferenceNotice.hidden=false;
    preferenceNotice.textContent="La modalidad está disponible durante esta sesión, pero no se ha guardado. "+error.message;
  }
  try { chosenModes={...preferences.read().routes}; }
  catch(error) { learningIssue("preferences",true);preferenceNotice.hidden=false;preferenceNotice.textContent="No se han podido leer las modalidades. Puedes elegir una para esta sesión. "+error.message; }
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
    if(id!==currentScreen && !currentScreen.startsWith("mode-") && !currentScreen.startsWith("resources-") &&
      (id.startsWith("lesson-") || (id.startsWith("route-") && ["learning-home","learning-explore"].includes(currentScreen))))returnScreens.set(id,currentScreen);
    screens.forEach((screen,key)=>{screen.element.hidden=key!==id;});currentScreen=id;
    container.querySelectorAll("video, audio").forEach(media=>{if(!selected.element.contains(media))media.pause();});
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
    after(); // Sin preferencia: modo guiado, sin escritura automática.
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
    modeViews.push(()=>{text.textContent="Modalidad: "+(preferences.modes[chosenModes[route.id]] || "Desde cero");});
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
        try {const saved=await preferences.save(route.id,mode);chosenModes={...saved.routes};preferenceNotice.hidden=true;learningIssue("preferences",false);}
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
        applySaved(data.answers[key]);learningIssue(key,false);
        status.textContent = "✓ Respuesta guardada correctamente.";
        preview.hidden = true;
        refreshProgress();
      } catch (error) {
        learningIssue(key,true);input.readOnly = false;
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
      field.id = `question-${key.replaceAll("/","-")}-${question.id}`;
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
      const policy=window.MPDLearningProgress.completionPolicy(lesson,data,key);
      toggle.textContent = completed ? "✓ Completada · Desmarcar" : demo ? "Marcar demostración como completada" : "Marcar lección como completada";
      toggle.setAttribute("aria-pressed",String(completed));
      toggle.disabled=!completed && !policy.eligible;
      criterion.textContent=policy.message;
    };
    const criterion=node("p","learning-input-hint");
    completionViews.push(update); update();
    toggle.addEventListener("click",async () => {
      if(!data?.completed[key] && !window.MPDLearningProgress.completionPolicy(lesson,data,key).eligible)return;
      toggle.disabled = true;
      try {
        data = await store.setCompleted(key,!data?.completed[key]);learningIssue("completion-"+key,false);
        refreshProgress();
        status.textContent = "✓ Estado guardado en este dispositivo.";
        status.classList.remove("learning-error");
      } catch (error) { learningIssue("completion-"+key,true);status.textContent = "No se ha guardado. " + error.message; status.classList.add("learning-error"); }
      finally { update(); }
    });
    box.append(node("p","muted",demo ? "Puedes registrar tu práctica de esta demostración. No cuenta como formación publicada ni acredita dominio del tema." : "Marca tu avance cuando consideres terminada la lección. Es un registro personal, no una certificación."),criterion,toggle,status);
    return box;
  }
  function localResource(value) {
    if(typeof value!=="string" || !value.trim())return null;
    try {
      const base=new URL(".",document.baseURI),url=new URL(value,base);
      // Esta fase solo admite archivos del propio proyecto. Ninguna URL externa.
      return ["http:","https:","file:"].includes(url.protocol) && url.protocol===base.protocol &&
        url.origin===base.origin && url.pathname.startsWith(base.pathname) ? url.href : null;
    } catch(error){return null;}
  }
  function paragraphContent(value) {
    return (Array.isArray(value) ? value : typeof value==="string" ? [value] : []).filter(text=>typeof text==="string" && text.trim());
  }
  function mediaFallback(block) {
    const alternative=node("div","learning-resource-alternative");
    const visual=block.fallback?.visual;
    if(Array.isArray(visual) && visual.length) {
      const flow=node("ol","learning-concept-flow");
      visual.forEach(item=>{const cell=node("li");cell.append(node("strong","",item.label),node("span","",item.text));flow.append(cell);});
      alternative.append(flow);
    }
    const text=paragraphContent(block.fallback?.paragraphs);
    (text.length ? text : paragraphContent(block.transcript)).forEach(value=>alternative.append(node("p","",value)));
    if(!alternative.children.length)alternative.append(node("p","","Este recurso no está disponible. Puedes continuar con la explicación y las actividades del paso."));
    return alternative;
  }
  function resourceView(block,key) {
    const box=node("figure","learning-resource");
    box.append(node("p","learning-resource-title",block.title || ({video:"Vídeo",audio:"Audio",image:"Recurso visual"})[block.type]));
    const status=node("p","learning-resource-status");status.id=`resource-status-${key.replaceAll("/","-")}-${block.id}`;
    status.setAttribute("role","status");
    const fallback=mediaFallback(block);
    const source=localResource(block.src);
    const accessibleImage=block.decorative===true || typeof block.alt==="string" && !!block.alt.trim();
    if(!source || block.type==="image" && !accessibleImage) {
      status.textContent=block.type==="image" ? "Alternativa visual en HTML · Sin archivo de imagen publicado." : `${block.type==="video" ? "Vídeo" : "Audio"} en preparación · Aprende con la alternativa escrita.`;
      box.append(status,fallback);
    } else {
      const media=node(block.type==="image" ? "img" : block.type,"learning-native-media");
      box.append(media);
      media.setAttribute("aria-describedby",status.id);
      fallback.hidden=true;
      if(block.type==="image") {
        media.alt=block.decorative ? "" : block.alt;media.loading="lazy";media.decoding="async";
        media.addEventListener("load",()=>{media.hidden=false;fallback.hidden=true;status.textContent="Ilustración disponible.";});
      } else {
        media.controls=true;media.preload="none";media.autoplay=false;
        media.setAttribute("aria-label",block.title || (block.type==="video" ? "Vídeo educativo" : "Audio educativo"));
        if(block.type==="video") {
          media.playsInline=true;media.setAttribute("playsinline","");
          const poster=localResource(block.poster);if(poster)media.poster=poster;
          (Array.isArray(block.captions) ? block.captions : []).forEach(caption=>{
            const captionSource=localResource(caption.src);if(!captionSource)return;
            const track=node("track");track.kind=caption.kind==="subtitles" ? "subtitles" : "captions";
            track.srclang=caption.lang || "es";track.label=caption.label || "Español";track.default=!!caption.default;
            track.addEventListener("error",()=>{status.textContent="No se pudieron cargar los subtítulos. Consulta la transcripción o la alternativa escrita.";});
            track.src=captionSource;media.append(track);
          });
        }
        media.addEventListener("loadeddata",()=>{media.hidden=false;fallback.hidden=true;status.textContent="Recurso listo. Puedes reproducirlo con sus controles.";});
        const originalTranscript=paragraphContent(block.transcript);
        const transcript=originalTranscript.length ? originalTranscript : paragraphContent(block.fallback?.paragraphs);
        if(transcript.length)box.append(panel("Leer transcripción",transcript.map(text=>node("p","",text))));
      }
      status.textContent="Recurso local. Se cargará al solicitarlo; no se descarga para uso sin conexión.";
      media.addEventListener("error",()=>{
        if(typeof media.pause==="function")media.pause();
        media.hidden=true;fallback.hidden=false;
        status.textContent="No se pudo cargar el recurso. La alternativa educativa sigue disponible.";
      });
      // No se solicita ningún archivo si no hay una ruta local válida.
      media.src=source;box.append(status,fallback);
    }
    if(block.caption)box.append(node("figcaption","learning-input-hint",block.caption));
    return box;
  }
  function blockView(block,content,key) {
    let view;
    if(["video","audio","image"].includes(block.type))view=resourceView(block,key);
    else if(block.type==="explanation") {
      view=node("div","learning-brief-explanation");paragraphContent(block.paragraphs).forEach(text=>view.append(node("p","",text)));
    } else if(block.type==="example")view=node("blockquote","",block.text);
    else if(block.type==="exercise")view=exerciseView(content.exercises.find(item=>item.id===block.exerciseId),`${key}/${block.exerciseId}`);
    else if(block.type==="question")view=quizView([content.questions.find(item=>item.id===block.questionId)],key);
    view.dataset.blockId=block.id;view.dataset.blockType=block.type;
    if(!view.id)view.id=`block-${key.replaceAll("/","-")}-${block.id}`;
    return view;
  }
  // Una presentación adicional sobre las mismas actividades; no crea respuestas duplicadas.
  function journeyView(lesson,routeId,key,screenId,original) {
    const outer=node("div","learning-journey"),pages=[],links=[];
    let completion;
    const meter=node("progress","learning-journey-progress");meter.max=5;
    meter.setAttribute("aria-label","Posición en el recorrido; no mide dominio del tema");
    const position=node("p","learning-input-hint");position.setAttribute("role","status");
    const index=node("nav","learning-journey-index");index.setAttribute("aria-label","Pantallas del recorrido");
    const titles=["Introducción","Primera decisión","Historia interactiva","Conceptos clave","Reto práctico","Cierre del recorrido"];
    const body=node("div"),actions=node("div","learning-actions");
    const back=button("← Anterior",true),next=button("Continuar →");let current=0;
    function show(value,focus=true) {
      current=value;if(completion)completion.hidden=false;pages.forEach((page,i)=>{page.hidden=i!==current;});meter.value=current;
      position.textContent=`Pantalla ${current+1} de 6 · Recorrido de demostración`;
      links.forEach((link,i)=>link.setAttribute("aria-pressed",String(i===current)));
      back.disabled=current===0;next.hidden=current===5;next.textContent=current===0 ? "¡Empezar!" : "Continuar →";
      if(focus){pages[current].tabIndex=-1;pages[current].focus({preventScroll:true});pages[current].scrollIntoView({block:"start",behavior:"auto"});}
    }
    titles.forEach((title,i)=>{
      const page=node("section","learning-journey-page");page.id=`${lesson.journey.id}-${i+1}`;
      page.append(node("p","eyebrow",`Paso ${i+1}`),node("h4","",title));pages.push(page);body.append(page);
      const link=button(`${i+1}. ${title}`,true);link.addEventListener("click",()=>show(i));links.push(link);index.append(link);
    });
    function visualCards(items,label) {
      const flow=node("ol","learning-visual-story");flow.setAttribute("aria-label",label);
      items.forEach(item=>{const card=node("li","learning-story-card"),icon=node("span","learning-story-icon "+(item.art || ""),item.symbol || "");icon.setAttribute("aria-hidden","true");card.append(icon,node("strong","",item.title),node("span","",item.text));flow.append(card);});return flow;
    }
    pages[0].append(node("p","learning-journey-lead","Primero comprende. Después propone."),visualCards(lesson.journey.visuals.intro,"De la persona a la investigación"),node("p","learning-provisional","Demostración · Decide, descubre y practica. Sin penalizaciones."));
    function decision(page,question) {
      page.append(node("p","learning-concept-note","Primero escucha una dificultad real. Después piensa qué ofrecer."));
      const field=node("fieldset","learning-question");field.append(node("legend","",question.question));
      const choices=[],feedback=node("p","learning-feedback");feedback.setAttribute("role","status");
      const discover=panel("Por qué investigamos primero",[node("p","","Una idea es una posibilidad. Escuchar qué ocurrió, qué intentó la persona y qué le costó permite comprobar si existe un problema real.")]);
      question.options.forEach((text,i)=>{
        const choice=button(text,true);choice.classList.add("learning-decision-card");choice.setAttribute("aria-pressed","false");
        choice.addEventListener("click",()=>{
          choices.forEach((item,j)=>{item.setAttribute("aria-pressed",String(j===i));item.classList.remove("is-correct","is-retry");});
          choice.classList.add(i===question.correct ? "is-correct" : "is-retry");
          feedback.textContent=(i===question.correct ? "✓ Buena decisión. " : "Puedes probar otra opción. ")+question.explanations[i];
          discover.hidden=false;
        });choices.push(choice);field.append(choice);
      });
      const retry=button("Volver a intentarlo",true);retry.addEventListener("click",()=>{
        choices.forEach(item=>{item.setAttribute("aria-pressed","false");item.classList.remove("is-correct","is-retry");});feedback.textContent="Sin penalizaciones: elige otra vez.";choices[0].focus();
      });discover.hidden=true;page.append(field,feedback,retry,discover);
    }
    decision(pages[1],lesson.journey.decision);
    pages[2].append(visualCards(lesson.journey.visuals.story,"Historia ficticia de la mochila"),node("p","learning-concept-note","Una pregunta abierta invita a contar: «¿Qué hiciste cuando se rompió?». Un caso es una pista; todavía falta investigar."));
    decision(pages[2],lesson.journey.story);
    const concepts=node("ol","learning-concept-flow");
    [["Observar","Describe lo que sucede: el asa se rompe al llevar libros."],["Investigar","Pregunta qué ocurrió y cómo lo resolvió. Escucha sin ofrecer todavía un producto."],["Comprender","Resume a quién le cuesta qué y qué dudas te faltan por comprobar."]].forEach(([title,text])=>{
      const item=node("li"),detail=panel(title,[node("p","",text)]);item.append(detail);concepts.append(item);
    });pages[3].append(node("p","","Pulsa cada tarjeta para descubrir su ejemplo."),concepts);
    const practiceId=`practice-${key.replaceAll("/","-")}-problema`;
    const practice=Array.from(original.querySelectorAll("section")).find(item=>item.id===practiceId);
    pages[4].append(visualCards(lesson.journey.visuals.challenge,"Guía para describir un problema"),node("p","learning-concept-note","Elige un caso cercano. Si aún no lo has comprobado, escribe «creo que…»."));
    if(practice)pages[4].append(practice);
    const celebration=node("div","learning-journey-celebration","✦ Recorrido terminado");
    const result=node("p","learning-save-status");result.setAttribute("role","status");
    progressViews.push(()=>{const saved=!!data?.answers?.[key+"/problema"]?.text?.trim();result.textContent=(saved ? "Tu respuesta al reto está guardada. " : "Tu respuesta al reto todavía no está guardada. ")+(data?.completed?.[key] ? "La demostración figura como completada." : "La demostración aún no está marcada como completada.");});
    completion=Array.from(original.querySelectorAll("div")).find(item=>item.id===`completion-${key.replaceAll("/","-")}`);
    pages[5].append(celebration,visualCards(lesson.journey.visuals.finish,"Lo que has practicado"),result);
    if(completion)pages[5].append(completion);
    const resourcesId="resources-"+key.replaceAll("/","-");
    const resources=makeScreen(resourcesId,"Más práctica y recursos",()=>showScreen(screenId));
    resources.append(node("p","learning-input-hint","Cinco ejercicios y tres preguntas. El reto Problema está en la pantalla 5 del recorrido."),original);
    const revisit=button("Ir al reto Problema",true);revisit.addEventListener("click",()=>{showScreen(screenId);show(4);});resources.append(revisit);
    const mission=button("Detective de problemas · Misión práctica",true);
    if(window.MPDMission)window.MPDMission.registerButton(mission);else mission.hidden=true;
    pages[4].append(mission);
    const finishMission=button("Detective de problemas · Misión práctica",true);
    if(window.MPDMission)window.MPDMission.registerButton(finishMission);else finishMission.hidden=true;
    pages[5].append(finishMission);
    const extras=button("Más práctica y recursos",true);
    extras.addEventListener("click",()=>showScreen(resourcesId));
    // Los destinos del mapa y del siguiente paso siguen apuntando a sus mismos ids.
    targetScreens.forEach((destination,id)=>{
      if(destination.screenId!==screenId || id.startsWith("start-"))return;
      const previous=destination.showStep;
      destination.showStep=()=>{
        if(id===practiceId){show(4,false);return null;}
        if(id===`completion-${key.replaceAll("/","-")}`){show(5,false);return null;}
        showScreen(resourcesId);return previous ? previous() : null;
      };
    });
    back.addEventListener("click",()=>show(Math.max(0,current-1)));next.addEventListener("click",()=>show(Math.min(5,current+1)));
    actions.append(back,next);outer.append(meter,position,index,body,actions,extras);
    modeViews.push(()=>{if(completion)completion.hidden=false;const mode=chosenModes[routeId]||"guided";index.hidden=mode==="guided";index.setAttribute("aria-label",mode==="quick" ? "Accesos rápidos a conceptos y práctica" : "Explora cualquier pantalla");});
    show(0,false);return outer;
  }
  function lessonView(lesson,routeId,moduleId) {
    const key=`${routeId}/${moduleId}/${lesson.id}`,screenId=lessonScreenId(key);
    const article=node("article");
    const title=node("h4","",lesson.title);title.id=key.replaceAll("/","-");article.setAttribute("aria-labelledby",title.id);
    article.append(node("p","learning-provisional",lesson.status==="published" ? "Lección disponible" : "Demostración interactiva · Contenido provisional"),title,node("p","muted",lesson.duration));
    let content;
    try {content=window.MPDLearningBlocks.normalize(lesson);}
    catch(error){article.append(node("p","learning-error","No se pudo preparar esta lección. "+error.message));return article;}
    const summary=panel("Resumen rápido",[list(content.summary)]);
    article.append(summary,node("p","learning-input-hint",content.intro));
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
        if(part.hidden)part.querySelectorAll("video, audio").forEach(media=>media.pause());
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
    content.steps.forEach((part,index)=>{
      const contents=[];let phase;
      const labels={teach:"El concepto",show:"Un ejemplo sencillo",practice:"Ponlo en práctica",check:"Comprueba lo aprendido"};
      part.blocks.forEach(block=>{
        if(block.phase!==phase){contents.push(node("h5","",labels[block.phase]));phase=block.phase;}
        contents.push(blockView(block,content,key));
        if(block.type==="exercise")targetScreens.set(`practice-${key.replaceAll("/","-")}-${block.exerciseId}`,{routeId,screenId,showStep:()=>reveal(index)});
        if(block.type==="question")targetScreens.set(`question-${key.replaceAll("/","-")}-${block.questionId}`,{routeId,screenId,showStep:()=>reveal(index)});
      });
      const view=lesson.journey ? node("section","learning-resource-step") : panel(`Paso ${part.title}`,contents,index===0);
      if(lesson.journey)view.append(node("h4","",part.title),...contents);
      view.id=`step-${key.replaceAll("/","-")}-${index}`;
      view.classList.add("learning-lesson-step");stepPanels.push(view);article.append(view);
      view.addEventListener("toggle",()=>{if(!view.open)view.querySelectorAll("video, audio").forEach(media=>media.pause());});
      const link=button(`Paso ${index+1}`,true);link.addEventListener("click",()=>{view.open=true;view.tabIndex=-1;view.focus({preventScroll:true});view.scrollIntoView({block:"start",behavior:"auto"});});quick.append(link);
      const activity=part.blocks.find(block=>block.type==="exercise") || part.blocks.find(block=>block.type==="question");
      if(activity){
        const target=activity.type==="exercise" ? `practice-${key.replaceAll("/","-")}-${activity.exerciseId}` : `question-${key.replaceAll("/","-")}-${activity.questionId}`;
        const practiceLink=button(`Práctica ${index+1}`,true);practiceLink.addEventListener("click",()=>jumpTo(target));quick.append(practiceLink);
      }
    });
    const completion=completionView(lesson,key);
    targetScreens.set(`completion-${key.replaceAll("/","-")}`,{routeId,screenId,showStep:()=>{reveal(stepPanels.length-1);return null;}});
    previous.addEventListener("click",()=>navigateStep(step-1));next.addEventListener("click",()=>navigateStep(step+1));controls.append(counter,previous,next);
    article.append(controls,node("p","muted",content.outcome),completion);
    modeViews.push(applyMode);
    return lesson.journey ? journeyView(lesson,routeId,key,screenId,article) : article;
  }
  // Tres bloques y accesos directos. Las actividades se construyen una sola vez.
  const home=makeScreen("learning-home","Aprende a tu ritmo");
  const business=node("section","card learning-business");
  business.append(node("h4","learning-dashboard-title","Negocios y emprendimiento"));home.append(business);
  const skills=node("section","card learning-planned-area");
  skills.append(node("h4","learning-dashboard-title","Habilidades y desarrollo personal"),node("p","learning-provisional","En preparación · Todavía no hay rutas disponibles."),node("p","learning-input-hint","Áreas previstas: productividad, comunicación, disciplina, negociación y pensamiento crítico."));home.append(skills);
  const personal=node("section","card learning-personal");personal.append(node("h4","learning-dashboard-title","Mi aprendizaje"));home.append(personal);
  const continueCard=node("div","learning-next"),continueTitle=node("h5","learning-dashboard-title","Continuar aprendiendo"),continueText=node("p","muted"),continueButton=button("Continuar");
  continueCard.append(continueTitle,continueText,continueButton);personal.append(continueCard);
  const compactProgress=node("p","muted"),exploreButton=button("Mis rutas",true),progressButton=button("Mi progreso y logros",true);
  personal.append(compactProgress,exploreButton,progressButton);
  const explore=makeScreen("learning-explore","Mis rutas",()=>showScreen("learning-home"));
  const progressPage=makeScreen("learning-progress","Mi progreso y logros",()=>showScreen("learning-home"));
  exploreButton.addEventListener("click",()=>showScreen("learning-explore"));progressButton.addEventListener("click",()=>showScreen("learning-progress"));
  let continueDestination;
  continueButton.addEventListener("click",()=>{if(continueDestination)jumpTo(continueDestination);});
  progressViews.push(()=>{
    if(!data){dashboardRecommendation={available:false,text:"Progreso educativo no disponible. Revisa el aviso de Aprendizaje."};syncLearningDashboard();continueText.textContent="No se pudo leer tu progreso. Revisa el aviso antes de continuar.";continueButton.disabled=true;compactProgress.textContent="Progreso no disponible.";return;}
    const models=routes.map(route=>({route,model:window.MPDLearningProgress.describe(route,data)}));
    const active=models.find(item=>item.model.entries.some(lesson=>!lesson.marked||lesson.saved<lesson.exercises.length)) || models.find(item=>item.model.entries.length);
    continueButton.disabled=!active;
    const untouched=active && active.model.saved===0 && !active.model.entries.some(item=>item.marked);
    continueDestination=untouched ? "start-"+active.route.id : active?.model.next.target;
    continueText.textContent=active ? `${active.route.title} · ${active.model.next.title}` : "Todavía no hay actividades disponibles.";
    const nextExercise=active?.model.entries.flatMap(item=>item.exercises).find(item=>item.target===continueDestination);
    dashboardRecommendation={available:!!continueDestination,text:active ? `${active.route.title} · ${nextExercise?.title || active.model.next.title}` : "Todavía no hay actividades disponibles."};syncLearningDashboard();
    const saved=models.reduce((sum,item)=>sum+item.model.saved,0),total=models.reduce((sum,item)=>sum+item.model.activities.length,0),badges=models.reduce((sum,item)=>sum+item.model.badges.filter(badge=>badge.earned).length,0);
    compactProgress.textContent=`${saved}/${total} respuestas de demostración · ${badges} logros obtenidos`;
  });
  routes.forEach(route=>{
    buildChooser(route);
    const firstModule=route.modules.find(module=>module.lessons.some(lesson=>["demo","published"].includes(lesson.status)));
    const firstLesson=firstModule?.lessons.find(lesson=>["demo","published"].includes(lesson.status));
    const highlight=node("div","learning-route-highlight");
    const start=button("Empezar primera lección"),full=button("Ver ruta completa",true);
    highlight.append(node("h5","learning-dashboard-title",route.title),node("p","learning-provisional","Demostración provisional · Una lección disponible"),node("p","learning-input-hint","Aprende a descubrir problemas reales antes de elegir qué vender."),start,full);business.append(highlight);
    full.addEventListener("click",()=>showScreen(routeScreenId(route.id)));
    start.disabled=!firstLesson;
    if(firstLesson){
      const id=lessonScreenId(`${route.id}/${firstModule.id}/${firstLesson.id}`);
      targetScreens.set("start-"+route.id,{routeId:route.id,screenId:id});
      start.addEventListener("click",()=>showScreen(id));
    }
    const entry=node("section","card learning-route-entry"),enter=button("Entrar en la ruta");
    entry.append(node("p","eyebrow","Ruta activa · Demostración provisional"),node("h4","learning-dashboard-title",route.title),node("p","muted",route.description),enter);explore.append(entry);
    progressViews.push(()=>{entry.hidden=!data || !window.MPDLearningProgress.describe(route,data).entries.some(item=>item.saved>0||item.marked);});
    enter.addEventListener("click",()=>showScreen(routeScreenId(route.id)));
    const routePage=makeScreen(routeScreenId(route.id),route.title,()=>showScreen(returnScreens.get(routeScreenId(route.id)) || "learning-home"));
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
        const lessonPage=makeScreen(id,lesson.title,()=>showScreen(returnScreens.get(id) || moduleId));lessonPage.append(modeBar(route),lessonView(lesson,route.id,module.id));
        open.addEventListener("click",()=>showScreen(id));
      });
    });
  });
  business.append(node("p","learning-input-hint","Áreas previstas, en preparación: negocios online, marketing, ventas, finanzas e IA."));
  const emptyRoutes=node("p","learning-notice");explore.append(emptyRoutes);
  progressViews.push(()=>{emptyRoutes.textContent=data && routes.some(route=>window.MPDLearningProgress.describe(route,data).entries.some(item=>item.saved>0||item.marked)) ? "Tus rutas con actividad guardada aparecen aquí." : "Todavía no tienes rutas con actividad guardada. Puedes empezar desde Aprendizaje.";});
  updateModes();
  refreshProgress();
  showScreen("learning-home",false);
  const learningRoot=document.getElementById("aprendizaje");
  if(learningRoot && typeof MutationObserver!=="undefined") {
    new MutationObserver(()=>{if(learningRoot.hidden)container.querySelectorAll("video, audio").forEach(media=>media.pause());})
      .observe(learningRoot,{attributes:true,attributeFilter:["hidden"]});
  }
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
