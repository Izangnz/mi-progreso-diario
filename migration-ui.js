/* Importación voluntaria en Configuración. Los originales nunca se escriben. */
(() => {
 const $=id=>document.getElementById(id),storage=window.MPDUserStorage;
 let snapshot=null,busy=false,token=0,eligible=false;
 function closeReview(){eligible=false;$('migration-panel').hidden=true;$('migration-consent').checked=false;$('migration-import').disabled=true;$('migration-open').hidden=true;}
 function reset(){token++;snapshot=null;closeReview();$('legacy-settings').hidden=true;$('legacy-tools').open=false;$('migration-notice').hidden=true;$('migration-notice').textContent='';$('migration-summary').textContent='';$('migration-result').textContent='';}
 async function scan(){
  const current=++token,epoch=storage.epoch();snapshot=null;closeReview();$('legacy-settings').hidden=true;$('migration-notice').hidden=true;$('migration-result').textContent='';
  if(!storage.owner())return;
  try{
   const data=await storage.legacy();if(current!==token||epoch!==storage.epoch()||!data)return;
   const imported=await storage.legacyImportStatus(data);if(current!==token||epoch!==storage.epoch())return;
   snapshot=data;$('legacy-settings').hidden=false;
   if(imported.status==='completed')return;
   if(imported.status==='recorded'){$('migration-notice').hidden=false;$('migration-notice').textContent='Hay una importación registrada. Consulta sus copias antes de intentar recuperar datos; no se repetirá automáticamente.';return;}
   $('migration-notice').hidden=false;
   if(imported.status==='other'){$('migration-notice').textContent='Los datos anteriores ya se incorporaron a otra cuenta. Puedes consultar los originales; no se volverán a importar.';return;}
   eligible=true;$('migration-open').hidden=false;$('migration-notice').textContent='Hay datos anteriores pendientes de revisar en este dispositivo.';
   $('migration-summary').textContent=`${data.data.habits.length} hábitos, ${Object.keys(data.data.history).length} días de historial, objetivo ${data.data.weeklyGoal?'incluido':'vacío'}, perfil ${data.profile?'incluido':'ausente'}, fotografía ${data.blob?'incluida':'ausente'}. Los datos existentes no se reemplazan. Los conflictos se conservan en un archivo exportable.`;
  }catch{
   if(current!==token||epoch!==storage.epoch())return;
   $('legacy-settings').hidden=false;$('migration-notice').hidden=false;$('migration-notice').textContent='No se pudo verificar la importación. Puedes consultar y respaldar los originales; no se ha modificado nada.';
  }
 }
 function download(value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='progressmate-respaldo-local.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function blobData(blob){if(!blob)return null;return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo exportar la fotografía.'));r.readAsDataURL(blob);});}
 $('migration-open').addEventListener('click',()=>{if(eligible&&snapshot&&!busy)$('migration-panel').hidden=false;});
 $('migration-consent').addEventListener('change',()=>{$('migration-import').disabled=busy||!eligible||!snapshot||!$('migration-consent').checked;});
 $('migration-backup').addEventListener('click',async()=>{
  const epoch=storage.epoch(),current=token,data=snapshot;
  try{if(!data)return;const backup={version:1,habitsRaw:data.habitsRaw,privateRaw:data.privateRaw,photo:await blobData(data.blob)};if(epoch!==storage.epoch()||current!==token)return;download(backup);}
  catch(e){if(epoch===storage.epoch())$('migration-result').textContent=e.message;}
 });
 $('migration-import').addEventListener('click',async()=>{
  if(busy||!eligible||!snapshot||!$('migration-consent').checked)return;
  busy=true;$('migration-import').disabled=true;const epoch=storage.epoch();
  try{
   const result=await storage.importLegacy(snapshot,true);if(epoch!==storage.epoch())return;
   await scan();if(epoch!==storage.epoch())return;
   $('migration-result').textContent=result==='already'?'Estos datos ya estaban incorporados. No se han duplicado.':'Importación completada en esta cuenta y dispositivo. Los originales se conservan. No se ha enviado ningún hábito a Cloud; la fotografía y el perfil privado siguen locales.';
  }catch(e){if(epoch===storage.epoch())$('migration-result').textContent=e.message;}
  finally{busy=false;if(epoch===storage.epoch()){$('migration-consent').checked=false;$('migration-import').disabled=true;}}
 });
 $('migration-archives').addEventListener('click',async()=>{
  const epoch=storage.epoch();
  try{const archives=await storage.readArchive();for(const archive of archives)if(archive.photoArchiveId)archive.photo=await blobData(await storage.photo('get',archive.photoArchiveId));if(epoch!==storage.epoch())return;download(archives);}
  catch(e){if(epoch===storage.epoch())$('migration-result').textContent=e.message;}
 });
 window.addEventListener('mpd-owner-lock',reset);
 window.addEventListener('mpd-owner-ready',scan);
 window.addEventListener('mpd-imported',scan);
 $('cloud-openSettings').addEventListener('click',scan);
 scan();
})();
