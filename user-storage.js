/* Datos privados locales: una transacción por operación, partición por user_id. */
(() => {
  const DB='progressmate-private-v017', stores=['records','photos','imports'];
  let database,owner=null,epoch=0,profileRaw=null,guestHabits=null;
  const empty=()=>({day:date(),habits:[],weeklyGoal:'',history:{}});
  const date=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function open(){if(!database)database=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>stores.forEach(name=>r.result.createObjectStore(name));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo abrir el almacenamiento privado.'));});return database;}
  const pendingTransactions=new Set();
  function transaction(names,mode,action){
    const job=(async()=>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(names,mode);let result;try{action(tx,value=>{result=value;});}catch(e){tx.abort();reject(e);return;}tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(Error('No se guardó la operación local; el estado anterior se conserva.'));});})();
    pendingTransactions.add(job);
    job.then(()=>pendingTransactions.delete(job),()=>pendingTransactions.delete(job));
    return job;
  }
  async function flush(){while(pendingTransactions.size)await Promise.all([...pendingTransactions]);}

  const key=(uid,name)=>uid+':'+name;
  async function read(uid,name){return transaction(['records'],'readonly',(tx,done)=>{const r=tx.objectStore('records').get(key(uid,name));r.onsuccess=()=>done(r.result??null);});}
  function same(token){if(token!==epoch)throw Error('La cuenta cambió. Se ha descartado la respuesta anterior.');}
  function notify(type){window.dispatchEvent(new Event(type));}
  async function activate(uid){
    if(uid!==null && !/^[0-9a-f-]{36}$/i.test(uid))throw Error('Identificador de sesión inválido.');
    const token=++epoch;owner=null;profileRaw=null;guestHabits=null;notify('mpd-owner-lock');
    const raw=uid?await read(uid,'profile'):null;same(token);owner=uid;profileRaw=raw;notify('mpd-owner-ready');
  }
  const blankIntent=()=>({habits:[],history_days:[],history_entries:[],clear_goal:false});
  const mergeIntent=(a={},b={})=>({habits:[...new Set([...(a.habits||[]),...(b.habits||[])])],history_days:[...new Set([...(a.history_days||[]),...(b.history_days||[])])],history_entries:[...new Set([...(a.history_entries||[]),...(b.history_entries||[])])],clear_goal:!!(a.clear_goal||b.clear_goal)});
  function diffIntent(before,after){const id=h=>typeof h.id+':'+h.id;const result=blankIntent();const ids=new Set(after.habits.map(id));result.habits=before.habits.map(id).filter(k=>!ids.has(k));result.history_days=Object.keys(before.history).filter(day=>!Object.hasOwn(after.history,day));for(const [day,record] of Object.entries(before.history)){if(!Object.hasOwn(after.history,day))continue;const entries=new Set(after.history[day].habits.map(id));result.history_entries.push(...record.habits.map(id).filter(k=>!entries.has(k)).map(k=>day+'|'+k));}result.clear_goal=!!before.weeklyGoal&&!after.weeklyGoal;return result;}
  const newSync = () => ({revision:null,dirty:false,existing:false,pending:null,conflict:null,intent:blankIntent()});
  async function bundle(action){const uid=owner,token=epoch;if(!uid)throw Error('Inicia sesión para sincronizar.');
    const result=await transaction(['records'],'readwrite',(tx,done)=>{const store=tx.objectStore('records'),h=store.get(key(uid,'habits')),m=store.get(key(uid,'sync'));let count=0;const finish=()=>{if(++count!==2)return;try{same(token);const meta=m.result??{...newSync(),existing:!!h.result};action({store,uid,data:h.result??null,meta,done});}catch{tx.abort();}};h.onsuccess=finish;m.onsuccess=finish;});same(token);return result;
  }
  async function habits(change,options={}){const uid=owner,token=epoch;if(!uid){guestHabits??=empty();const next=structuredClone(guestHabits);if(change)change(next);same(token);guestHabits=next;return next;}
    let changed=false;const result=await bundle(({store,uid,data,meta,done})=>{const value=data??empty(),before=JSON.stringify(value),previous=structuredClone(value),oldIds=value.habits.map(h=>typeof h.id+':'+h.id);if(change)change(value);
      const present=new Set(value.habits.map(h=>typeof h.id+':'+h.id));const deleted=oldIds.filter(id=>!present.has(id));if(options.userChange===true){const requested=diffIntent(previous,value);meta.intent=mergeIntent(meta.intent,requested);for(const [name,field] of [['history_days','deletedHistoryDays'],['history_entries','deletedHistoryEntries']])if(requested[name].length)value[field]=[...new Set([...(value[field]||[]),...requested[name]])];}if(deleted.length)value.deletedHabitIds=[...new Set([...(value.deletedHabitIds||[]),...deleted])];
      if(change&&JSON.stringify(value)!==before){changed=true;meta.dirty=true;meta.existing=meta.existing||options.userChange===true;store.put(value,key(uid,'habits'));store.put(meta,key(uid,'sync'));}done(value);});if(changed)notify('mpd-sync-dirty');return result;
  }
  const sync={
    diffIntent,
    snapshot:()=>bundle(({data,meta,done})=>done({data,meta})),
    freeze:()=>bundle(({store,uid,data,meta,done})=>{if(meta.conflict||meta.revision===null){done(null);return;}if(!meta.pending&&meta.dirty&&data){meta.pending={id:crypto.randomUUID(),base:meta.revision,payload:structuredClone(data),intent:structuredClone(meta.intent||blankIntent()),protocol:2};meta.intent=blankIntent();meta.dirty=false;store.put(meta,key(uid,'sync'));}done(meta.pending);}),
    pull:(remote)=>bundle(({store,uid,data,meta,done})=>{
      if(meta.pending){done('pending');return;}
      if(meta.revision===remote.revision){
        if(meta.needsCanonical&&remote.payload){validateHabits(remote.payload);if(!meta.dirty)store.put(remote.payload,key(uid,'habits'));else if(data){for(const field of ['deletedHabitIds','deletedHistoryDays','deletedHistoryEntries','importedLegacyHashes'])data[field]=[...new Set([...(data[field]||[]),...(remote.payload[field]||[])])];store.put(data,key(uid,'habits'));}meta.needsCanonical=false;store.put(meta,key(uid,'sync'));done('downloaded');return;}
        done('same');return;
      }
      if(remote.payload && (meta.dirty||meta.existing) && (meta.revision!==null||meta.existing)){
        meta.conflict=remote;store.put(meta,key(uid,'sync'));done('conflict');return;
      }
      if(!remote.payload && meta.revision===null && data)meta.dirty=true;
      if(remote.payload){validateHabits(remote.payload);if(data)store.put({habitsRaw:JSON.stringify(data),importedAt:new Date().toISOString(),kind:'before-cloud-download'},key(uid,'archive:'+crypto.randomUUID()));store.put(remote.payload,key(uid,'habits'));meta.dirty=false;}
      meta.revision=remote.revision;meta.existing=false;store.put(meta,key(uid,'sync'));done(remote.payload?'downloaded':'initialized');
    }),
    ack:(id,revision,payload)=>bundle(({store,uid,data,meta,done})=>{if(!meta.pending||meta.pending.id!==id){done(false);return;}if(payload){validateHabits(payload);if(!meta.dirty)store.put(payload,key(uid,'habits'));else if(data){for(const field of ['deletedHabitIds','deletedHistoryDays','deletedHistoryEntries','importedLegacyHashes'])data[field]=[...new Set([...(data[field]||[]),...(payload[field]||[])])];store.put(data,key(uid,'habits'));}}meta.pending=null;meta.revision=revision;meta.needsCanonical=!payload;meta.existing=false;meta.review=null;store.put(meta,key(uid,'sync'));done(true);}),
    startRecovery:version=>bundle(({store,uid,meta,done})=>{if(meta.pendingRecovery){done(meta.pendingRecovery);return;}if(meta.revision===null||meta.dirty||meta.pending||meta.conflict)throw Error('Sincroniza o resuelve los cambios pendientes antes de restaurar.');meta.pendingRecovery={id:crypto.randomUUID(),base:meta.revision,version};store.put(meta,key(uid,'sync'));done(meta.pendingRecovery);}),
    cancelRecovery:()=>bundle(({store,uid,meta,done})=>{meta.pendingRecovery=null;store.put(meta,key(uid,'sync'));done(true);}),
    finishRecovery:(id,remote)=>bundle(({store,uid,data,meta,done})=>{if(meta.pendingRecovery?.id!==id)throw Error('La recuperación no coincide con la operación pendiente.');validateHabits(remote.payload);meta.pendingRecovery=null;if(meta.dirty){meta.conflict=remote;store.put(meta,key(uid,'sync'));done('conflict');return;}if(data)store.put({kind:'before-recovery',habitsRaw:JSON.stringify(data),importedAt:new Date().toISOString()},key(uid,'archive:'+crypto.randomUUID()));store.put(remote.payload,key(uid,'habits'));meta.revision=remote.revision;meta.dirty=false;meta.needsCanonical=false;meta.intent=blankIntent();meta.review=null;store.put(meta,key(uid,'sync'));done('recovered');}),
    review:response=>bundle(({store,uid,meta,done})=>{meta.review=response;store.put(meta,key(uid,'sync'));done(true);}),
    confirmDeletionReview:()=>bundle(({store,uid,meta,done})=>{if(!meta.pending||!meta.review)throw Error('No hay una revisión de eliminaciones pendiente.');const previous=structuredClone(meta.pending);const intent=mergeIntent(meta.pending.intent,meta.review.missing||{});if(meta.review.status==='goal_clear_requires_confirmation')intent.clear_goal=true;const payload=structuredClone(meta.pending.payload);for(const [name,field] of [['habits','deletedHabitIds'],['history_days','deletedHistoryDays'],['history_entries','deletedHistoryEntries']])payload[field]=[...new Set([...(payload[field]||[]),...intent[name]])];meta.pending={id:crypto.randomUUID(),base:meta.pending.base,payload,intent,protocol:2};meta.review=null;store.put({kind:'confirmed-deletion-request',operation:previous,importedAt:new Date().toISOString()},key(uid,'archive:'+crypto.randomUUID()));store.put(meta,key(uid,'sync'));done(true);}),
    conflict:remote=>bundle(({store,uid,meta,done})=>{meta.conflict=remote;store.put(meta,key(uid,'sync'));done(true);}),
    acceptRemote:()=>bundle(({store,uid,data,meta,done})=>{if(!meta.conflict?.payload)throw Error('No hay versión remota disponible.');validateHabits(meta.conflict.payload);store.put({habitsRaw:JSON.stringify(data),sync:meta,importedAt:new Date().toISOString(),kind:'conflict-local-version'},key(uid,'archive:'+crypto.randomUUID()));store.put(meta.conflict.payload,key(uid,'habits'));meta.revision=meta.conflict.revision;meta.dirty=false;meta.existing=false;meta.pending=null;meta.conflict=null;meta.intent=blankIntent();meta.review=null;meta.pendingRecovery=null;meta.needsCanonical=false;store.put(meta,key(uid,'sync'));done(true);})
  };
  async function writeProfile(raw,baseline){const uid=owner,token=epoch;if(!uid)throw Error('Inicia sesión para guardar tu perfil privado.');await transaction(['records'],'readwrite',(tx)=>{const store=tx.objectStore('records'),r=store.get(key(uid,'profile'));r.onsuccess=()=>{if(token!==epoch || (r.result??null)!==baseline){tx.abort();return;}store.put(raw,key(uid,'profile'));};});same(token);profileRaw=raw;}
  async function photo(operation,id,blob){const uid=owner,token=epoch;if(!uid)throw Error('Inicia sesión para guardar fotografías.');const result=await transaction(['photos'],operation==='get'?'readonly':'readwrite',(tx,done)=>{same(token);const s=tx.objectStore('photos'),k=key(uid,id);const r=operation==='get'?s.get(k):operation==='put'?s.put(blob,k):s.delete(k);r.onsuccess=()=>done(operation==='put'?id:r.result);});same(token);return result;}
  function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===value&&value<=date();}
  function validateHabits(data){if(!data||!validDate(data.day)||!Array.isArray(data.habits)||typeof data.weeklyGoal!=='string'||data.weeklyGoal.length>1000||!data.history||typeof data.history!=='object'||Array.isArray(data.history))throw Error('Hábitos o fechas anteriores inválidos. No se ha importado nada.');
    const list=items=>{if(!Array.isArray(items)||items.some(h=>!h||!['string','number'].includes(typeof h.id)||typeof h.name!=='string'||!h.name.trim()||typeof h.done!=='boolean'))throw Error('Lista de hábitos anterior inválida.');const ids=items.map(h=>typeof h.id+':'+h.id);if(new Set(ids).size!==ids.length)throw Error('Hay identificadores de hábitos repetidos.');};list(data.habits);
    for(const [day,value] of Object.entries(data.history)){if(!validDate(day)||!value)throw Error('Historial anterior inválido.');list(value.habits);}return data;}
  async function legacy(){const habitsRaw=localStorage.getItem('mi-panel-habitos-v1'),privateRaw=localStorage.getItem('mi-progreso-perfil-v1');if(!habitsRaw&&!privateRaw)return null;
    const data=habitsRaw?validateHabits(JSON.parse(habitsRaw)):empty();const profile=privateRaw?JSON.parse(privateRaw):null;
    if(profile){const limits={alias:60,avatar:8,bio:300,city:80,occupation:120,interests:200,project:120,learning:500,goal:300};if(profile.version!==1||profile.visibility!=='local'||!profile.fields||!Array.isArray(profile.links)||profile.links.length>5)throw Error('Perfil anterior inválido.');for(const [field,max] of Object.entries(limits)){const v=profile.fields[field]??(field==='occupation'?'':undefined);if(typeof v!=='string'||v.length>max)throw Error('Campo de perfil anterior inválido.');}for(const link of profile.links){const url=new URL(link);if(url.protocol!=='https:'||url.username||url.password)throw Error('Enlace anterior inválido.');}}
    let blob=null;if(profile?.photoId){if(typeof profile.photoId!=='string')throw Error('Referencia de foto inválida.');blob=await new Promise((resolve,reject)=>{const r=indexedDB.open('mi-progreso-fotos-v1');r.onupgradeneeded=()=>{r.transaction.abort();reject(Error('No se encuentra la base de fotografías anterior.'));};r.onerror=()=>reject(Error('No se pudo leer la foto anterior.'));r.onsuccess=()=>{const db=r.result;try{const tx=db.transaction('photos','readonly'),q=tx.objectStore('photos').get(profile.photoId);q.onsuccess=()=>{if(!q.result)reject(Error('Falta la fotografía anterior.'));else resolve(q.result);};q.onerror=()=>reject(Error('No se pudo leer la foto.'));tx.oncomplete=()=>db.close();}catch(e){db.close();reject(e);}};});if(!(blob instanceof Blob)||blob.size>512*1024)throw Error('Fotografía anterior inválida.');}
    const photoBytes=blob?Array.from(new Uint8Array(await blob.arrayBuffer())):null;
    const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({habitsRaw,privateRaw,photoBytes}))))).map(v=>v.toString(16).padStart(2,'0')).join('');
    return {data,profile,blob,fingerprint,habitsRaw,privateRaw};
  }
  // Solo lectura: cruza la huella de origen con el registro y los datos de esta cuenta.
  async function legacyImportStatus(snapshot){
    const uid=owner,token=epoch;if(!uid)throw Error('Inicia sesión para revisar la importación.');
    if(!snapshot || !/^[a-f0-9]{64}$/.test(snapshot.fingerprint))throw Error('Origen de importación inválido.');
    const result=await transaction(['records','imports'],'readonly',(tx,done)=>{
      const receipt=tx.objectStore('imports').get(snapshot.fingerprint),habits=tx.objectStore('records').get(key(uid,'habits'));
      let count=0;const finish=()=>{if(++count!==2)return;same(token);
        if(receipt.result && receipt.result.owner!==uid){done({status:'other'});return;}
        const hasData=!!habits.result?.importedLegacyHashes?.includes(snapshot.fingerprint),hasReceipt=receipt.result?.owner===uid;
        done({status:hasData?'completed':hasReceipt?'recorded':'pending',owner:uid,hasData,hasReceipt});
      };receipt.onsuccess=habits.onsuccess=finish;
    });same(token);return result;
  }
  async function importLegacy(snapshot,confirmed){if(!confirmed)throw Error('Confirma explícitamente la importación.');const uid=owner,token=epoch;if(!uid)throw Error('Inicia sesión antes de importar.');const fresh=await legacy();same(token);if(!fresh||fresh.fingerprint!==snapshot.fingerprint)throw Error('Los datos anteriores cambiaron. Revisa de nuevo el resumen.');
    const stamp=new Date().toISOString(),mapping=new Map();const mapId=id=>{const k=typeof id+':'+id;if(!mapping.has(k))mapping.set(k,crypto.randomUUID());return mapping.get(k);};const imported=structuredClone(fresh.data);imported.habits=imported.habits.map(h=>({...h,id:mapId(h.id)}));for(const record of Object.values(imported.history))record.habits=record.habits.map(h=>({...h,id:mapId(h.id)}));
    const result=await transaction(stores,'readwrite',(tx,done)=>{const records=tx.objectStore('records'),ledger=tx.objectStore('imports');const check=ledger.get(fresh.fingerprint);check.onsuccess=()=>{if(token!==epoch){tx.abort();return;}if(check.result){done(check.result.owner===uid?'already':'other');return;}
      const h=records.get(key(uid,'habits')),pr=records.get(key(uid,'profile'));let count=0;const finish=()=>{if(++count!==2)return;try{same(token);const current=h.result;if(current?.importedLegacyHashes?.includes(fresh.fingerprint)){ledger.put({owner:uid,at:stamp},fresh.fingerprint);done('already');return;}let next=imported;if(current){next=structuredClone(current);next.habits.push(...imported.habits.map(v=>({...v,done:current.day===imported.day?v.done:false})));for(const [day,record] of Object.entries(imported.history))if(!Object.hasOwn(next.history,day))next.history[day]=record;if(!next.weeklyGoal)next.weeklyGoal=imported.weeklyGoal;}
      next.importedLegacyHashes=[...new Set([...(next.importedLegacyHashes||[]),fresh.fingerprint])];records.put(next,key(uid,'habits'));const syncRequest=records.get(key(uid,'sync'));syncRequest.onsuccess=()=>{const meta=syncRequest.result??{...newSync(),existing:true};meta.dirty=true;meta.existing=true;records.put(meta,key(uid,'sync'));};if(fresh.blob)tx.objectStore('photos').put(fresh.blob,key(uid,'archive:'+fresh.fingerprint));
      records.put({habitsRaw:fresh.habitsRaw,privateRaw:fresh.privateRaw,photoArchiveId:fresh.blob?'archive:'+fresh.fingerprint:null,importedAt:stamp},key(uid,'archive:'+fresh.fingerprint));
      if(!pr.result&&fresh.profile){const profile=structuredClone(fresh.profile);if(fresh.blob){profile.photoId=crypto.randomUUID();tx.objectStore('photos').put(fresh.blob,key(uid,profile.photoId));}records.put(JSON.stringify(profile),key(uid,'profile'));}
      // Si ya hay perfil, conservar también la foto importada como archivo, sin reemplazarlo.
      if(pr.result&&fresh.blob)tx.objectStore('photos').put(fresh.blob,key(uid,'archive:'+fresh.fingerprint));
      ledger.put({owner:uid,at:stamp},fresh.fingerprint);done('imported');}catch{tx.abort();}};h.onsuccess=finish;pr.onsuccess=finish;};});same(token);if(result==='other')throw Error('Estos datos ya se incorporaron a otra cuenta. No se copiarán.');if(result==='imported'){const importedProfile=await read(uid,'profile');same(token);profileRaw=importedProfile;notify('mpd-imported');}return result;
  }
  async function remember(uid){await transaction(['records'],'readwrite',tx=>tx.objectStore('records').put(uid?{uid,validatedAt:Date.now()}:null,'__active'));}
  async function restoreOffline(){const marker=await transaction(['records'],'readonly',(tx,done)=>{const r=tx.objectStore('records').get('__active');r.onsuccess=()=>done(r.result);});if(!marker||await blocked(marker.uid)||Date.now()<marker.validatedAt||Date.now()-marker.validatedAt>7*86400000)return false;await activate(marker.uid);return true;}
  async function blocked(uid){return transaction(['records'],'readonly',(tx,done)=>{const r=tx.objectStore('records').get('__blocked');r.onsuccess=()=>done(r.result===uid);});}
  async function allowLogin(){await transaction(['records'],'readwrite',tx=>tx.objectStore('records').put(null,'__blocked'));}
  async function logout(){const uid=owner;await activate(null);await remember(null);if(uid)await transaction(['records'],'readwrite',tx=>tx.objectStore('records').put(uid,'__blocked'));}
  window.MPDUserStorage={legacyImportStatus,flush,sync,blocked,allowLogin,remember,restoreOffline,logout,activate,habits,photo,legacy,importLegacy,validateHabits,owner:()=>owner,epoch:()=>epoch,readProfile:()=>profileRaw,writeProfile,readArchive:async()=>{if(!owner)throw Error('Inicia sesión.');const uid=owner,token=epoch;const result=await transaction(['records'],'readonly',(tx,done)=>{const r=tx.objectStore('records').openCursor(),out=[];r.onsuccess=()=>{const c=r.result;if(!c){done(out);return;}if(String(c.key).startsWith(key(uid,'archive:')))out.push(c.value);c.continue();};});same(token);return result;}};
})();
