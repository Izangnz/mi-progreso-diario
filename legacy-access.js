/* Consulta voluntaria del almacén anterior. Ninguna escritura ni importación. */
(() => {
 const $=id=>document.getElementById(id),storage=window.MPDUserStorage,dialog=$('legacy-dialog');
 let snapshot=null,sequence=0,photoUrl=null;
 function clear(){if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}sequence++;snapshot=null;$('legacy-content').replaceChildren();$('legacy-status').textContent='';if(dialog.open)dialog.close();}
 function paragraph(text){const p=document.createElement('p');p.textContent=text;$('legacy-content').append(p);}
 async function openLegacy(){
  clear();const token=sequence,epoch=storage.epoch();dialog.showModal();$('legacy-status').textContent='Leyendo datos anteriores…';
  try{
   let data;
   try{data=await storage.legacy();}catch{
    // Un perfil/foto incompatible no debe impedir consultar los hábitos conservados.
    const habitsRaw=localStorage.getItem('mi-panel-habitos-v1'),privateRaw=localStorage.getItem('mi-progreso-perfil-v1');
    if(!habitsRaw)throw Error('legacy');
    const habits=JSON.parse(habitsRaw);
    if(!Array.isArray(habits?.habits)||!habits.history||typeof habits.history!=='object')throw Error('legacy');
    data={data:habits,habitsRaw,privateRaw,blob:null,partial:true};
   }
if(token!==sequence||epoch!==storage.epoch())return;snapshot=data;
   if(!data){$('legacy-status').textContent='No hay datos anteriores en este navegador y dirección.';return;}
   $('legacy-status').textContent=`${data.data.habits.length} hábitos · ${Object.keys(data.data.history).length} días de historial`;
   for(const habit of data.data.habits)paragraph((habit.done?'✓ ':'○ ')+habit.name);
   paragraph('Objetivo: '+(data.data.weeklyGoal||'Sin objetivo'));
   const history=document.createElement('details'),summary=document.createElement('summary'),content=document.createElement('pre');summary.textContent='Consultar historial completo';content.textContent=JSON.stringify(data.data.history,null,2);history.append(summary,content);$('legacy-content').append(history);
   if(data.blob){
    photoUrl=URL.createObjectURL(data.blob);const image=document.createElement('img');image.src=photoUrl;image.alt='Fotografía conservada del perfil anterior';image.className='legacy-photo';$('legacy-content').append(image);
    paragraph('Tu fotografía está conservada y se incluirá en el respaldo.');
   }
   if(data.partial)paragraph('Los hábitos se pueden consultar. El perfil o la foto requieren revisión; el respaldo será parcial. Los originales permanecen intactos.');
  }catch{if(token===sequence)$('legacy-status').textContent='No se pudo interpretar el formato anterior. Puedes exportar sus textos originales sin modificarlos. La foto requiere revisar su referencia.';}
 }
 $('welcome-legacy').addEventListener('click',openLegacy);
 $('profile-legacy').addEventListener('click',openLegacy);
 $('legacy-close').addEventListener('click',clear);
 dialog.addEventListener('cancel',event=>{event.preventDefault();clear();});
 $('legacy-export').addEventListener('click',async()=>{
  const token=sequence,epoch=storage.epoch();
  try{
   const data=snapshot;let photo=null;
   if(data?.blob)photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error());reader.readAsDataURL(data.blob);});
   if(token!==sequence||epoch!==storage.epoch())return;
   const backup={version:1,habitsRaw:data?.habitsRaw??localStorage.getItem('mi-panel-habitos-v1'),privateRaw:data?.privateRaw??localStorage.getItem('mi-progreso-perfil-v1'),photo,partial:!data||!!data.partial};
   const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='progressmate-datos-anteriores.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   $('legacy-status').textContent=data&&!data.partial?'Respaldo preparado con los datos y fotografía disponibles.':'Respaldo parcial de textos preparado. La fotografía no está incluida.';
  }catch{if(token===sequence)$('legacy-status').textContent='No se pudo preparar el respaldo. Los datos originales siguen intactos.';}
 });
 window.addEventListener('mpd-owner-lock',clear);
})();
