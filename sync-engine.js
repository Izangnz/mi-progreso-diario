/* Motor independiente de formularios, SDK Auth y DOM. El transporte se inyecta ya validado. */
(() => {
 async function cycle({store,uid,epoch,current,readOnly=false,openTransport,events={}}){
  const status=events.status||(()=>{}),describe=events.conflict||(()=>{}),review=events.review||(()=>{}),notify=events.pulled||(()=>{}),retry=events.retry||(()=>{}),resetRetry=events.resetRetry||(()=>{});
 function checkError(error){if(error){const e=Error('No se pudo confirmar la sincronización.');e.code=error.code;throw e;}}
 async function remote(uid,transport){const result=await transport.from('mpd_habit_state').select('revision,payload').eq('user_id',uid).maybeSingle();checkError(result.error);const value=result.data??{revision:0,payload:null};if(!Number.isSafeInteger(value.revision)||value.revision<0)throw Error('Revisión remota inválida.');if(value.payload)store.validateHabits(value.payload);return value;}
   let snapshot=await store.sync.snapshot();if(!current(epoch,uid))return;
   if(snapshot.meta.conflict && (snapshot.meta.dirty || snapshot.meta.pending ||
       snapshot.meta.pendingRecovery || snapshot.meta.review || readOnly)){describe(snapshot);return;}
   const transport=await openTransport();if(!current(epoch,uid))return;
   if (!readOnly && !snapshot.meta.pending && !snapshot.meta.pendingRecovery && !snapshot.meta.review &&
       !snapshot.meta.dirty && !snapshot.meta.needsCanonical && snapshot.meta.revision !== null) {
    const result=await transport.from('mpd_habit_state').select('revision').eq('user_id',uid).maybeSingle();
    if(!current(epoch,uid))return;
    checkError(result.error);
    const revision=result.data?.revision ?? 0;
    if(!Number.isSafeInteger(revision)||revision<0)throw Error('Revisión remota inválida.');
    if(revision===snapshot.meta.revision && !snapshot.meta.conflict) {
      describe(snapshot);
      status('Sincronizado · Hábitos, historial y objetivo confirmados en tu cuenta.');
      resetRetry();
      return;
    }
   }
   await store.sync.backup();if(!current(epoch,uid))return;
   if(readOnly){
    if(snapshot.meta.pending || snapshot.meta.pendingRecovery || snapshot.meta.review){
     status('TEST de solo lectura. La operación local se conserva pendiente.');
     return;
    }
    const server=await remote(uid,transport);if(!current(epoch,uid))return;
    // Si no hay documento remoto, conservar la revisión local sin iniciar un envío.
    if(!server.payload){status('TEST de solo lectura. La cuenta aún no tiene copia remota.');return;}
    const pulled=await store.sync.pull(server);if(!current(epoch,uid))return;
    if(pulled==='conflict'){describe(await store.sync.snapshot());return;}
    if(pulled==='downloaded')notify();
    status('TEST de solo lectura. Hábitos, historial y objetivo consultados. Los cambios permanecen locales.');
    resetRetry();return;
   }

   if(snapshot.meta.review){review(snapshot.meta.review);status('Pendiente de confirmación explícita. No se reenvía la operación.');return;}
   if(snapshot.meta.pendingRecovery){const operation=snapshot.meta.pendingRecovery;if(!current(epoch,uid))return;const response=await transport.rpc('mpd_restore_habits',{operation_id:operation.id,base_revision:operation.base,version_revision:operation.version});if(!current(epoch,uid))return;checkError(response.error);
    if(response.data?.status==='version_unavailable'){await store.sync.cancelRecovery();status('La versión ya no está disponible; no se ha restaurado nada.');return;}
    if(response.data?.status==='rate_limited'){retry(60000);status('Recuperación pendiente por límite temporal.');return;}
    if(response.data?.status==='conflict'){await store.sync.conflict({revision:response.data.revision,payload:response.data.payload});describe(await store.sync.snapshot());return;}
    if(response.data?.status!=='applied'||!Number.isSafeInteger(response.data.revision))throw Error('Recuperación no confirmada.');
    const recovered=await remote(uid,transport);if(!current(epoch,uid))return;if(!recovered.payload||recovered.revision<response.data.revision)throw Error('Versión recuperada no disponible.');if(recovered.revision!==response.data.revision){await store.sync.conflict(recovered);describe(await store.sync.snapshot());status('La cuenta cambió en otro dispositivo durante la recuperación. Revisa el conflicto; se conserva tu copia local.');return;}
    const outcome=await store.sync.finishRecovery(operation.id,recovered);if(!current(epoch,uid))return;if(outcome==='conflict'){describe(await store.sync.snapshot());return;}notify();status('Versión recuperada en una revisión nueva. Datos locales anteriores archivados.');return;
   }

   // Una operación pendiente se reintenta intacta antes de cualquier descarga.
   if(!snapshot.meta.pending){const server=await remote(uid,transport);if(!current(epoch,uid))return;const pulled=await store.sync.pull(server);if(!current(epoch,uid))return;if(pulled==='conflict'){describe(await store.sync.snapshot());return;}if(pulled==='downloaded')notify();}
   snapshot=await store.sync.snapshot();if(!current(epoch,uid))return;
   if (!snapshot.meta.pending && !snapshot.meta.dirty) {
    describe(snapshot);
    status('Sincronizado · Hábitos, historial y objetivo confirmados en tu cuenta.');
    resetRetry();
    return;
   }
   for(let attempts=0;attempts<4;attempts++){
    if(!current(epoch,uid))return;const operation=await store.sync.freeze();if(!current(epoch,uid))return;if(!operation)break;if(operation.protocol!==2||!operation.intent){status('Cola de una versión anterior: exporta los datos y revisa la migración del cliente antes de enviarla.');return;}
    const response=await transport.rpc('mpd_commit_habits',{operation_id:operation.id,base_revision:operation.base,document:operation.payload,intent:operation.intent});if(!current(epoch,uid))return;checkError(response.error);
    if(response.data?.status==='rate_limited'){retry(Math.max(60,Number(response.data.retry_after)||60)*1000);status('Guardado localmente · Límite temporal de sincronización. Se reintentará después.');return;}
    if(['deletion_requires_confirmation','goal_clear_requires_confirmation'].includes(response.data?.status)){await store.sync.review(response.data);review(response.data);status('Guardado localmente. Supabase no ha aplicado eliminaciones: revisa y confirma.');return;}
    if(response.data?.status==='restore_required'){status('No se ha enviado: hay hábitos o fechas eliminados. Usa recuperación de versiones para restaurarlos explícitamente.');return;}
    if(response.data?.status==='conflict'){const server={revision:response.data.revision,payload:response.data.payload};if(!server.payload||!Number.isSafeInteger(server.revision))throw Error('Conflicto remoto inválido.');store.validateHabits(server.payload);await store.sync.conflict(server);describe(await store.sync.snapshot());return;}
    if(response.data?.status!=='applied'||!Number.isSafeInteger(response.data.revision)||response.data.revision!==operation.base+1)throw Error('El servidor no confirmó la operación.');
    await store.sync.ack(operation.id,response.data.revision,response.data.payload);if(current(epoch,uid)&&response.data.payload)notify();
   }
   if(!current(epoch,uid))return;
   const server=await remote(uid,transport);if(!current(epoch,uid))return;const pulled=await store.sync.pull(server);if(!current(epoch,uid))return;if(pulled==='downloaded')notify();
   snapshot=await store.sync.snapshot();if(!current(epoch,uid))return;describe(snapshot);
   if(!snapshot.meta.conflict)status(snapshot.meta.dirty||snapshot.meta.pending?'Guardado localmente · Pendiente de sincronizar.':'Sincronizado · Hábitos, historial y objetivo confirmados en tu cuenta.');resetRetry();
 }
 window.MPDSyncEngine=Object.freeze({cycle});
})();
