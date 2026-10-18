/* Pruebas aisladas, sin navegador ni almacenamiento real. Solo Node estándar. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const DATA='mi-progreso-aprendizaje-v1',PREF='mi-aprendizaje-modalidades-v1',HABITS='mi-panel-habitos-v1',MISSION='mi-progreso-misiones-v1';
const ROUTE='emprendimiento-desde-cero',LESSON=ROUTE+'/fundamentos/problema-antes-idea';
const IDS=['persona','problema','alternativa','hipotesis','preguntas'];
const scripts=['aprendizaje-contenido.js','aprendizaje-storage.js','aprendizaje-progreso.js','aprendizaje-preferencias.js'];
function memory(){return {values:new Map(),queue:Promise.resolve(),writes:[],fail:false,day:'2030-04-01'};}
function makeApp(mem=memory(),options={}) {
  const elements=[],events={},observers=[];let document;
  class Element {
    constructor(tag){this.tag=tag;this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.attributes={};this.listeners={};this.dataset={};this.style={};this.className='';this.value='';this.hidden=false;this.disabled=false;this.checked=false;this.readOnly=false;this.pauseCount=0;this._text='';elements.push(this);
      this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(' ').filter(x=>!names.includes(x)).join(' ');},contains:name=>this.className.split(' ').includes(name),toggle:(name,on)=>{if(on)this.classList.add(name);else this.classList.remove(name);}};
    }
    set textContent(value){this._text=String(value);this.children=[];}
    get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
    append(...items){for(const item of items){if(item.parentElement)item.parentElement.children=item.parentElement.children.filter(x=>x!==item);this.children.push(item);item.parentElement=this;}}
    remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}}
    insertBefore(item,before){item.remove();const index=this.children.indexOf(before);if(index<0)this.children.push(item);else this.children.splice(index,0,item);item.parentElement=this;}
    replaceChildren(...items){this.children=[];this._text='';this.append(...items);}
    setAttribute(key,value){this.attributes[key]=String(value);}
    addEventListener(key,fn){(this.listeners[key] ||= []).push(fn);}
    async fire(key,event={}){for(const fn of this.listeners[key] || [])await fn(event);}
    querySelectorAll(selector){const tags=selector.split(',').map(x=>x.trim().toUpperCase());const result=[];function visit(n){for(const child of n.children){if(tags.includes(child.tagName))result.push(child);visit(child);}}visit(this);return result;}
    contains(target){return target===this || this.children.some(child=>child.contains(target));}
    focus(){document.activeElement=this;}
    scrollIntoView(){this.scrolled=true;}
    pause(){this.pauseCount++;}
  }
  const root=new Element('section');root.id='aprendizaje';
  const mount=new Element('div');mount.id='learningRoutes';root.append(mount);
  document={baseURI:'https://example.test/app/mi_progreso_diario.html',hidden:false,activeElement:null,
    createElement:tag=>new Element(tag),querySelectorAll:selector=>elements.filter(n=>selector.startsWith('.') && n.classList.contains(selector.slice(1))),
    getElementById(id){let found=elements.find(x=>x.id===id);if(!found&&options.core){found=new Element('div');found.id=id;}return found || null;},
    addEventListener(key,fn){events['document:'+key]=fn;}};
  const window={addEventListener(key,fn){const previous=events[key];events[key]=previous ? async(...args)=>{await previous(...args);await fn(...args);} : fn;},confirm:()=>false,matchMedia:()=>({matches:true})};
  class Clock extends Date{constructor(...args){super(...(args.length?args:[mem.day+'T12:00:00']));}}
  const context=vm.createContext({window,document,Date:Clock,Intl,URL,console,crypto:webcrypto,
    MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}},setInterval(){},
    navigator:{locks:{request(key,fn){assert.ok([DATA,PREF,HABITS,MISSION].includes(key));const job=mem.queue.then(fn);mem.queue=job.catch(()=>{});return job;}}},
    localStorage:{getItem(key){assert.ok([DATA,PREF,HABITS,MISSION].includes(key));return mem.values.get(key) ?? null;},setItem(key,value){assert.ok([DATA,PREF,HABITS,MISSION].includes(key));if(mem.fail)throw Error('Cuota agotada');mem.writes.push(key);mem.values.set(key,value);}}});
  scripts.forEach(name=>vm.runInContext(read(name),context));
  const route=window.MPDLearningCatalog[0],lesson=route.modules[0].lessons[0];
  if(!options.journey)delete lesson.journey; // También comprobamos la presentación anterior y audiovisual.
  if(options.alter)options.alter(lesson,route);
  if(options.mission){['misiones-contenido.js','misiones-storage.js','misiones.js'].forEach(name=>vm.runInContext(read(name),context));}
  if(options.render!==false)vm.runInContext(read('aprendizaje.js'),context);
  const visible=n=>{for(let p=n;p;p=p.parentElement)if(p.hidden)return false;return true;};
  return {mem,elements,events,observers,root,mount,window,document,context,route,lesson,visible,
    store:window.MPDLearningStore,normalize:window.MPDLearningBlocks.normalize,
    model:()=>window.MPDLearningProgress.describe(route,window.MPDLearningStore.read()),
    button:text=>elements.find(n=>n.tag==='button'&&n.textContent===text&&visible(n)),
    current:()=>elements.find(n=>n.classList.contains('learning-screen')&&!n.hidden)};
}
function fixture(){const data={version:1,answers:{},completed:{[LESSON]:true}};IDS.forEach(id=>data.answers[LESSON+'/'+id]={text:'Respuesta anterior '+id,revision:'revision-'+id,updatedAt:'2026-10-18T12:00:00.000Z'});return data;}
function chooseApp(mem=memory(),options={}){mem.values.set(PREF,JSON.stringify({version:1,routes:{[ROUTE]:'guided'}}));return makeApp(mem,options);}

test('bloques y formato anterior conservan referencias, resultados y orden pedagógico',()=>{
  const app=makeApp(memory(),{render:false}),normalized=app.normalize(app.lesson);
  const legacy=JSON.parse(JSON.stringify(app.lesson));delete legacy.contentSteps;delete legacy.completion;
  const adapted=app.normalize(legacy);
  assert.deepEqual(Array.from(normalized.exercises,x=>x.id),IDS);
  assert.deepEqual(Array.from(adapted.exercises,x=>x.id),IDS);
  assert.deepEqual(Array.from(normalized.questions,x=>x.id),['problema','evidencia','hipotesis']);
  assert.equal(adapted.completion.type,'manual');
  assert.equal(new Set(normalized.steps.flatMap(s=>Array.from(s.blocks,b=>b.id))).size,normalized.steps.reduce((n,s)=>n+s.blocks.length,0));
  assert.deepEqual(new Set(normalized.steps.flatMap(s=>Array.from(s.blocks,b=>b.type))),new Set(['video','audio','image','example','exercise','question','explanation']));
  const data=fixture(),before=app.window.MPDLearningProgress.describe(app.route,data);
  app.route.modules[0].lessons[0]=legacy;
  const after=app.window.MPDLearningProgress.describe(app.route,data);
  assert.equal(before.saved,after.saved);assert.equal(before.badges.filter(b=>b.earned).length,after.badges.filter(b=>b.earned).length);
});

test('rechaza referencias rotas, bloques repetidos, evaluaciones anticipadas y medios sin alternativa',()=>{
  const app=makeApp(memory(),{render:false});
  const clone=()=>JSON.parse(JSON.stringify(app.lesson));
  let bad=clone();bad.contentSteps[0].blocks.reverse();assert.throws(()=>app.normalize(bad));
  bad=clone();bad.contentSteps[0].blocks[0].id=bad.contentSteps[0].blocks[1].id;assert.throws(()=>app.normalize(bad));
  bad=clone();bad.contentSteps[0].blocks.find(b=>b.type==='exercise').exerciseId='inexistente';assert.throws(()=>app.normalize(bad));
  bad=clone();delete bad.contentSteps[0].blocks[0].transcript;delete bad.contentSteps[0].blocks[0].fallback;assert.throws(()=>app.normalize(bad),/alternativa/);
});

test('recupera las cinco respuestas y finalización sin escribir ni migrar datos',()=>{
  const mem=memory(),raw=JSON.stringify(fixture());mem.values.set(DATA,raw);mem.values.set(HABITS,'HABITOS_INTACTOS');
  const app=makeApp(mem),fields=app.elements.filter(n=>n.tag==='textarea');
  assert.equal(fields.length,5);fields.forEach((field,i)=>assert.equal(field.value,'Respuesta anterior '+IDS[i]));
  assert.equal(app.model().badges.filter(b=>b.earned).length,3);assert.equal(app.model().published.length,0);
  assert.equal(mem.writes.length,0);assert.equal(mem.values.get(DATA),raw);assert.equal(mem.values.get(HABITS),'HABITOS_INTACTOS');
  assert.equal(app.elements.filter(n=>['video','audio','img'].includes(n.tag)).length,0);
  assert.ok(app.elements.some(n=>n.className==='learning-concept-flow'));
});

test('navegación, pasos y modalidades conservan borradores y el mismo formulario',async()=>{
  const app=chooseApp();await app.button('Continuar').fire('click');
  const fields=app.elements.filter(n=>n.tag==='textarea');fields[0].value='Borrador protegido';await fields[0].fire('input');
  await app.button('Siguiente paso →').fire('click');await app.button('← Paso anterior').fire('click');assert.equal(fields[0].value,'Borrador protegido');
  for(let i=0;i<6 && app.current().id!=='learning-home';i++)await app.button('← Volver').fire('click');assert.equal(app.current().id,'learning-home');
  await app.button('Continuar').fire('click');assert.equal(fields[0].value,'Borrador protegido');
  await app.button('Cambiar modalidad').fire('click');
  await app.elements.find(n=>n.classList.contains('learning-mode-choice')&&n.children[0].textContent==='Ir al grano').fire('click');
  assert.equal(fields[0].value,'Borrador protegido');assert.equal(app.elements.filter(n=>n.tag==='textarea').length,5);
  const save=app.elements.find(n=>n.tag==='button'&&n.textContent==='Guardar respuesta');await save.fire('click');
  assert.equal(app.store.read().answers[LESSON+'/persona'].text,'Borrador protegido');
  assert.equal(app.window.MPDLearning.hasUnsavedChanges(),false);assert.equal(makeApp(app.mem).store.read().answers[LESSON+'/persona'].text,'Borrador protegido');
});

test('cuestionarios conservan respuestas correctas, explicación y reintento',async()=>{
  const app=makeApp(),questions=app.elements.filter(n=>n.tag==='fieldset');assert.equal(questions.length,3);
  for(const [i,field] of questions.entries()){
    const inputs=field.children.filter(n=>n.tag==='label').map(n=>n.children[0]);
    const actions=field.children.find(n=>n.className==='learning-actions');
    inputs[[1,2,0][i]].checked=true;await actions.children[0].fire('click');assert.ok(field.textContent.includes('✓ Correcto.'));
    await actions.children[1].fire('click');assert.ok(inputs.every(n=>!n.checked&&!n.disabled));
  }
});

test('guardado, conflictos y cuota agotada mantienen las protecciones existentes',async()=>{
  const mem=memory(),a=makeApp(mem),b=makeApp(mem);
  let data=await a.store.saveAnswer(LESSON+'/persona','Primera respuesta',null),revision=data.answers[LESSON+'/persona'].revision;
  await b.store.saveAnswer(LESSON+'/persona','Segunda respuesta',revision);
  await assert.rejects(a.store.saveAnswer(LESSON+'/persona','Edición antigua',revision),/otra ventana/);
  const raw=mem.values.get(DATA);mem.fail=true;await assert.rejects(a.store.setCompleted(LESSON,true),/Cuota/);assert.equal(mem.values.get(DATA),raw);
});

test('medios nativos locales: controles, subtítulos, transcripción, alt y errores',async()=>{
  const app=chooseApp(memory(),{alter(lesson){
    const video=lesson.contentSteps[0].blocks[0];video.src='./fixtures/video.mp4';video.poster='./fixtures/portada.png';video.captions=[{src:'./fixtures/es.vtt',lang:'es',label:'Español',default:true}];
    const image=lesson.contentSteps[0].blocks.find(b=>b.type==='image');image.src='./fixtures/imagen.png';
    lesson.contentSteps[1].blocks[0].src='./fixtures/audio.mp3';
  }});
  const video=app.elements.find(n=>n.tag==='video'),audio=app.elements.find(n=>n.tag==='audio'),image=app.elements.find(n=>n.tag==='img');
  assert.equal(video.controls,true);assert.equal(video.playsInline,true);assert.equal(video.autoplay,false);assert.equal(video.preload,'none');
  assert.equal(audio.controls,true);assert.equal(audio.autoplay,false);assert.equal(audio.preload,'none');
  assert.ok(image.alt);assert.ok(video.poster);assert.ok(app.elements.some(n=>n.tag==='track'&&n.srclang==='es'));
  assert.ok(app.elements.some(n=>n.tag==='summary'&&n.textContent==='Leer transcripción'));
  const raw=app.mem.values.get(DATA),writes=app.mem.writes.length;
  await video.fire('ended');assert.equal(app.mem.values.get(DATA),raw);assert.equal(app.mem.writes.length,writes);
  for(const media of [video,audio,image]){await media.fire('error');assert.equal(media.hidden,true);assert.ok(media.parentElement.textContent.includes('La alternativa educativa sigue disponible'));}
  assert.ok(app.elements.filter(n=>n.className==='learning-resource-alternative').every(n=>!n.hidden));
  await app.elements.find(n=>n.tag==='track').fire('error');assert.ok(video.parentElement.textContent.includes('subtítulos'));
});

test('no solicita URLs externas ni protocolos ejecutables',()=>{
  const app=makeApp(memory(),{alter(lesson){lesson.contentSteps[0].blocks[0].src='https://external.invalid/video.mp4';lesson.contentSteps[1].blocks[0].src='javascript:alert(1)';}});
  assert.equal(app.elements.filter(n=>n.tag==='video'||n.tag==='audio').length,0);
});

test('pausa medios al salir de una lección y al ocultar Aprendizaje',async()=>{
  const app=chooseApp(memory(),{alter(lesson){lesson.contentSteps[0].blocks[0].src='./fixtures/video.mp4';}}),video=app.elements.find(n=>n.tag==='video');
  await app.button('Continuar').fire('click');const count=video.pauseCount;
  await app.button('← Volver').fire('click');assert.ok(video.pauseCount>count);
  const before=video.pauseCount;app.root.hidden=true;app.observers.forEach(fn=>fn());assert.ok(video.pauseCount>before);
});

test('lecciones futuras sin respuestas escritas necesitan criterio explícito',()=>{
  const app=makeApp(memory(),{render:false});
  const lesson={id:'sin-escritos',status:'demo',title:'Fixture de prueba',contentSteps:[{id:'concepto',title:'Concepto',blocks:[{id:'explicacion',type:'explanation',paragraphs:['Concepto de prueba.']},{id:'ejemplo',type:'example',text:'Ejemplo de prueba.'}]}]};
  const progress=app.window.MPDLearningProgress;
  assert.equal(progress.completionPolicy(lesson,{},'ruta/modulo/sin-escritos').eligible,false);
  lesson.completion={type:'manual',description:'Revisión personal explícita.'};assert.equal(progress.completionPolicy(lesson,{},'ruta/modulo/sin-escritos').eligible,true);
  lesson.completion={type:'saved-exercises',exerciseIds:[]};assert.equal(progress.completionPolicy(lesson,{},'ruta/modulo/sin-escritos').eligible,false);
  assert.equal(progress.completionPolicy(app.lesson,{answers:{}},LESSON).eligible,true);
});

test('hábitos, objetivo, historial y estadísticas siguen funcionando con datos simulados',async()=>{
  const mem=memory();mem.values.set(HABITS,JSON.stringify({day:mem.day,habits:Array.from({length:7},(_,i)=>({id:i+1,name:'Hábito ficticio '+i,done:true})),weeklyGoal:'Objetivo ficticio',history:{}}));
  const app=makeApp(mem,{core:true,render:false});
  vm.runInContext(read('mi_progreso_diario.html').match(/<script>([\s\S]*?)<\/script>/)[1],app.context);await vm.runInContext('refresh()',app.context);
  assert.equal(app.document.getElementById('percentage').textContent,'100 %');assert.equal(app.document.getElementById('weeklyGoal').value,'Objetivo ficticio');
  mem.day='2030-04-02';await vm.runInContext('refresh()',app.context);
  const data=JSON.parse(mem.values.get(HABITS));assert.equal(data.history['2030-04-01'].percentage,100);assert.ok(data.habits.every(h=>!h.done));assert.equal(app.document.getElementById('weekChart').children.length,7);
});

test('la PWA existente conserva caché y actividad offline; no incluye medios grandes',async()=>{
  const events={},scope='https://example.test/app/',prefix='mi-progreso-diario:'+scope+':',maps=new Map([[prefix+'anterior',new Map()],['otra-app',new Map()]]);
  const context=vm.createContext({URL,Request,fetch(){throw Error('Sin red');},caches:{async open(key){if(!maps.has(key))maps.set(key,new Map());const map=maps.get(key);return {async addAll(requests){for(const request of requests){assert.equal(request.cache,'reload');const file=new URL(request.url).pathname.slice('/app/'.length)||'index.html';assert.ok(!/\.(mp4|mp3|webm|wav)$/.test(file));map.set(request.url,fs.readFileSync(path.join(ROOT,file)));}},async match(url){return map.get(url);}};},async keys(){return [...maps.keys()];},async delete(key){return maps.delete(key);}},self:{registration:{scope},addEventListener(type,fn){events[type]=fn;},clients:{async claim(){}}}});
  vm.runInContext(read('sw.js'),context);let pending;events.install({waitUntil(p){pending=p;}});await pending;events.activate({waitUntil(p){pending=p;}});await pending;
  assert.ok(maps.has(prefix+'0.10.2'));assert.ok(maps.has('otra-app'));
  for(const file of ['index.html','mi_progreso_diario.html','pwa.js','aprendizaje-contenido.js','aprendizaje.js','aprendizaje-progreso.js','aprendizaje-storage.js','aprendizaje-preferencias.js','aprendizaje.css','misiones-contenido.js','misiones-storage.js','misiones.js','manifest.webmanifest','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png']){let response;events.fetch({request:new Request(scope+file),respondWith(p){response=p;}});assert.deepEqual(await response,fs.readFileSync(path.join(ROOT,file)));}
});

test('diseño móvil y accesibilidad básica: etiquetas, movimiento reducido y alternativas',()=>{
  const app=makeApp();for(const input of app.elements.filter(n=>n.tag==='textarea'))assert.ok(app.elements.some(n=>n.tag==='label'&&n.htmlFor===input.id));
  const css=read('aprendizaje.css');assert.ok(css.includes('@media(max-width:420px)'));assert.ok(css.includes('prefers-reduced-motion'));assert.ok(css.includes('grid-template-columns:1fr'));
  assert.ok(app.elements.filter(n=>n.className==='learning-resource-status').every(n=>n.attributes.role==='status'));
});


test('recorrido: seis pantallas, decisiones, borradores, modos y cierre sin finalización automática',async()=>{
  const mem=memory();mem.values.set(PREF,JSON.stringify({version:1,routes:{[ROUTE]:'guided'}}));
  const app=makeApp(mem,{journey:true});
  const pages=app.elements.filter(n=>n.className==='learning-journey-page');assert.equal(pages.length,6);
  const fields=app.elements.filter(n=>n.tag==='textarea');assert.equal(fields.length,5);
  // Entrar desde el mapa conserva la recomendación de actividades completas.
  await app.button('Continuar').fire('click');
  const journey=app.elements.find(n=>n.className==='learning-journey');
  const buttons=()=>journey.querySelectorAll('button');
  const click=async text=>{const b=buttons().find(n=>n.textContent===text);assert.ok(b,text);await b.fire('click');};
  await click('¡Empezar!');assert.equal(pages[1].hidden,false);
  const decisions=pages[1].querySelectorAll('button').filter(n=>n.classList.contains('learning-decision-card'));
  await decisions[0].fire('click');assert.ok(pages[1].textContent.includes('Puedes probar otra opción.'));
  await decisions[1].fire('click');assert.ok(pages[1].textContent.includes('✓ Buena decisión.'));
  await click('Volver a intentarlo');assert.ok(decisions.every(n=>n.attributes['aria-pressed']==='false'));
  await click('Continuar →');assert.equal(pages[2].hidden,false);
  await click('Continuar →');await click('Continuar →');assert.equal(pages[4].hidden,false);
  const input=pages[4].querySelectorAll('textarea')[0];assert.ok(input.id.endsWith('-problema'));
  input.value='Creo que cuesta transportar los libros';await input.fire('input');
  await click('Continuar →');assert.equal(pages[5].hidden,false);assert.equal(app.store.read().completed[LESSON],undefined);
  await click('← Anterior');assert.equal(input.value,'Creo que cuesta transportar los libros');
  await pages[4].querySelectorAll('button').find(n=>n.textContent==='Guardar respuesta').fire('click');
  assert.equal(app.store.read().answers[LESSON+'/problema'].text,input.value);
  await app.button('Cambiar modalidad').fire('click');
  await app.elements.find(n=>n.classList.contains('learning-mode-choice')&&n.children[0].textContent==='Ir al grano').fire('click');
  assert.equal(journey.children.find(n=>n.tag==='nav').hidden,false);
  assert.equal(fields.length,5);assert.equal(app.model().saved,1);assert.equal(app.model().badges.filter(n=>n.earned).length,1);
  assert.equal(app.elements.filter(n=>n.tag==='fieldset').length,5); // tres anteriores y dos decisiones
});

test('recorrido recupera respuestas anteriores y modo libre sin escribir ni duplicar formularios',async()=>{
  const mem=memory(),raw=JSON.stringify(fixture());mem.values.set(DATA,raw);
  mem.values.set(PREF,JSON.stringify({version:1,routes:{[ROUTE]:'free'}}));mem.values.set(HABITS,'NO_MODIFICAR');
  const app=makeApp(mem,{journey:true});
  const fields=app.elements.filter(n=>n.tag==='textarea');assert.equal(fields.length,5);
  fields.forEach((field,i)=>assert.equal(field.value,'Respuesta anterior '+IDS[i]));
  assert.equal(mem.writes.length,0);assert.equal(mem.values.get(DATA),raw);assert.equal(mem.values.get(HABITS),'NO_MODIFICAR');
  const journey=app.elements.find(n=>n.className==='learning-journey');
  const index=journey.children.find(n=>n.tag==='nav');assert.equal(index.hidden,false);
  await index.children[4].fire('click');
  const page=app.elements.find(n=>n.id==='problema-recorrido-5');assert.equal(page.hidden,false);
  assert.equal(page.querySelectorAll('textarea')[0].value,'Respuesta anterior problema');
  await index.children[5].fire('click');assert.equal(mem.writes.length,0);assert.equal(app.model().badges.filter(n=>n.earned).length,3);
});


test('portada directa, modalidad inicial sin escritura y volver previsible',async()=>{
  const app=makeApp(memory(),{journey:true});
  const home=app.current();
  for(const title of ['Negocios y emprendimiento','Habilidades y desarrollo personal','Mi aprendizaje'])assert.ok(home.textContent.includes(title));
  await app.button('Empezar primera lección').fire('click');assert.ok(app.current().id.startsWith('lesson-'));
  assert.ok(app.current().textContent.includes('Modalidad: Desde cero'));assert.equal(app.mem.writes.length,0);
  await app.button('Más práctica y recursos').fire('click');assert.ok(app.current().id.startsWith('resources-'));
  assert.equal(app.elements.filter(n=>n.tag==='textarea').length,5);
  const field=app.current().querySelectorAll('textarea')[0];field.value='Borrador desde recursos';await field.fire('input');
  await app.button('← Volver').fire('click');assert.ok(app.current().id.startsWith('lesson-'));
  await app.button('← Volver').fire('click');assert.equal(app.current().id,'learning-home');
  await app.button('Ver ruta completa').fire('click');assert.ok(app.current().id.startsWith('route-'));
  await app.button('← Volver').fire('click');assert.equal(app.current().id,'learning-home');assert.equal(field.value,'Borrador desde recursos');
  assert.equal(app.mem.writes.length,0);assert.ok(!app.mem.values.has(PREF));
});

test('continuar lleva a un ejercicio pendiente y recursos conserva IDs sin detalles anidados',async()=>{
  const mem=memory();mem.values.set(DATA,JSON.stringify({version:1,answers:{[LESSON+'/problema']:{text:'Mi problema',revision:'r',updatedAt:'2030-04-01'}},completed:{}}));
  const app=makeApp(mem,{journey:true});await app.button('Continuar').fire('click');assert.ok(app.current().id.startsWith('resources-'));
  assert.ok(app.document.activeElement.id.endsWith('-persona'));
  for(const detail of app.current().querySelectorAll('details'))assert.equal(detail.querySelectorAll('details').length,0);
  const ids=app.elements.filter(n=>n.id).map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
  await app.button('Ir al reto Problema').fire('click');assert.ok(app.current().id.startsWith('lesson-'));
  assert.equal(app.document.getElementById('problema-recorrido-5').hidden,false);
  assert.equal(app.mem.writes.length,0);
});

test('escenas visuales locales y estilos móviles no requieren recursos externos',()=>{
  const app=makeApp(memory(),{journey:true});
  assert.equal(app.elements.filter(n=>n.className==='learning-visual-story').length,4);
  assert.ok(app.elements.some(n=>n.className.includes('learning-backpack')));
  assert.equal(app.elements.filter(n=>['img','video','audio'].includes(n.tag)).length,0);
  assert.ok(read('aprendizaje.css').includes('@media(max-width:480px)'));
  assert.ok(read('aprendizaje.css').includes('prefers-reduced-motion'));
});


function startCore(app){
  for(const name of ['inicio','habitos','podcasts','aprendizaje']){
    const view=app.document.getElementById(name);view.classList.add('app-view');view.hidden=name!=='inicio';
    app.document.getElementById(name+'Title');
    const nav=app.document.createElement('button');nav.classList.add('nav-button');nav.dataset.view=name;nav.removeAttribute=key=>{delete nav.attributes[key];};
  }
  app.context.window.scrollTo=()=>{};
  vm.runInContext(read('mi_progreso_diario.html').match(/<script>([\s\S]*?)<\/script>/)[1],app.context);
  return vm.runInContext('refresh()',app.context);
}

test('Inicio muestra datos reales, tres pendientes, objetivo único e historial sin cambios',async()=>{
  const mem=memory(),habits=Array.from({length:6},(_,i)=>({id:i,name:'Pendiente '+i,done:i===0}));
  const old={habits:[{id:8,name:'Anterior',done:true}],total:1,completed:1,percentage:100,status:'recorded'};
  const history={'2030-03-30':old,'2030-03-31':{...old,habits:[{id:8,name:'Anterior',done:false}],completed:0,percentage:0}};
  mem.values.set(HABITS,JSON.stringify({day:mem.day,habits,weeklyGoal:'Objetivo real',history}));
  const app=makeApp(mem,{core:true,render:false});await startCore(app);
  assert.equal(app.document.getElementById('progressLabel').textContent,'1 de 6 hábitos');
  assert.equal(app.document.getElementById('percentage').textContent,'17 %');
  assert.equal(app.document.getElementById('pendingHabits').children.length,3);
  assert.equal(app.document.getElementById('goalPreview').textContent,'Objetivo real');
  assert.equal(app.document.getElementById('recentActivity').hidden,false);assert.ok(app.document.getElementById('recentSummary').textContent.includes('1 de 2 días'));
  const stored=JSON.parse(mem.values.get(HABITS));assert.deepEqual(stored.history['2030-03-30'],old);
  await app.document.getElementById('viewAllHabits').fire('click');
  assert.equal(app.document.getElementById('habitos').hidden,false);assert.equal(app.document.activeElement.id,'habitosTitle');
  assert.equal(app.document.getElementById('savedStatus').hidden,false);
  await app.document.getElementById('editGoal').fire('click');assert.equal(app.document.activeElement.id,'weeklyGoal');assert.equal(app.document.getElementById('goalEditor').open,true);
});

test('Inicio sin hábitos no presenta 0 por ciento ni constancia inventada',async()=>{
  const mem=memory();mem.values.set(HABITS,JSON.stringify({day:mem.day,habits:[],weeklyGoal:'',history:{}}));
  const app=makeApp(mem,{core:true,render:false});await startCore(app);
  assert.equal(app.document.getElementById('percentage').textContent,'—');assert.equal(app.document.getElementById('progress').hidden,true);
  assert.equal(app.document.getElementById('recentActivity').hidden,true);assert.ok(app.document.getElementById('pendingStatus').textContent.includes('primer hábito'));
  assert.ok(app.document.getElementById('goalPreview').textContent.includes('Todavía'));
});

test('Inicio con lectura inválida o cuota agotada muestra indisponibilidad y conserva datos',async()=>{
  for(const broken of [true,false]){
    const mem=memory(),raw=broken ? '{no valido' : JSON.stringify({day:mem.day,habits:[{id:1,name:'Real',done:false}],weeklyGoal:'Previo',history:{}});
    mem.values.set(HABITS,raw);mem.fail=!broken;
    const app=makeApp(mem,{core:true,render:false});await startCore(app);
    assert.equal(mem.values.get(HABITS),raw);assert.equal(app.document.getElementById('progressLabel').textContent,'Progreso no disponible');
    assert.ok(app.document.getElementById('savedStatus').textContent.startsWith('Aviso:'));
    assert.equal(app.document.getElementById('savedStatus').classList.contains('is-error'),true);
    assert.equal(app.document.getElementById('recentActivity').hidden,true);
  }
});

test('Objetivo con fallo conserva su borrador durante navegación y no confirma un guardado falso',async()=>{
  const app=makeApp(memory(),{core:true,render:false});await startCore(app);
  const goal=app.document.getElementById('weeklyGoal');goal.value='Borrador sin guardar';app.mem.fail=true;await goal.fire('input');
  app.mem.fail=false;await vm.runInContext('showView("habitos");refresh()',app.context);
  assert.equal(goal.value,'Borrador sin guardar');assert.ok(app.document.getElementById('savedStatus').textContent.startsWith('Aviso:'));
  assert.notEqual(JSON.parse(app.mem.values.get(HABITS)).weeklyGoal,goal.value);
  await goal.fire('input');assert.equal(JSON.parse(app.mem.values.get(HABITS)).weeklyGoal,goal.value);
});

test('Inicio reutiliza recomendación y errores educativos son visibles fuera de Aprendizaje',async()=>{
  const app=makeApp(memory(),{core:true,journey:true});await startCore(app);
  const action=app.document.getElementById('dashboardLearningButton');assert.equal(action.disabled,false);
  await action.fire('click');assert.equal(app.document.getElementById('aprendizaje').hidden,false);assert.ok(app.current().id.startsWith('lesson-'));
  assert.equal(app.mem.values.has(PREF),false);assert.equal(app.mem.values.has(DATA),false);
  const field=app.elements.find(n=>n.tag==='textarea'&&n.id.endsWith('-problema'));field.value='Práctica de prueba';await field.fire('input');
  app.mem.fail=true;const parent=field.parentElement;await parent.querySelectorAll('button').find(n=>n.textContent==='Guardar respuesta').fire('click');
  assert.equal(app.document.getElementById('learningGlobalStatus').hidden,false);
  await vm.runInContext('showView("inicio");refresh()',app.context);assert.equal(field.value,'Práctica de prueba');
  assert.equal(app.document.getElementById('learningGlobalStatus').hidden,false);
  assert.equal(app.store.read().completed[LESSON],undefined);
});

function habitFixture(mem){
  const previous={habits:[{id:'old',name:'Antes',done:true}],total:1,completed:1,percentage:100,status:'recorded'};
  mem.values.set(HABITS,JSON.stringify({day:mem.day,habits:[{id:1,name:'Leer',done:false},{id:'dos',name:'Caminar',done:false}],weeklyGoal:'Objetivo intacto',history:{'2030-03-31':previous}}));return previous;
}
const cards=app=>app.document.getElementById('habitsList').children.filter(n=>n.classList.contains('habit'));
const checkOf=card=>card.querySelectorAll('input')[0];

test('Hábitos conserva tarjetas, orden y foco al marcar consecutivamente y recupera el guardado',async()=>{
  const mem=memory(),previous=habitFixture(mem),app=makeApp(mem,{core:true,render:false});await startCore(app);
  const first=cards(app)[0],second=cards(app)[1],a=checkOf(first),b=checkOf(second);a.focus();a.checked=true;await a.fire('change');
  assert.equal(app.document.activeElement,a);assert.equal(cards(app)[0],first);assert.ok(first.textContent.includes('Completado'));
  b.focus();b.checked=true;await b.fire('change');assert.equal(app.document.activeElement,b);assert.equal(cards(app)[1],second);
  assert.equal(app.document.getElementById('habitsProgressLabel').textContent,'2 de 2 hábitos');assert.equal(app.document.getElementById('habitsPercentage').textContent,'100 %');
  assert.equal(app.document.getElementById('felicitacion').hidden,false);
  const data=JSON.parse(mem.values.get(HABITS));assert.deepEqual(data.habits.map(n=>n.id),[1,'dos']);assert.deepEqual(data.history['2030-03-31'],previous);assert.equal(data.weeklyGoal,'Objetivo intacto');
  const reopened=makeApp(mem,{core:true,render:false});await startCore(reopened);assert.ok(cards(reopened).every(n=>checkOf(n).checked));
});

test('Hábitos serializa cambios rápidos del mismo hábito y de hábitos diferentes',async()=>{
  const mem=memory();habitFixture(mem);const app=makeApp(mem,{core:true,render:false});await startCore(app);
  const [a,b]=cards(app).map(checkOf);
  a.checked=true;const one=a.fire('change');assert.ok(cards(app)[0].textContent.includes('Guardando'));
  a.checked=false;const two=a.fire('change');b.checked=true;const three=b.fire('change');
  await Promise.all([one,two,three]);
  const data=JSON.parse(mem.values.get(HABITS));assert.deepEqual(data.habits.map(n=>n.done),[false,true]);assert.equal(a.checked,false);assert.equal(b.checked,true);
  assert.equal(app.document.getElementById('habitsPercentage').textContent,'50 %');
});

test('Hábitos revierte la indicación al fallar sin afirmar éxito ni perder foco',async()=>{
  const mem=memory();habitFixture(mem);const app=makeApp(mem,{core:true,render:false});await startCore(app);
  const raw=mem.values.get(HABITS),card=cards(app)[0],check=checkOf(card);mem.fail=true;check.focus();check.checked=true;await check.fire('change');
  assert.equal(mem.values.get(HABITS),raw);assert.equal(check.checked,false);assert.equal(app.document.activeElement,check);
  assert.equal(card.classList.contains('habit-just-completed'),false);assert.equal(card.classList.contains('done'),false);
  assert.ok(app.document.getElementById('habitFeedback').textContent.startsWith('No se ha guardado'));
  assert.equal(app.document.getElementById('habitsPercentage').textContent,'—');assert.equal(app.document.getElementById('felicitacion').hidden,true);
  mem.fail=false;check.checked=true;await check.fire('change');assert.equal(check.checked,true);assert.ok(card.textContent.includes('Completado'));
});

test('Hábitos añade con las reglas existentes y elimina manteniendo foco e historial',async()=>{
  const mem=memory(),previous=habitFixture(mem),app=makeApp(mem,{core:true,render:false});await startCore(app);
  await vm.runInContext('showView("habitos");refresh()',app.context);
  const first=cards(app)[0],second=cards(app)[1],del=first.querySelectorAll('button')[0];del.focus();await del.fire('click');
  assert.equal(app.document.activeElement,checkOf(second));assert.equal(cards(app)[0],second);
  const input=app.document.getElementById('newHabit');input.value='  Nuevo hábito  ';await app.document.getElementById('habitForm').fire('submit',{preventDefault(){}});
  let data=JSON.parse(mem.values.get(HABITS));assert.deepEqual(data.habits.map(n=>n.name),['Caminar','Nuevo hábito']);assert.equal(input.value,'');
  for(const card of [...cards(app)]){const button=card.querySelectorAll('button')[0];button.focus();await button.fire('click');}
  assert.equal(app.document.activeElement,input);assert.equal(app.document.getElementById('habitsPercentage').textContent,'—');assert.equal(app.document.getElementById('habitsProgress').hidden,true);
  data=JSON.parse(mem.values.get(HABITS));assert.deepEqual(data.history['2030-03-31'],previous);assert.ok(app.document.getElementById('habitsSummaryStatus').textContent.includes('primer hábito'));
});

test('Hábitos en dos ventanas conserva ambos cambios y actualiza sin sustituir el control enfocado',async()=>{
  const mem=memory(),previous=habitFixture(mem),a=makeApp(mem,{core:true,render:false}),b=makeApp(mem,{core:true,render:false});await startCore(a);await startCore(b);
  const first=checkOf(cards(a)[0]),second=checkOf(cards(b)[1]);first.focus();first.checked=true;second.checked=true;await Promise.all([first.fire('change'),second.fire('change')]);
  await vm.runInContext('refresh()',a.context);await vm.runInContext('refresh()',b.context);
  assert.ok(JSON.parse(mem.values.get(HABITS)).habits.every(h=>h.done));assert.equal(applyCheck(a),true);assert.equal(applyCheck(b),true);
  assert.equal(checkOf(cards(a)[0]),first);assert.equal(a.document.activeElement,first);assert.deepEqual(JSON.parse(mem.values.get(HABITS)).history['2030-03-31'],previous);
  function applyCheck(app){return cards(app).every(n=>checkOf(n).checked);}
});

const missionInput=(app,id)=>app.document.getElementById('mission-answer-'+id);
const missionButton=(app,text)=>app.document.getElementById('mission-detective').querySelectorAll('button').find(n=>n.textContent===text);
async function missionWrite(app,id,text){const input=missionInput(app,id);input.value=text;await input.fire('input');}

test('Misión guarda, recupera y finaliza manualmente sin tocar datos educativos ni hábitos',async()=>{
  const mem=memory(),raw=JSON.stringify(fixture());mem.values.set(DATA,raw);habitFixture(mem);
  const habits=mem.values.get(HABITS),a=makeApp(mem,{core:true,journey:true,mission:true});
  a.window.MPDMission.open();assert.equal(mem.values.has(MISSION),false);
  await missionButton(a,'Empezar misión').fire('click');assert.equal(a.document.getElementById('dashboardMissionButton').textContent,'Retomar misión');
  await missionWrite(a,'observation','He observado una mochila rota');await missionButton(a,'Guardar progreso').fire('click');
  await missionWrite(a,'reflection','Necesito preguntar si ocurre a más personas');
  for(let i=0;i<3;i++)await missionButton(a,'Continuar →').fire('click');
  assert.equal(a.window.MPDMissionStore.read().completed,false);
  await missionButton(a,'Finalizar misión manualmente').fire('click');
  assert.equal(a.window.MPDMissionStore.read().completed,true);assert.equal(a.window.MPDMissionStore.read().investigationStatus,'pending');
  assert.equal(mem.values.get(DATA),raw);assert.equal(mem.values.get(HABITS),habits);assert.equal(a.model().badges.filter(b=>b.earned).length,3);
  const b=makeApp(mem,{core:true,mission:true});b.window.MPDMission.open();assert.equal(missionInput(b,'reflection').value,'Necesito preguntar si ocurre a más personas');assert.equal(b.document.getElementById('mission-step-4').hidden,false);
});

test('Misión copia referencias solo voluntariamente y protege borradores al volver y continuar aprendiendo',async()=>{
  const mem=memory(),raw=JSON.stringify(fixture());mem.values.set(DATA,raw);const app=makeApp(mem,{core:true,journey:true,mission:true});
  assert.equal(missionInput(app,'observation').value,'');app.window.MPDMission.open();
  const uses=app.document.getElementById('mission-detective').querySelectorAll('button').filter(n=>n.textContent==='Usar como punto de partida');
  await uses[0].fire('click');assert.equal(missionInput(app,'observation').value,'Respuesta anterior problema');
  await uses[1].fire('click');assert.equal(missionInput(app,'investigation').value,'Respuesta anterior alternativa');
  assert.equal(mem.values.get(DATA),raw);assert.equal(mem.values.has(MISSION),false);
  await missionWrite(app,'observation','Borrador propio');await uses[0].fire('click');assert.equal(missionInput(app,'observation').value,'Borrador propio');
  assert.equal(app.window.MPDLearning.hasUnsavedChanges(),true);
  await missionButton(app,'← Volver').fire('click');assert.equal(missionInput(app,'observation').value,'Borrador propio');
  app.window.MPDMission.open();app.window.MPDLearning.continueRecommended();assert.equal(app.document.getElementById('mission-detective').hidden,true);
  assert.equal(missionInput(app,'observation').value,'Borrador propio');assert.equal(app.window.MPDLearning.hasUnsavedChanges(),true);
});

test('Misión detecta conflictos, permite consultar y exige confirmación para recuperar',async()=>{
  const mem=memory(),a=makeApp(mem,{core:true,mission:true}),b=makeApp(mem,{core:true,mission:true});
  await missionWrite(a,'observation','Descubrimiento A');await missionButton(a,'Guardar progreso').fire('click');
  await missionWrite(b,'observation','Borrador B');await missionButton(b,'Guardar progreso').fire('click');
  assert.equal(b.window.MPDMissionStore.read().answers.observation,'Descubrimiento A');assert.equal(missionInput(b,'observation').value,'Borrador B');
  assert.equal(b.document.getElementById('missionGlobalStatus').hidden,false);assert.equal(b.window.MPDMission.hasUnsavedChanges(),true);
  await missionButton(b,'Consultar versión guardada').fire('click');assert.equal(missionInput(b,'observation').value,'Borrador B');
  await missionButton(b,'Cargar versión guardada').fire('click');assert.equal(missionInput(b,'observation').value,'Borrador B');
  b.window.confirm=()=>true;await missionButton(b,'Cargar versión guardada').fire('click');assert.equal(missionInput(b,'observation').value,'Descubrimiento A');
  await missionWrite(b,'investigation','Solo observado');await missionButton(b,'Guardar progreso').fire('click');assert.equal(b.window.MPDMissionStore.read().answers.investigation,'Solo observado');
});

test('Misión con cuota agotada o datos inválidos conserva borradores y no confirma éxito',async()=>{
  for(const corrupt of [false,true]){
    const mem=memory();if(corrupt)mem.values.set(MISSION,'{invalido');const raw=mem.values.get(MISSION);
    const app=makeApp(mem,{core:true,mission:true});mem.fail=!corrupt;await missionWrite(app,'observation','Observación sin perder');await missionButton(app,'Guardar progreso').fire('click');
    assert.equal(mem.values.get(MISSION),raw);assert.equal(missionInput(app,'observation').value,'Observación sin perder');assert.equal(app.window.MPDMission.hasUnsavedChanges(),true);
    assert.equal(app.document.getElementById('missionGlobalStatus').hidden,false);
  }
});

test('Misión actualiza otras ventanas sin sobrescribir borradores y permite los tres estados de investigación',async()=>{
  const mem=memory(),a=makeApp(mem,{core:true,mission:true}),b=makeApp(mem,{core:true,mission:true});
  await missionWrite(a,'observation','Una dificultad real');await missionButton(a,'Guardar progreso').fire('click');
  await b.events.storage({key:MISSION});assert.equal(missionInput(b,'observation').value,'Una dificultad real');
  await missionWrite(b,'reflection','Mi borrador');await missionWrite(a,'observation','Nueva observación');await missionButton(a,'Guardar progreso').fire('click');
  await b.events.storage({key:MISSION});assert.equal(missionInput(b,'reflection').value,'Mi borrador');
  const choices=a.document.getElementById('mission-detective').querySelectorAll('input');assert.equal(choices.length,3);
  for(const choice of choices){choices.forEach(n=>n.checked=n===choice);await choice.fire('change');await missionButton(a,'Guardar progreso').fire('click');assert.equal(a.window.MPDMissionStore.read().investigationStatus,choice.value);}
});

test('Misión enlaza desde Inicio y la lección, con etiquetas accesibles y sin nueva pestaña',async()=>{
  const app=makeApp(memory(),{core:true,journey:true,mission:true});await startCore(app);
  await app.document.getElementById('dashboardMissionButton').fire('click');assert.equal(app.document.getElementById('aprendizaje').hidden,false);assert.equal(app.document.getElementById('learningRoutes').hidden,true);
  assert.equal(app.document.activeElement.id,'mission-title');await missionButton(app,'← Volver').fire('click');assert.equal(app.document.getElementById('inicio').hidden,false);
  const launch=app.elements.find(n=>n.tag==='button'&&n.textContent==='Detective de problemas · Misión práctica');assert.ok(launch);
  const before=app.model();await launch.fire('click');assert.equal(app.document.getElementById('mission-detective').hidden,false);await missionButton(app,'← Volver').fire('click');assert.equal(app.document.activeElement,launch);
  assert.equal(app.model().saved,before.saved);assert.equal(app.model().badges.filter(n=>n.earned).length,before.badges.filter(n=>n.earned).length);
  for(const id of ['observation','investigation','reflection'])assert.ok(app.elements.some(n=>n.tag==='label'&&n.htmlFor===missionInput(app,id).id));
  assert.equal([...read('mi_progreso_diario.html').matchAll(/class="nav-button"/g)].length,4);
  assert.ok(read('aprendizaje.css').includes('.mission-view'));assert.ok(read('pwa.js').includes('window.MPDMission?.hasUnsavedChanges()'));
});

test('publicación v0.10.2: todos los recursos de ejecución están incluidos en caché',()=>{
  const html=read('mi_progreso_diario.html'),sw=read('sw.js');assert.ok(html.includes('Mi Progreso Diario · v0.10.2'));assert.ok(sw.includes('const VERSION = "0.10.2"'));
  const files=[...sw.matchAll(/"\.\/([^"\n]+)"/g)].map(m=>m[1]);
  for(const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)){assert.ok(files.includes(match[1]),match[1]);assert.ok(fs.existsSync(path.join(ROOT,match[1])));}
  for(const file of ['misiones-contenido.js','misiones-storage.js','misiones.js'])assert.ok(files.includes(file));
});

test('actualización PWA protege borradores, espera guardados y no repite el aviso tras activarse',async()=>{
  const app=makeApp(memory(),{core:true,render:false}),swEvents={},locks=[],sent=[],timers=new Map();let reloads=0,dirty=true;
  const controller={state:'activated'},worker={state:'installed',addEventListener(){},postMessage(message){sent.push(message);}};
  const reg={waiting:worker,installing:null,addEventListener(){},update:async()=>{}};
  const serviceWorker={controller,addEventListener(type,fn){swEvents[type]=fn;},register:async()=>reg};
  app.context.navigator.serviceWorker=serviceWorker;app.context.navigator.onLine=true;
  app.context.navigator.locks.request=async(key,fn)=>{locks.push(key);return fn();};
  app.window.isSecureContext=true;app.window.MPDMission={hasUnsavedChanges:()=>dirty};app.window.MPDMissionStore={key:MISSION};
  app.context.location={protocol:'https:',reload(){reloads++;}};
  app.context.setTimeout=(fn,delay)=>{const id=timers.size+1;timers.set(id,{fn,delay});return id;};app.context.clearTimeout=id=>timers.delete(id);
  app.document.getElementById('savedStatus').textContent='Datos guardados en este navegador.';
  vm.runInContext(read('pwa.js'),app.context);await new Promise(setImmediate);
  const banner=app.document.getElementById('pwaUpdate'),button=app.document.getElementById('pwaUpdateButton');
  assert.equal(banner.hidden,false);await button.fire('click');assert.equal(sent.length,0);assert.ok(app.document.getElementById('pwaUpdateMessage').textContent.includes('sin guardar'));
  dirty=false;await button.fire('click');assert.deepEqual(locks,[HABITS,DATA,PREF,MISSION]);assert.equal(sent[0].type,'APPLY_UPDATE');
  serviceWorker.controller=worker;reg.waiting=null;worker.state='activated';swEvents.controllerchange();
  assert.equal(reloads,1);assert.equal(banner.hidden,true);assert.equal(button.disabled,false);
  await app.events.online();assert.equal(banner.hidden,true);assert.equal(reloads,1);assert.equal(app.mem.writes.length,0);
});

test('service worker no fuerza actualizaciones y mantiene caché anterior si falla la instalación',async()=>{
  const events={},messages=[];let activated=0,windows=[{url:'https://example.test/app/mi_progreso_diario.html'},{url:'https://example.test/app/'}];
  const context=vm.createContext({URL,Request,caches:{open:async()=>({addAll:async()=>{throw Error('Recurso no disponible');}})},self:{registration:{scope:'https://example.test/app/'},addEventListener(type,fn){events[type]=fn;},skipWaiting:async()=>{activated++;},clients:{matchAll:async()=>windows}}});
  vm.runInContext(read('sw.js'),context);let pending;events.install({waitUntil(p){pending=p;}});await assert.rejects(pending,/Recurso no disponible/);assert.equal(activated,0);
  events.message({data:{type:'APPLY_UPDATE'},source:{postMessage(message){messages.push(message);}},waitUntil(p){pending=p;}});await pending;assert.equal(messages[0].type,'UPDATE_BLOCKED');assert.equal(activated,0);
  windows=windows.slice(0,1);events.message({data:{type:'APPLY_UPDATE'},waitUntil(p){pending=p;}});await pending;assert.equal(activated,1);
});

test('Inicio compacto conserva objetivos largos completos y solo resume su presentación',async()=>{
  const mem=memory(),goal='Objetivo muy largo para revisar con texto ampliado. '.repeat(15);
  mem.values.set(HABITS,JSON.stringify({day:mem.day,habits:[],weeklyGoal:goal,history:{}}));
  const app=makeApp(mem,{core:true,render:false});await startCore(app);
  assert.equal(app.document.getElementById('goalPreview').textContent,goal.trim());assert.equal(app.document.getElementById('weeklyGoal').value,goal);
  assert.equal(Array.from(app.document.getElementById('goalCompactPreview').textContent).length,71);
  await app.document.getElementById('editGoal').fire('click');assert.equal(app.document.getElementById('goalEditor').open,true);assert.equal(app.document.activeElement.id,'weeklyGoal');
  assert.equal(JSON.parse(mem.values.get(HABITS)).weeklyGoal,goal);
});

test('Inicio compacto: orden semántico, pantallas estrechas, horizontal y texto ampliado sin recortes',()=>{
  const html=read('mi_progreso_diario.html'),home=html.slice(html.indexOf('<section id="inicio"'),html.indexOf('<section id="habitos"'));
  const ids=['progressLabel','pendingTitle','dashboardLearningTitle','goalTitle','missionShortcutTitle'];
  for(let i=1;i<ids.length;i++)assert.ok(home.indexOf('id="'+ids[i-1]+'"')<home.indexOf('id="'+ids[i]+'"'));
  assert.equal((home.match(/id="weeklyGoal"/g)||[]).length,1);assert.ok(home.includes('<details class="pending-disclosure"'));
  const compact=html.slice(html.indexOf('/* Inicio compacto:'),html.indexOf('</style>'));
  assert.ok(compact.includes('@media(max-width:359px)'));assert.ok(compact.includes('@media(max-width:759px)'));assert.ok(compact.includes('(orientation:landscape)'));
  assert.ok(compact.includes('minmax(0,1fr)'));assert.ok(compact.includes('min-height:44px'));assert.ok(compact.includes('flex-wrap:wrap'));
  assert.ok(!/overflow\s*:\s*hidden|line-clamp|(?:^|[;{])\s*max-height\s*:|height\s*:\s*100(vh|dvh)|position\s*:\s*absolute/.test(compact));
  assert.ok(compact.includes('body:has(#inicio:not([hidden])) #savedStatus:not(.is-error)'));
  assert.ok(html.includes('safe-area-inset-bottom'));assert.ok(html.includes('safe-area-inset-left'));
});


test('misión móvil: títulos sin icono usan todo el ancho y no se parten dentro de las palabras',()=>{
  const app=makeApp(memory(),{core:true,mission:true});
  const mission=app.document.getElementById('mission-detective');
  const titles=mission.querySelectorAll('strong').map(n=>n.textContent);
  for(const word of ['Observar','Investigar','Reflexionar'])assert.ok(titles.includes(word));
  const css=read('aprendizaje.css'),patch=css.slice(css.indexOf('/* Parche de misión:'));
  assert.ok(patch.includes('@media(max-width:480px)'));
  assert.ok(patch.includes('.mission-view .learning-story-card { grid-template-columns:minmax(0,1fr); }'));
  assert.ok(patch.includes('grid-column:1 / -1'));assert.ok(patch.includes('overflow-wrap:normal; word-break:normal; hyphens:none;'));
  assert.ok(!patch.includes('font-size:'));assert.ok(!patch.includes('overflow:hidden'));
});
