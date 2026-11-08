/* Sincronización privada: revisiones CAS, operación durable e idempotencia. */
(() => {
 // Cambiar solo después de validar SQL/RLS y autorizar su despliegue.
 const CLOUD_ENABLED = false;
 const store=window.MPDUserStorage,$=id=>document.getElementById(id);
 let client=null,running=false,queued=false,schemaMissing=false,backoff=0,retryAt=0;
 const status=message=>{$('sync-status').textContent=message;};
 const current=(epoch,uid)=>epoch===store.epoch() && uid===store.owner();
 function checkError(error){if(error){const e=Error('No se pudo confirmar la sincronización.');e.code=error.code;throw e;}}
 function describe(snapshot){const conflict=snapshot.meta.conflict;$('sync-conflict').hidden=!conflict;if(conflict){$('sync-conflict-summary').textContent=`Local: ${snapshot.data?.habits?.length||0} hábitos, ${Object.keys(snapshot.data?.history||{}).length} días. Remota: ${conflict.payload?.habits?.length||0} hábitos, ${Object.keys(conflict.payload?.history||{}).length} días. Revisión remota ${conflict.revision}.`;status('Guardado en este dispositivo. Conflicto pendiente de resolver.');}}
 async function remote(uid){const result=await client.from('mpd_habit_state').select('revision,payload').eq('user_id',uid).maybeSingle();checkError(result.error);const value=result.data??{revision:0,payload:null};if(!Number.isSafeInteger(value.revision)||value.revision<0)throw Error('Revisión remota inválida.');if(value.payload)store.validateHabits(value.payload);return value;}
 async function run(force=false){
  if(!CLOUD_ENABLED){status('Guardado en este dispositivo. Sincronización Cloud desactivada.');return;}
  if(force){schemaMissing=false;retryAt=0;}
  if(running){queued=true;return;}
  const uid=store.owner(),epoch=store.epoch();if(!uid){status('Guardado en este dispositivo. Inicia sesión para sincronizar.');return;}
  if(!client||navigator.onLine===false){status('Guardado en este dispositivo · Pendiente de sincronizar al recuperar conexión.');return;}
  if(schemaMissing){status('Guardado en este dispositivo · Pendiente: falta aplicar el SQL de sincronización.');return;}
  if(Date.now()<retryAt)return;
  running=true;queued=false;$('sync-panel').setAttribute('aria-busy','true');status('Guardado en este dispositivo · Pendiente de sincronizar…');
  try{
   const auth=await client.auth.getUser();if(!current(epoch,uid))return;checkError(auth.error);if(auth.data?.user?.id!==uid)throw Error('La sesión no coincide con el propietario local.');
   let snapshot=await store.sync.snapshot();if(!current(epoch,uid))return;
   if(snapshot.meta.conflict){describe(snapshot);return;}
   if(snapshot.meta.review){$('sync-review').hidden=false;const missing=snapshot.meta.review.missing||{};$('sync-review-summary').textContent=`Revisa ${(missing.habits||[]).length} hábitos, ${(missing.history_days||[]).length} días y ${(missing.history_entries||[]).length} entradas; no se ha aplicado la eliminación.`;status('Pendiente de confirmación explícita. No se reenvía la operación.');return;}
   if(snapshot.meta.pendingRecovery){const operation=snapshot.meta.pendingRecovery;const response=await client.rpc('mpd_restore_habits',{operation_id:operation.id,base_revision:operation.base,version_revision:operation.version});if(!current(epoch,uid))return;checkError(response.error);
    if(response.data?.status==='version_unavailable'){await store.sync.cancelRecovery();status('La versión ya no está disponible; no se ha restaurado nada.');return;}
    if(response.data?.status==='rate_limited'){retryAt=Date.now()+60000;status('Recuperación pendiente por límite temporal.');return;}
    if(response.data?.status==='conflict'){await store.sync.conflict({revision:response.data.revision,payload:response.data.payload});describe(await store.sync.snapshot());return;}
    if(response.data?.status!=='applied'||!Number.isSafeInteger(response.data.revision))throw Error('Recuperación no confirmada.');
    const recovered=await remote(uid);if(!current(epoch,uid))return;if(!recovered.payload||recovered.revision<response.data.revision)throw Error('Versión recuperada no disponible.');
    const outcome=await store.sync.finishRecovery(operation.id,recovered);if(!current(epoch,uid))return;if(outcome==='conflict'){describe(await store.sync.snapshot());return;}window.dispatchEvent(new Event('mpd-habits-pulled'));status('Versión recuperada en una revisión nueva. Datos locales anteriores archivados.');return;
   }

   // Una operación pendiente se reintenta intacta antes de cualquier descarga.
   if(!snapshot.meta.pending){const server=await remote(uid);if(!current(epoch,uid))return;const pulled=await store.sync.pull(server);if(!current(epoch,uid))return;if(pulled==='conflict'){describe(await store.sync.snapshot());return;}if(pulled==='downloaded')window.dispatchEvent(new Event('mpd-habits-pulled'));}
   for(let attempts=0;attempts<4;attempts++){
    if(!current(epoch,uid))return;const operation=await store.sync.freeze();if(!operation)break;if(operation.protocol!==2||!operation.intent){status('Cola de una versión anterior: exporta los datos y revisa la migración del cliente antes de enviarla.');return;}
    const response=await client.rpc('mpd_commit_habits',{operation_id:operation.id,base_revision:operation.base,document:operation.payload,intent:operation.intent});if(!current(epoch,uid))return;checkError(response.error);
    if(response.data?.status==='rate_limited'){retryAt=Date.now()+Math.max(60,Number(response.data.retry_after)||60)*1000;status('Guardado en este dispositivo · Límite temporal de sincronización. Se reintentará después.');return;}
    if(['deletion_requires_confirmation','goal_clear_requires_confirmation'].includes(response.data?.status)){await store.sync.review(response.data);$('sync-review').hidden=false;const missing=response.data.missing||{};$('sync-review-summary').textContent=`Se solicita retirar ${(missing.habits||[]).length} hábitos, ${(missing.history_days||[]).length} días y ${(missing.history_entries||[]).length} entradas históricas${response.data.status==='goal_clear_requires_confirmation'?' y vaciar el objetivo':''}.`;status('Guardado localmente. Supabase no ha aplicado eliminaciones: revisa y confirma.');return;}
    if(response.data?.status==='restore_required'){status('No se ha enviado: hay hábitos o fechas eliminados. Usa recuperación de versiones para restaurarlos explícitamente.');return;}
    if(response.data?.status==='conflict'){const server={revision:response.data.revision,payload:response.data.payload};if(!server.payload||!Number.isSafeInteger(server.revision))throw Error('Conflicto remoto inválido.');store.validateHabits(server.payload);await store.sync.conflict(server);describe(await store.sync.snapshot());return;}
    if(response.data?.status!=='applied'||!Number.isSafeInteger(response.data.revision)||response.data.revision!==operation.base+1)throw Error('El servidor no confirmó la operación.');
    await store.sync.ack(operation.id,response.data.revision,response.data.payload);if(current(epoch,uid)&&response.data.payload)window.dispatchEvent(new Event('mpd-habits-pulled'));
   }
   if(!current(epoch,uid))return;
   const server=await remote(uid);if(!current(epoch,uid))return;const pulled=await store.sync.pull(server);if(!current(epoch,uid))return;if(pulled==='downloaded')window.dispatchEvent(new Event('mpd-habits-pulled'));
   snapshot=await store.sync.snapshot();if(!current(epoch,uid))return;describe(snapshot);
   if(!snapshot.meta.conflict)status(snapshot.meta.dirty||snapshot.meta.pending?'Guardado en este dispositivo · Pendiente de sincronizar.':'Sincronizado · Hábitos, historial y objetivo confirmados en tu cuenta.');backoff=0;retryAt=0;
  }catch(error){if(!current(epoch,uid))return;schemaMissing=['PGRST202','PGRST205','42P01'].includes(error.code);backoff=Math.min(backoff?backoff*2:5000,60000);retryAt=Date.now()+backoff;status(schemaMissing?'Guardado en este dispositivo · Pendiente: SQL de sincronización aún no disponible.':'Guardado en este dispositivo · Pendiente de sincronizar. Revisa conexión o sesión y vuelve a intentarlo.');}
  finally{running=false;$('sync-panel').setAttribute('aria-busy','false');if(queued){queued=false;queueMicrotask(()=>run());}}
 }
 $('sync-versions').addEventListener('click',async()=>{const uid=store.owner(),epoch=store.epoch();if(!CLOUD_ENABLED||running||!uid||!client)return;try{const auth=await client.auth.getUser();checkError(auth.error);if(auth.data?.user?.id!==uid||!current(epoch,uid))return;const response=await client.from('mpd_habit_versions').select('revision,saved_at').eq('user_id',uid).order('revision',{ascending:false}).limit(10);if(!current(epoch,uid))return;checkError(response.error);$('sync-version').replaceChildren();for(const version of response.data||[]){if(!Number.isSafeInteger(version.revision))continue;const option=document.createElement('option');option.value=String(version.revision);option.textContent='Revisión '+version.revision+' · '+new Date(version.saved_at).toLocaleString('es-ES');$('sync-version').append(option);}status(response.data?.length?'Versiones propias disponibles. Restaurar requiere confirmación; no borra las copias locales.':'No hay versiones recuperables disponibles.');}catch{if(current(epoch,uid))status('No se pudieron consultar las versiones. Puede faltar el SQL revisado.');}});
 $('sync-restore').addEventListener('click',async()=>{if(!CLOUD_ENABLED||running||!$('sync-restore-consent').checked||navigator.onLine===false)return;const version=Number($('sync-version').value);if(!Number.isSafeInteger(version)||version<1)return;const epoch=store.epoch();try{await store.sync.startRecovery(version);if(epoch!==store.epoch())return;$('sync-restore-consent').checked=false;run(true);}catch{status('Primero sincroniza o resuelve los cambios pendientes. No se ha iniciado recuperación.');}});
 $('sync-review-consent').addEventListener('change',()=>{$('sync-review-accept').disabled=!$('sync-review-consent').checked;});
 $('sync-review-accept').addEventListener('click',async()=>{if(!CLOUD_ENABLED||running||!$('sync-review-consent').checked)return;const epoch=store.epoch();try{await store.sync.confirmDeletionReview();if(epoch!==store.epoch())return;$('sync-review').hidden=true;$('sync-review-consent').checked=false;run(true);}catch{status('No se confirmó la eliminación. Los datos se conservan.');}});
 $('sync-retry').addEventListener('click',()=>run(true));
 $('sync-consent').addEventListener('change',()=>{$('sync-accept').disabled=!$('sync-consent').checked;});
 function download(value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='progressmate-conflicto.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('sync-export').addEventListener('click',async()=>{try{const token=store.epoch(),snapshot=await store.sync.snapshot();if(token!==store.epoch())return;download({local:snapshot.data,pending:snapshot.meta.pending,remote:snapshot.meta.conflict?.payload,revision:snapshot.meta.conflict?.revision});}catch{status('No se pudo exportar. Los datos permanecen en este dispositivo.');}});
 $('sync-accept').addEventListener('click',async()=>{if(!CLOUD_ENABLED||running||!$('sync-consent').checked)return;const epoch=store.epoch(),uid=store.owner();running=true;$('sync-accept').disabled=true;try{if(!client||navigator.onLine===false)throw Error();const auth=await client.auth.getUser();checkError(auth.error);if(auth.data?.user?.id!==uid||!current(epoch,uid))return;const expected=(await store.sync.snapshot()).meta.conflict?.revision;const latest=await remote(uid);if(!current(epoch,uid))return;if(latest.revision!==expected){await store.sync.conflict(latest);describe(await store.sync.snapshot());$('sync-consent').checked=false;status('La versión remota cambió. Revisa el resumen y confirma de nuevo.');return;}await store.sync.conflict(latest);await store.sync.acceptRemote();if(!current(epoch,uid))return;$('sync-conflict').hidden=true;$('sync-consent').checked=false;window.dispatchEvent(new Event('mpd-habits-pulled'));status('Versión remota conservada. Cambios locales archivados; puedes exportarlos desde Mi perfil.');}catch{if(current(epoch,uid))status('No se pudo resolver el conflicto. Ambas versiones se conservan.');}finally{running=false;}});
 window.addEventListener('mpd-owner-lock',()=>{$('sync-version').replaceChildren();$('sync-restore-consent').checked=false;$('sync-review').hidden=true;$('sync-review-summary').textContent='';$('sync-review-consent').checked=false;$('sync-review-accept').disabled=true;$('sync-conflict').hidden=true;$('sync-conflict-summary').textContent='';$('sync-consent').checked=false;$('sync-accept').disabled=true;status('Datos anteriores ocultos. Comprobando cuenta…');schemaMissing=false;retryAt=0;});
 for(const event of ['mpd-owner-ready','mpd-sync-dirty','mpd-imported','online'])window.addEventListener(event,()=>run());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)run();});
 setInterval(()=>{if(!document.hidden)run();},30000);
 for(const id of ['sync-retry','sync-versions','sync-restore','sync-review-accept','sync-accept'])$(id).disabled=!CLOUD_ENABLED;
 $('sync-panel').hidden=!CLOUD_ENABLED;
 window.MPDHabitSync={connect:sdk=>{if(CLOUD_ENABLED)client=sdk;run();},run};
})();
