/* Descubrir: feed vacío y consultas públicas exclusivamente mediante RPC. */
(() => {
  const $ = id => document.getElementById(id);
  function select(name) {
    for (const section of ['feed','people']) {
      $('discover-'+section).hidden = section !== name;
      $('discover-'+section+'-button').setAttribute('aria-pressed',String(section === name));
    }
  }
  for (const section of ['feed','people']) $('discover-'+section+'-button').addEventListener('click',()=>select(section));
  $('cloud-explorePeople').addEventListener('click',()=>select('people'));
  select('feed');
  let client, generation=0, detailGeneration=0, selected=null, lastSearch=0, pending=false;
  const valid = value => /^[a-z0-9_]{3,30}$/.test(value);
  const text = message => {$('cloud-publicProfile').hidden=false;$('cloud-publicProfileText').textContent=message;};
  const node = (tag,value) => {const el=document.createElement(tag);el.textContent=value;return el;};
  const clear = () => $('cloud-publicResults').replaceChildren();
  function people() { selected=null;detailGeneration++;$('cloud-personContent').replaceChildren();showView('comunidad');select('people'); }
  $('cloud-backPerson').addEventListener('click',()=>{people();clear();text('Vuelve a buscar para consultar los perfiles actualizados.');$('cloud-findAlias').focus();});
  function safeRows(data) {
    return (Array.isArray(data)?data:[]).slice(0,20).filter(p=>p && valid(p.alias) && (p.display_name==null || typeof p.display_name==='string')).map(p=>({alias:p.alias,display_name:(p.display_name||'').slice(0,60)}));
  }
  async function open(alias) {
    const token=++detailGeneration;selected=alias;
    showView('public-person');$('cloud-personContent').replaceChildren(node('p','Comprobando disponibilidad…'));
    if (!client || !valid(alias)) { $('cloud-personContent').replaceChildren(node('p','Perfil no disponible.'));return; }
    try {
      const {data,error}=await client.rpc('mpd_public_profile',{requested_alias:alias});
      if(token!==detailGeneration || document.hidden)return;
      const profile=safeRows(data).find(p=>p.alias===alias);
      if(error || !profile) {clear();$('cloud-personContent').replaceChildren(node('p',error?'No se pudo comprobar el perfil. Necesitas conexión.':'Perfil no disponible. Puede haberse retirado.'));return;}
      const avatar=node('div','○');avatar.className='cloud-public-avatar';avatar.setAttribute('aria-label','Sin fotografía pública');
      $('cloud-personContent').replaceChildren(avatar,node('h3',profile.display_name||'@'+profile.alias),node('p','@'+profile.alias),node('p','Biografía pública no disponible.'),node('h4','Publicaciones'),node('p','Todavía no hay publicaciones disponibles.'));
    } catch {if(token===detailGeneration){clear();$('cloud-personContent').replaceChildren(node('p','No se pudo comprobar el perfil. Necesitas conexión.'));}}
  }
  async function search() {
    const query=$('cloud-findAlias').value.trim().toLowerCase();clear();
    if(!valid(query)){generation++;text('Escribe entre 3 y 30 letras, números o guiones bajos (_).');return;}
    if(pending || Date.now()-lastSearch<1500){text('Espera un momento antes de volver a buscar.');return;}
    if(!client){text('Necesitas conexión para buscar perfiles.');return;}
    pending=true;lastSearch=Date.now();const token=++generation;text('Buscando perfiles públicos…');
    $('cloud-findProfile').setAttribute('aria-busy','true');
    try {
      let response=await client.rpc('mpd_search_public_profiles',{search_term:query});let exact=false;
      if(response.error?.code==='PGRST202'){exact=true;response=await client.rpc('mpd_public_profile',{requested_alias:query});}
      if(token!==generation || document.hidden)return;
      if(response.error){text('No se pudo buscar. Comprueba tu conexión e inténtalo más tarde.');return;}
      const rows=safeRows(response.data);
      text((exact?'Búsqueda parcial pendiente de habilitar en Supabase. Resultado por alias exacto. ':'')+(rows.length?rows.length+' coincidencia(s).':'No se encontraron perfiles públicos.'));
      for(const profile of rows){const button=node('button',(profile.display_name?profile.display_name+' · ':'')+'@'+profile.alias+' →');button.type='button';button.className='cloud-person-result';button.addEventListener('click',()=>open(profile.alias));$('cloud-publicResults').append(button);}
    }catch{if(token===generation)text('No se pudo buscar. Comprueba tu conexión.');}
    finally{pending=false;$('cloud-findProfile').setAttribute('aria-busy','false');}
  }
  $('cloud-findProfile').addEventListener('submit',event=>{event.preventDefault();search();});
  $('cloud-findAlias').addEventListener('input',()=>{generation++;clear();});
  document.addEventListener('visibilitychange',()=>{generation++;clear();if(document.hidden){detailGeneration++;$('cloud-personContent').replaceChildren();}else if(selected && !$('public-person').hidden)open(selected);});
  window.addEventListener('offline',()=>{generation++;detailGeneration++;clear();$('cloud-personContent').replaceChildren(node('p','Necesitas conexión para consultar este perfil.'));});
  // Retira datos antiguos antes de revalidar. No se guarda información pública en disco.
  setInterval(()=>{
    if(document.hidden)return;
    if(selected && !$('public-person').hidden)open(selected);
    else if(!$('comunidad').hidden && !$('discover-people').hidden && $('cloud-publicResults').children.length && !pending)search();
  },30000);
  window.MPDPublicPeople={connect:sdk=>{client=sdk;},open};
})();
