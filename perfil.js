/* Perfil privado local. La fotografía se referencia desde IndexedDB. */
(() => {
  const store=window.MPDProfileData.local;
  const KEY=store.key;
  const limits={alias:60,avatar:8,bio:300,city:80,occupation:120,interests:200,project:120,learning:500,goal:300};
  const $=id=>document.getElementById(id);
  const inputs=Object.fromEntries([...Object.keys(limits),'links'].map(key=>[key,$('profile-'+key)]));
  const status=$('profileStatus'),displayStatus=$('profileDisplayStatus');
  let baseline=null,blocked=false,dirty=false,busy=false,processing=false,sequence=0;
  let saved={version:1,visibility:'local',fields:Object.fromEntries(Object.keys(limits).map(key=>[key,''])),links:[],photoId:null};
  let savedPhoto=null,draftPhoto=null,photoChanged=false,urls=[];
  const clean=(value,max)=>String(value??'').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim().slice(0,max);
  function validLink(value) {
    if(typeof value!=='string')throw Error('Enlace inválido.');
    const url=new URL(value);
    if(url.protocol!=='https:' || url.username || url.password || !url.hostname.includes('.'))throw Error('Usa enlaces HTTPS completos, sin credenciales.');
    return url.href;
  }
  function readForm() {
    const data={version:1,visibility:'local',fields:{},links:[],photoId:saved.photoId};
    for(const [key,max] of Object.entries(limits))data.fields[key]=clean(inputs[key].value,max);
    const lines=inputs.links.value.split('\n').map(s=>s.trim()).filter(Boolean);
    if(lines.length>5)throw Error('Puedes guardar hasta 5 enlaces.');
    data.links=[...new Set(lines.map(validLink))];return data;
  }
  function fill(){for(const key of Object.keys(limits))inputs[key].value=saved.fields[key];inputs.links.value=saved.links.join('\n');}
  function node(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
  function avatar(data,blob,parent) {
    if(blob){const img=node('img');const url=URL.createObjectURL(blob);urls.push(url);img.src=url;img.alt='Tu fotografía de perfil privada';img.className='profile-photo';parent.append(img);}
    else {const el=node('div',data.fields.avatar || Array.from(data.fields.alias).slice(0,2).join('').toLocaleUpperCase('es') || 'TÚ');el.className='profile-photo profile-initials';parent.append(el);}
  }
  function clearUrls(){urls.forEach(url=>URL.revokeObjectURL(url));urls=[];}
  function render() {
    clearUrls();const parent=$('profilePreview');parent.replaceChildren();
    avatar(saved,savedPhoto,parent);
    parent.append(node('p','LOCAL · SOLO TÚ'),node('h3',saved.fields.alias || 'Tu historia empieza aquí'));
    if(!saved.fields.alias)parent.append(node('p','Comparte contigo quién eres, qué te mueve y tu próximo objetivo. Pulsa Editar perfil para empezar.'));
    for(const key of ['occupation','city','bio'])if(saved.fields[key])parent.append(node('p',saved.fields[key]));
    for(const [key,label] of [['project','Proyecto actual'],['learning','Construyendo y aprendiendo'],['interests','Intereses y habilidades'],['goal','Mis objetivos']])if(saved.fields[key])parent.append(node('h4',label),node('p',saved.fields[key]));
    saved.links.forEach(url=>{const a=node('a',new URL(url).hostname+' ↗ (nueva pestaña)');a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);});
    // Se conserva una única URL para cada imagen hasta la siguiente actualización.
    const photo=$('profilePhotoPreview');photo.replaceChildren();avatar(saved,photoChanged?draftPhoto:savedPhoto,photo);
  }
  function editor(open){$('profileDisplay').hidden=open;$('profileEditor').hidden=!open;$(open?'profileEditorTitle':'profileEdit').focus();}
  function busyControls(value){busy=value;document.querySelectorAll('#profileForm input, #profileForm textarea, #profileForm button, #cloud-profileForm button').forEach(el=>{el.disabled=value;});$('profileSave').disabled=value||blocked;}
  $('profileEdit').addEventListener('click',()=>{if(!dirty){fill();photoChanged=false;draftPhoto=null;render();}status.textContent=blocked?'No se puede leer el perfil guardado; se conserva intacto.':'Los cambios se guardan solo al pulsar Guardar cambios.';editor(true);});
  $('profileCancel').addEventListener('click',()=>{if(busy)return;sequence++;processing=false;dirty=false;photoChanged=false;draftPhoto=null;$('profilePhoto').value='';fill();render();editor(false);});
  $('profileForm').addEventListener('input',()=>{dirty=true;status.textContent='Cambios sin guardar.';});
  $('profilePhoto').addEventListener('change',async()=>{
    const file=$('profilePhoto').files?.[0];if(!file)return;
    const token=++sequence;processing=true;dirty=true;status.textContent='Preparando fotografía…';
    try {const blob=await window.MPDPhoto.compress(file);if(token!==sequence)return;draftPhoto=blob;photoChanged=true;render();status.textContent='Fotografía lista. Pulsa Guardar cambios para conservarla.';}
    catch(error){if(token===sequence)status.textContent=error.message;}
    finally{if(token===sequence){processing=false;$('profilePhoto').value='';}}
  });
  $('profilePhotoRemove').addEventListener('click',()=>{if(busy)return;sequence++;processing=false;draftPhoto=null;photoChanged=true;dirty=true;$('profilePhoto').value='';render();status.textContent='Fotografía eliminada del borrador. Guarda para confirmar o cancela para recuperarla.';});
  $('profileForm').addEventListener('submit',async event=>{
    event.preventDefault();if(blocked||busy)return;if(processing){status.textContent='Espera a que termine de prepararse la fotografía.';return;}
    let created=null;busyControls(true);
    try {
      const data=readForm();if(!data.fields.alias)throw Error('Escribe un nombre visible o alias.');
      const commit=async()=>{
        if(store.readRaw()!==baseline)throw Error('El perfil cambió en otra ventana. Recarga para recuperarlo; tu borrador sigue aquí.');
        if(photoChanged)data.photoId=draftPhoto ? (created=await window.MPDPhoto.put(draftPhoto)) : null;
        // Segunda lectura tras IndexedDB: no sobrescribir cambios durante la espera.
        if(store.readRaw()!==baseline)throw Error('El perfil cambió en otra ventana; tu borrador sigue aquí.');
        const raw=JSON.stringify({...data,updatedAt:new Date().toISOString()});store.writeRaw(raw);baseline=raw;
      };
      if(navigator.locks?.request)await navigator.locks.request(KEY,commit);else await commit();
      const oldId=saved.photoId;saved=data;if(photoChanged)savedPhoto=draftPhoto;
      dirty=false;photoChanged=false;draftPhoto=null;render();
      let cloudSaved=false;
      try {cloudSaved=await window.MPDCloudPrivacy?.save() || false;}
      catch(error) {dirty=true;status.textContent='Datos locales guardados; privacidad NO confirmada en Supabase. '+error.message;return;}
      editor(false);displayStatus.textContent=cloudSaved ? 'Perfil local guardado. '+document.getElementById('cloud-privacyStatus').textContent : 'Perfil guardado en este dispositivo. No se ha publicado.';
      if(oldId && oldId!==data.photoId)window.MPDPhoto.remove(oldId).catch(()=>{});
    } catch(error){if(created)await window.MPDPhoto.remove(created).catch(()=>{});dirty=true;status.textContent='No se ha guardado. '+error.message;}
    finally{busyControls(false);}
  });
  window.MPDProfile={hasUnsavedChanges:()=>dirty||busy||processing,enter:()=>{editor(false);if(dirty)displayStatus.textContent="Tienes un borrador pendiente. Abre Editar perfil para continuar o cancelar.";}};
  // Leer perfiles 0.12.0 sin migraciones destructivas ni nuevas escrituras.
  const ready=(async()=>{
    $('profileEdit').disabled=true;
    try {
      baseline=store.readRaw();
      if(baseline!==null){const data=JSON.parse(baseline);
        if(data.version!==1 || data.visibility!=='local' || !data.fields || !Array.isArray(data.links) || data.links.length>5 || (data.photoId!=null && (typeof data.photoId!=='string'||data.photoId.length>100)))throw Error('Formato de perfil no compatible.');
        for(const [key,max] of Object.entries(limits)){const value=data.fields[key]??(key==='occupation'?'':undefined);if(typeof value!=='string'||value.length>max)throw Error('Perfil local inválido.');saved.fields[key]=clean(value,max);}
        saved.links=data.links.map(validLink);saved.photoId=data.photoId??null;
        if(saved.photoId){try {savedPhoto=await window.MPDPhoto.get(saved.photoId);if(!savedPhoto)throw Error('No se encuentra la fotografía.');}catch(error){displayStatus.textContent='No se pudo recuperar la foto. Tus datos y su referencia se conservan. Puedes cambiarla desde Editar perfil.';}}
      }
      fill();render();
    }catch(error){blocked=true;displayStatus.textContent='No se pudo leer el perfil local. Se conserva intacto; el guardado está bloqueado. '+error.message;$('profileSave').disabled=true;render();}
    finally{$('profileEdit').disabled=false;}
  })();
  window.MPDProfile.ready=ready;
})();
