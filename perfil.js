/* Perfil privado local v1. No modifica hábitos, aprendizaje ni perfiles DEMO. */
(() => {
  const KEY = 'mi-progreso-perfil-v1';
  const limits = {alias:60,avatar:8,bio:300,city:80,interests:200,project:120,learning:500,goal:300};
  const form = document.getElementById('profileForm');
  const status = document.getElementById('profileStatus');
  const preview = document.getElementById('profilePreview');
  const inputs = Object.fromEntries([...Object.keys(limits),'links'].map(key => [key,document.getElementById('profile-'+key)]));
  let baseline = null, blocked = false, dirty = false;
  const clean = (value,max) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim().slice(0,max);
  function validLink(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) throw Error('Usa enlaces HTTPS completos, sin credenciales.');
    return url.href;
  }
  function readForm() {
    const data = {version:1,visibility:'local',fields:{},links:[]};
    for (const [key,max] of Object.entries(limits)) data.fields[key] = clean(inputs[key].value,max);
    const lines = inputs.links.value.split('\n').map(s=>s.trim()).filter(Boolean);
    if(lines.length>5) throw Error('Puedes guardar hasta 5 enlaces.');
    data.links = [...new Set(lines.map(validLink))];
    return data;
  }
  function node(tag,text) { const el=document.createElement(tag);el.textContent=text;return el; }
  function render(data) {
    preview.replaceChildren();
    const fields=data.fields;
    const avatar=node('div',fields.avatar || fields.alias.slice(0,2).toLocaleUpperCase('es') || 'TÚ');avatar.className='community-avatar';
    preview.append(avatar,node('h3',fields.alias || 'Tu próximo capítulo'),node('p',fields.city || 'Ciudad opcional'),node('p',fields.bio || 'Cuenta qué te mueve y qué quieres construir.'));
    for(const [key,label] of [['interests','Intereses y habilidades'],['project','Proyecto actual'],['learning','Construyendo y aprendiendo'],['goal','Mi objetivo']]) {
      if(fields[key]) preview.append(node('h4',label),node('p',fields[key]));
    }
    data.links.forEach(url=>{const a=node('a',new URL(url).hostname+' ↗ (nueva pestaña)');a.href=url;a.target='_blank';a.rel='noopener noreferrer';preview.append(a);});
  }
  function previewDraft() {
    dirty=true;
    try {render(readForm());status.textContent='Cambios sin guardar. La vista previa es privada.';}
    catch(error) {status.textContent=error.message;}
  }
  try {
    baseline=localStorage.getItem(KEY);
    if(baseline!==null) {
      const data=JSON.parse(baseline);
      if(data.version!==1 || data.visibility!=='local' || !data.fields || !Array.isArray(data.links) || data.links.length>5) throw Error('Formato de perfil no compatible.');
      for(const [key,max] of Object.entries(limits)) {
        if(typeof data.fields[key]!=='string' || data.fields[key].length>max) throw Error('Perfil local inválido.');
        inputs[key].value=clean(data.fields[key],max);
      }
      inputs.links.value=data.links.map(validLink).join('\n');
    }
    render(readForm());status.textContent=baseline===null?'Empieza con un alias. Solo se guardará en este navegador.':'Perfil local recuperado.';
  } catch(error) {
    blocked=true;status.textContent='No se pudo leer el perfil local. Se conserva intacto; el guardado está bloqueado. '+error.message;
    document.getElementById('profileSave').disabled=true;
  }
  form.addEventListener('input',previewDraft);
  form.addEventListener('submit',event=>{
    event.preventDefault();if(blocked)return;
    try {
      const data=readForm();if(!data.fields.alias)throw Error('Escribe un nombre visible o alias.');
      if(localStorage.getItem(KEY)!==baseline)throw Error('El perfil cambió en otra ventana. Recarga para recuperar la versión guardada; tu borrador sigue aquí.');
      const raw=JSON.stringify({...data,updatedAt:new Date().toISOString()});
      localStorage.setItem(KEY,raw);baseline=raw;dirty=false;render(data);status.textContent='Perfil guardado en este navegador. No se ha publicado.';
    } catch(error) {dirty=true;status.textContent='No se ha guardado. '+error.message;}
  });
  document.getElementById('profileLearning').addEventListener('click',()=>showView('aprendizaje'));
  document.getElementById('profilePodcasts').addEventListener('click',()=>showView('podcasts'));
  window.MPDProfile={hasUnsavedChanges:()=>dirty};
})();
