/* Cinco pantallas del piloto. Formularios persistentes y guardado explícito. */
(() => {
  const host=document.getElementById("aprendizaje"),learning=document.getElementById("learningRoutes");
  if(!host || !learning)return;
  const store=window.MPDMissionStore,content=window.MPDMissionContent;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,fn)=>{const n=node("button",text,"learning-button");n.type="button";n.addEventListener("click",fn);return n;};
  const root=node("section",undefined,"mission-view"),heading=node("h3",content.title,"learning-screen-title");
  root.id="mission-detective";root.hidden=true;heading.tabIndex=-1;heading.id="mission-title";root.setAttribute("aria-labelledby",heading.id);
  const global=document.getElementById("missionGlobalStatus");global.hidden=true;
  const status=node("p","Preparando misión…","learning-save-status");status.setAttribute("role","status");
  const exit=button("← Volver",()=>{suspend();if(back)back();});
  const meter=node("progress",undefined,"learning-journey-progress");meter.max=4;meter.setAttribute("aria-label","Posición en la misión; no mide dominio");
  const position=node("p",undefined,"learning-input-hint"),pages=[],inputs={},radios=[],launchers=[];
  let saved=null,step=0,dirty=false,saving=false,back=null,completed=false;
  const copy=data=>JSON.parse(JSON.stringify(data));
  root.append(exit,heading,meter,position,status);host.append(root);
  content.steps.forEach((title,i)=>{const page=node("section",undefined,"learning-journey-page");page.id="mission-step-"+i;page.append(node("h4",title));pages.push(page);root.append(page);});
  const flow=node("ol",undefined,"learning-visual-story");
  [["Observar","Encuentra una dificultad real."],["Investigar","Escucha o identifica lo que falta saber."],["Reflexionar","Decide qué comprobar después."]].forEach(([title,text])=>{const card=node("li",undefined,"learning-story-card");card.append(node("strong",title),node("span",text));flow.append(card);});
  pages[0].append(flow,node("p","Unos 10 minutos, sin límite de tiempo. Puedes guardar y volver después."),node("p","Práctica opcional y provisional. No cambia tu progreso de la lección."));
  const begin=button("Empezar misión",()=>commit(1));pages[0].append(begin);
  content.activities.forEach(activity=>{
    const page=pages[activity.step],label=node("label",activity.label,"learning-exercise-label"),hint=node("p",activity.hint,"learning-input-hint"),input=node("textarea",undefined,"learning-answer");
    input.id="mission-answer-"+activity.id;input.maxLength=4000;input.rows=4;label.htmlFor=input.id;hint.id=input.id+"-hint";input.setAttribute("aria-describedby",hint.id);
    input.addEventListener("input",changed);inputs[activity.id]=input;page.append(label,hint,input);
    if(activity.reference){
      const reference=node("details",undefined,"learning-panel"),text=node("blockquote"),use=button("Usar como punto de partida",()=>{
        if(saving)return;
        try{
          const value=window.MPDLearningStore.read().answers[content.lessonKey+"/"+activity.reference]?.text;
          if(!value){message("No hay una respuesta guardada en ese ejercicio.");return;}
          if(input.value.trim() && !window.confirm("Se sustituirá solo el borrador de esta misión. El ejercicio original no cambia. ¿Continuar?"))return;
          input.value=value;changed();input.focus();
        }catch(error){issue(error.message);}
      });
      reference.append(node("summary","Referencia del ejercicio anterior"),text,node("p","Copia voluntaria e independiente. No demuestra que hayas investigado y no modifica el ejercicio.","learning-input-hint"),use);page.append(reference);
      reference.addEventListener("toggle",()=>{
        if(!reference.open)return;
        try{text.textContent=window.MPDLearningStore.read().answers[content.lessonKey+"/"+activity.reference]?.text || "Todavía no hay una respuesta guardada.";}
        catch(error){text.textContent="Referencia no disponible.";issue(error.message);}
      });
    }
  });
  const choices=node("fieldset",undefined,"learning-question");choices.append(node("legend","¿Qué has podido hacer hasta ahora?"));
  content.statuses.forEach(choice=>{const label=node("label",undefined,"learning-option"),input=node("input");input.type="radio";input.name="mission-investigation-status";input.value=choice.id;input.addEventListener("change",changed);label.append(input,node("span",choice.label));choices.append(label);radios.push(input);});
  pages[2].append(choices);
  const summary=node("div",undefined,"mission-summary");
  const finish=button("Finalizar misión manualmente",()=>commit(4,true));
  pages[4].append(summary,node("p","Has practicado observación, investigación y pensamiento crítico. Registrar una reflexión no verifica una conversación ni demuestra que exista un negocio."),finish);
  const controls=node("div",undefined,"learning-actions"),previous=button("← Anterior",()=>show(Math.max(0,step-1))),next=button("Continuar →",()=>show(Math.min(4,step+1))),save=button("Guardar progreso",()=>commit(step));
  controls.append(previous,next,save);root.append(controls);
  const recovery=node("details",undefined,"learning-panel"),preview=node("div"),consult=button("Consultar versión guardada",()=>{
    try{preview.replaceChildren();const latest=store.read();content.activities.forEach(a=>preview.append(node("p",a.label),node("blockquote",latest.answers[a.id]||"Sin respuesta")));message("Consulta disponible. Tu borrador no ha cambiado.");}catch(error){issue(error.message);}
  }),load=button("Cargar versión guardada",()=>{
    if(saving)return;
    if(dirty && !window.confirm("Se sustituirá el borrador de la misión por su versión guardada. ¿Continuar?"))return;
    try{apply(store.read());clearIssue();message("Versión guardada recuperada.");}catch(error){issue(error.message);}
  });
  recovery.append(node("summary","Recuperar o consultar el guardado"),consult,load,preview);root.append(recovery);
  function message(text){status.textContent=text;}
  function issue(text){global.hidden=false;global.textContent="Aviso de misión: "+text;message(text);}
  function clearIssue(){global.hidden=true;global.textContent="";}
  function investigation(){return radios.find(r=>r.checked)?.value || "pending";}
  function changed(){dirty=true;message("Cambios sin guardar. Pulsa Guardar progreso.");renderSummary();}
  function renderSummary(){
    summary.replaceChildren();content.activities.forEach(a=>{summary.append(node("h5",a.label),node("p",inputs[a.id].value.trim() || "Pendiente de registrar."));});
    summary.append(node("p",content.statuses.find(s=>s.id===investigation()).label,"learning-concept-note"));
    finish.textContent=completed ? "✓ Misión finalizada" : "Finalizar misión manualmente";
    finish.disabled=saving || completed || !inputs.observation.value.trim() || !inputs.reflection.value.trim();
  }
  function show(value,focus=true){
    step=value;pages.forEach((page,i)=>{page.hidden=i!==step;});meter.value=step;position.textContent=`Pantalla ${step+1} de 5 · Misión práctica`;
    previous.disabled=saving || step===0;next.hidden=step===0 || step===4;save.disabled=saving;begin.disabled=saving;
    renderSummary();if(focus && !root.hidden && !host.hidden){pages[step].tabIndex=-1;pages[step].focus({preventScroll:true});pages[step].scrollIntoView({block:"start",behavior:"auto"});}
  }
  function labels(){
    const started=!!saved?.revision;
    launchers.forEach(b=>{b.textContent=started ? "Retomar misión" : "Detective de problemas · Misión práctica";});
    const home=document.getElementById("dashboardMissionButton");if(home)home.textContent=started ? "Retomar misión" : "Probar Detective de problemas";
  }
  function apply(data){saved=copy(data);completed=data.completed;content.activities.forEach(a=>{inputs[a.id].value=data.answers[a.id];});radios.forEach(r=>{r.checked=r.value===data.investigationStatus;});dirty=false;show(data.step,false);labels();}
  async function commit(destination,complete=completed){
    if(saving)return;
    saving=true;Object.values(inputs).forEach(n=>n.readOnly=true);radios.forEach(n=>n.disabled=true);show(step,false);message("Guardando misión…");
    try{
      const base=saved || store.read();
      const draft={...copy(base),answers:Object.fromEntries(content.activities.map(a=>[a.id,inputs[a.id].value])),investigationStatus:investigation(),step:destination,completed:complete};
      const result=await store.save(draft,base.revision);saved=result;completed=result.completed;dirty=false;labels();clearIssue();show(destination);
      message(complete ? "Misión finalizada y guardada. La lección y sus logros no han cambiado." : "Progreso de misión guardado en este dispositivo.");
    }catch(error){issue(error.message);}
    finally{saving=false;Object.values(inputs).forEach(n=>n.readOnly=false);radios.forEach(n=>n.disabled=false);show(step,false);}
  }
  function suspend(){root.hidden=true;learning.hidden=false;}
  window.MPDMission=Object.freeze({
    open(onBack){back=onBack || null;learning.querySelectorAll("video, audio").forEach(media=>media.pause());learning.hidden=true;root.hidden=false;labels();show(step,false);heading.focus({preventScroll:true});root.scrollIntoView({block:"start",behavior:"auto"});},
    suspend,hasUnsavedChanges:()=>dirty||saving,
    registerButton(b){launchers.push(b);labels();b.addEventListener("click",()=>window.MPDMission.open(()=>b.focus({preventScroll:true})));}
  });
  try{apply(store.read());message(saved.revision ? "Progreso anterior recuperado." : "Tu misión todavía no está empezada.");}catch(error){issue(error.message);show(0,false);}
  window.addEventListener("beforeunload",event=>{if(dirty||saving){event.preventDefault();event.returnValue="";}});
  window.addEventListener("storage",event=>{
    if(event.key!==store.key && event.key!==null)return;
    try{const latest=store.read();if(dirty||saving){issue("La misión cambió en otra ventana. Tu borrador se conserva; consulta el guardado.");}else{const visibleStep=step,wasOpen=!root.hidden;apply(latest);if(wasOpen)show(visibleStep,false);clearIssue();message("Misión actualizada desde otra ventana.");}}catch(error){issue(error.message);}
  });
})();
