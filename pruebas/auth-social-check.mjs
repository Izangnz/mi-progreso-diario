import {createRequire} from 'node:module'; const require=createRequire(import.meta.url); const assert=require('node:assert/strict'); const vm=require('node:vm'); const fs=require('node:fs'); const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
function harness() {
 const elements=new Map(), store=new Map(), writes=[];
 function el(id) {
  if(elements.has(id)) return elements.get(id);
  const value={value:'',textContent:'',hidden:false,checked:false,style:{},listeners:{},children:[],disabled:true,
   addEventListener(t,fn){this.listeners[t]=fn;},setAttribute(){},removeAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},
   append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},
   reset(){for(const id of ['cloud-profileAlias','cloud-displayName'])el(id).value='';el('cloud-publishProfile').checked=false;},
   querySelectorAll(){return [];},reportValidity(){return true;}};
  elements.set(id,value);return value;
 }
 const context=vm.createContext({console,URL,URLSearchParams,Intl,Date,Math,
  setTimeout:fn=>{fn();},location:{href:'http://localhost/mi_progreso_diario.html',protocol:'http:',hash:'',pathname:'/mi_progreso_diario.html',search:''},history:{replaceState(){}},
  document:{getElementById:el,createElement:()=>el(Symbol()),addEventListener(){},hidden:false},
  localStorage:{getItem:k=>store.get(k)??null,setItem(k,v){writes.push(k);store.set(k,v);}},window:{}});
 return {context,el,store,writes};
}

const h=harness();h.context.window.MPDPublicPeople={connect(){},async open(){}};
h.context.window.MPD_SUPABASE={url:'https://example.supabase.co',publishableKey:'sb_publishable_test'};
let last, pending;
h.context.sdk={createClient:()=>({auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}}),signInWithPassword:async args=>{last=['signin',args];return await new Promise(resolve=>pending=resolve);},signUp:async args=>{last=['signup',args];return {error:null};},signOut:async()=>({error:null})}})};
const source=read('account.js').replace("import('https://esm.sh/@supabase/supabase-js@2.49.1')",'Promise.resolve(sdk)');
await vm.runInContext(source,h.context);
h.el('cloud-openAuth').listeners.click();assert.equal(h.el('cloud-authDialog').open,true);
h.el('cloud-switchAuth').listeners.click();assert.equal(h.el('cloud-authSubmit').textContent,'Crear cuenta');assert.equal(h.el('cloud-password').autocomplete,'new-password');
h.el('cloud-switchAuth').listeners.click();assert.equal(h.el('cloud-authSubmit').textContent,'Iniciar sesión');
h.el('cloud-email').value='test@example.invalid';h.el('cloud-password').value='not-a-real-password';
h.el('cloud-credentials').listeners.submit({preventDefault(){}});assert.equal(last[0],'signin');assert.equal(h.el('cloud-authSubmit').textContent,'Un momento…');
pending({error:{code:'invalid_credentials'}});await new Promise(setImmediate);
assert.match(h.el('cloud-authStatus').textContent,/incorrectos/);assert.equal(h.el('cloud-password').value,'');
h.el('cloud-switchAuth').listeners.click();h.el('cloud-password').value='not-a-real-password';h.el('cloud-credentials').listeners.submit({preventDefault(){}});await new Promise(setImmediate);assert.equal(last[0],'signup');assert.match(last[1].options.emailRedirectTo,/mi_progreso_diario.html$/);
h.el('cloud-closeAuth').listeners.click();assert.equal(h.el('cloud-authDialog').open,false);assert.deepEqual(h.writes,[]);
export const result='PASS: navegación de acceso/registro, modal, carga, errores, callback y cero escrituras de datos locales (SDK simulado).';
