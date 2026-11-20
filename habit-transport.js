/* Peticiones privadas ligadas a un JWT verificado e inmutable por ciclo. */
(() => {
 const controllers=new Set();
 let verified;
 function timeout(promise){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tiempo de validación agotado.')),10000);})]).finally(()=>clearTimeout(timer));}
 for(const event of ['mpd-owner-lock','mpd-sync-disabled'])window.addEventListener(event,()=>{verified=undefined;for(const controller of controllers)controller.abort();controllers.clear();});
 async function open(sdk,{uid,epoch}){
  const store=window.MPDUserStorage,current=()=>store.owner()===uid&&store.epoch()===epoch;
  const config=window.MPD_SUPABASE;
  const policy=window.MPDCloudRelease;
  if(!policy?.enabled()||config?.url!==policy.backend)throw Error('Transporte Cloud deshabilitado para este origen.');
  const base=new URL(config.url);
  if(verified?.sdk===sdk && verified.uid===uid && verified.epoch===epoch &&
     verified.until>Date.now() && current()) return verified.transport;
  if(!config.publishableKey?.startsWith('sb_publishable_'))throw Error('Clave publicable requerida.');
  const session=await timeout(sdk.auth.getSession());
  if(!current()||session.error||session.data?.session?.user?.id!==uid||typeof session.data.session.access_token!=='string')throw Error('Sesión de sincronización inválida.');
  const jwt=session.data.session.access_token;
  const user=await timeout(sdk.auth.getUser(jwt));
  if(!current()||user.error||user.data?.user?.id!==uid)throw Error('El token no pertenece a la cuenta local.');
  // La metadata del usuario no concede ni restringe permisos; se conserva RLS y consentimiento explícito.
  async function request(path,body){
   if(!policy.enabled())throw Error('Sincronización Cloud deshabilitada.');
   if(!current())throw Error('La cuenta cambió.');
   const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),10000);
   try{
    const response=await fetch(base.href.replace(/\/$/,'')+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,credentials:'omit',redirect:'error',cache:'no-store'});
    if(response.status===401 || response.status===403)verified=undefined;
    const data=await response.json();if(!current())throw Error('Respuesta de otra sesión descartada.');
    return response.ok?{data,error:null}:{data:null,error:{code:data?.code,status:response.status}};
   }finally{clearTimeout(timer);controllers.delete(controller);}
  }
  const transport={
   rpc(name,args){if(!['mpd_commit_habits','mpd_restore_habits','mpd_habit_protocol'].includes(name))throw Error('RPC no permitida.');return request('rpc/'+name,args);},
   from(table){
    if(!['mpd_habit_state','mpd_habit_versions'].includes(table))throw Error('Tabla no permitida.');
    const query=new URLSearchParams();let owned=false;
    const builder={select(fields){if(!['revision','revision,payload','revision,saved_at'].includes(fields))throw Error('Campos no permitidos.');query.set('select',fields);return builder;},eq(field,value){if(field!=='user_id'||value!==uid)throw Error('Propietario incorrecto.');owned=true;query.set(field,'eq.'+uid);return builder;},order(field,options){if(field!=='revision')throw Error('Orden inválido.');query.set('order','revision.'+(options?.ascending===false?'desc':'asc'));return builder;},async maybeSingle(){if(!owned)throw Error('Falta propietario.');query.set('limit','2');const result=await request(table+'?'+query);if(result.error)return result;if(!Array.isArray(result.data)||result.data.length>1)throw Error('Respuesta de estado inválida.');return {data:result.data[0]??null,error:null};},limit(n){if(!owned||n!==41)throw Error('Consulta inválida.');query.set('limit','41');return request(table+'?'+query);}};return builder;
   }
  };
  const protocol=await transport.rpc('mpd_habit_protocol',{});
  if(protocol.error||protocol.data?.protocol!==2||protocol.data?.schema!=='progressmate-sync-v018-1'){const error=Error('Contrato SQL de sincronización no validado.');error.code=protocol.error?.code||'PGRST202';throw error;}
  if(protocol.data.pilot!==true){const error=Error('Cloud Sync no habilitado para esta cuenta.');error.code='MPD_PILOT_DISABLED';throw error;}
  const expires=(session.data.session.expires_at ?? 0)*1000;
  verified={sdk,uid,epoch,until:Math.min(Date.now()+60000,expires-10000),transport};
  return transport;
 }
 window.MPDHabitTransport={open};
})();
