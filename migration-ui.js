/* Importación voluntaria: las claves antiguas nunca se escriben. */
(() => {
 const $=id=>document.getElementById(id),storage=window.MPDUserStorage;let snapshot=null,busy=false,token=0;
 async function scan(){const current=++token;snapshot=null;$('migration-panel').hidden=true;$('migration-consent').checked=false;$('migration-import').disabled=true;if(!storage.owner())return;
 try{const data=await storage.legacy();if(current!==token||!storage.owner())return;if(!data)return;snapshot=data;$('migration-panel').hidden=false;$('migration-summary').textContent=`${data.data.habits.length} hábitos, ${Object.keys(data.data.history).length} días de historial, objetivo ${data.data.weeklyGoal?'incluido':'vacío'}, perfil ${data.profile?'incluido':'ausente'}, fotografía ${data.blob?'incluida':'ausente'}. Los datos existentes no se reemplazan. Los conflictos históricos se conservan además en un archivo exportable.`;}
 catch(error){if(current!==token)return;$('migration-panel').hidden=false;$('migration-summary').textContent='Importación bloqueada: '+error.message;$('migration-result').textContent='Los originales permanecen intactos. Puedes exportar un respaldo sin importarlos.';}
 }
 function download(value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='progressmate-respaldo-local.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function blobData(blob){if(!blob)return null;return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo exportar la fotografía.'));r.readAsDataURL(blob);});}
 $('migration-consent').addEventListener('change',()=>{$('migration-import').disabled=busy||!snapshot||!$('migration-consent').checked;});
 $('migration-backup').addEventListener('click',async()=>{
  const epoch=storage.epoch(),current=token,data=snapshot;
  try{
   const backup=data?{version:1,habitsRaw:data.habitsRaw,privateRaw:data.privateRaw,photo:await blobData(data.blob)}:{habitsRaw:localStorage.getItem('mi-panel-habitos-v1'),privateRaw:localStorage.getItem('mi-progreso-perfil-v1'),warning:'Datos inválidos sin importar; fotografía no incluida en este respaldo parcial.'};
   if(epoch!==storage.epoch()||current!==token)return;download(backup);
  }catch(e){if(epoch===storage.epoch())$('migration-result').textContent=e.message;}
 });
 $('migration-import').addEventListener('click',async()=>{if(busy||!snapshot||!$('migration-consent').checked)return;busy=true;$('migration-import').disabled=true;const epoch=storage.epoch();try{const result=await storage.importLegacy(snapshot,true);if(epoch!==storage.epoch())return;$('migration-result').textContent=result==='already'?'Estos datos ya estaban importados; no se han duplicado.':'Importación completada en este dispositivo. Sin sincronización entre dispositivos; los originales siguen intactos.';}catch(e){if(epoch===storage.epoch())$('migration-result').textContent=e.message;}finally{busy=false;$('migration-consent').checked=false;$('migration-import').disabled=true;}});
 $('migration-archives').addEventListener('click',async()=>{try{const epoch=storage.epoch();const archives=await storage.readArchive();for(const archive of archives)if(archive.photoArchiveId)archive.photo=await blobData(await storage.photo('get',archive.photoArchiveId));if(epoch!==storage.epoch())throw Error('La cuenta cambió; exportación cancelada.');download(archives);}catch(e){$('migration-result').textContent=e.message;}});
 window.addEventListener('mpd-owner-lock',()=>{token++;snapshot=null;$('migration-panel').hidden=true;$('migration-summary').textContent='';$('migration-result').textContent='';});window.addEventListener('mpd-owner-ready',scan);
})();
