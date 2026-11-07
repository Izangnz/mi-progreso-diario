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
let visibility=true, reject=false, writes=0, readError=false, release;
const query={select(){return this;},eq(){return this;},maybeSingle:async()=>({data:visibility===null?null:{alias:'cuenta_a',display_name:'Nombre',is_public:visibility},error:readError?{}:null}),upsert(profile){writes++;return {select(){return {single:async()=>{if(release)await new Promise(resolve=>release=resolve);if(reject)return {error:{code:'42501'}};visibility=profile.is_public;return {data:{...profile}};}};}};}};
h.context.sdk={createClient:()=>({from:()=>query,auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{id:'user-a'}}}})}})};
const source=read('account.js').replace("import('https://esm.sh/@supabase/supabase-js@2.49.1')",'Promise.resolve(sdk)');
await vm.runInContext(source,h.context);
async function open(){h.el('profileEdit').listeners.click();await new Promise(setImmediate);}
await open();assert.equal(h.el('cloud-visibilityPublic').checked,true);
h.el('cloud-visibilityPublic').checked=false;h.el('cloud-visibilityPrivate').listeners.change();assert.equal(writes,0);h.el('profileCancel').listeners.click();assert.equal(h.el('cloud-visibilityPublic').checked,true);assert.equal(writes,0);
await open();h.el('cloud-visibilityPublic').checked=false;h.el('cloud-visibilityPrivate').listeners.change();await h.context.window.MPDCloudPrivacy.save();assert.equal(visibility,false);assert.match(h.el('cloud-privacyStatus').textContent,/Guardado en Supabase: Privada/);
reject=true;h.el('cloud-visibilityPublic').checked=true;h.el('cloud-visibilityPublic').listeners.change();await assert.rejects(h.context.window.MPDCloudPrivacy.save());assert.equal(visibility,false);assert.match(h.el('cloud-privacyStatus').textContent,/No se ha confirmado/);
reject=false;visibility=null;await open();assert.equal(h.el('cloud-visibilityPrivate').checked,true);
readError=true;await open();assert.equal(h.el('cloud-privacy').disabled,true);await assert.rejects(h.context.window.MPDCloudPrivacy.save());
readError=false;visibility=false;await open();release=true;const before=writes;const first=h.context.window.MPDCloudPrivacy.save();await new Promise(setImmediate);await assert.rejects(h.context.window.MPDCloudPrivacy.save());assert.equal(writes,before+1);release();release=null;await first;
assert.deepEqual(h.writes,[]);
export const result='PASS: carga real simulada, pública/privada, cancelación sin escritura, rechazo sin falso éxito, nueva cuenta privada y fallo de lectura bloqueado; cero cambios a datos locales.';
