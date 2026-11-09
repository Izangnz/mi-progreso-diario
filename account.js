/* Cuenta opcional. Nunca lee ni escribe los datos de hábitos. */
(async () => {
  const $ = id => document.getElementById(id);
  const status = message => { $('cloud-accountStatus').textContent = message; $('cloud-authStatus').textContent = message; $('cloud-editorStatus').textContent = message; };
  let client, user, recovery = false, revision = 0, sessionSequence=0, authTimedOut=window.MPDWelcome?.state()==='error';
  const storage=window.MPDUserStorage;
  window.addEventListener('mpd-auth-timeout',()=>{
    authTimedOut=true;sessionSequence++;storage.activate(null).catch(()=>{});
  });
  function authFailure(error){
    if(error?.status===401 || error?.status===403)window.MPDWelcome?.session(null);
    else window.MPDWelcome?.fail();
  }
  async function bindSession(session, token=++sessionSequence){
    if(token!==sessionSequence)return false;
    await storage.activate(null);
    if(!session?.user){await storage.remember(null);return token===sessionSequence;}
    const isBlocked=await storage.blocked(session.user.id);
    if(token!==sessionSequence)return false;
    if(isBlocked){window.MPDWelcome?.session(null);status('Sesión cerrada localmente. Inicia sesión de nuevo para acceder a tus datos.');return false;}
    const {data,error}=await client.auth.getUser();
    if(token!==sessionSequence)return false;
    if(error?.status>=400 && error?.status<500)await storage.remember(null);
    if(error || data?.user?.id!==session.user.id){if(error)throw error;throw {status:401};}
    await storage.remember(data.user.id);
    if(token!==sessionSequence)return false;
    await storage.activate(data.user.id);return token===sessionSequence;
  }
  const callback = new URL('mi_progreso_diario.html', location.href).href;
  $('cloud-openSettings').addEventListener('click', () => showView('settings'));
  $('cloud-backSettings').addEventListener('click', () => showView('perfil'));
  $('profile-alias').addEventListener('input', () => { $('cloud-displayName').value = $('profile-alias').value.trim(); });
  let authMode = 'signin', busy = false;
  const dialog = $('cloud-authDialog');
  function setMode(mode) {
    authMode = mode;
    const signup = mode === 'signup';
    $('cloud-authTitle').textContent = signup ? 'Empieza tu camino' : 'Qué bueno verte';
    $('cloud-authIntro').textContent = signup ? 'Crea tu cuenta y avanza a tu ritmo.' : 'Un pequeño paso hoy. Tu progreso continúa.';
    $('cloud-authSubmit').textContent = signup ? 'Crear cuenta' : 'Iniciar sesión';
    $('cloud-switchPrompt').textContent = signup ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
    $('cloud-switchAuth').textContent = signup ? 'Inicia sesión' : 'Regístrate';
    $('cloud-password').autocomplete = signup ? 'new-password' : 'current-password';
    $('cloud-password').minLength = signup ? 8 : 1;
    $('cloud-password').value = '';
    $('cloud-forgot').hidden = signup;
    $('cloud-authStatus').textContent = client ? '' : 'Para acceder a tu cuenta necesitas conexión. Tus hábitos anteriores siguen disponibles.';
  }
  function openAuth() {
    setMode('signin');
    if (!dialog.open) dialog.showModal();
    $('cloud-email').focus();
  }
  function closeAuth() {
    dialog.close();
    $('cloud-password').value = ''; $('cloud-newPassword').value = '';
    if (typeof showView === 'function') showView('perfil');
    $('cloud-openAuth').focus();
  }
  $('cloud-openAuth').addEventListener('click', openAuth);
  $('welcome-signin').addEventListener('click',openAuth);
  $('welcome-signup').addEventListener('click',()=>{openAuth();setMode('signup');});

  $('cloud-closeAuth').addEventListener('click', closeAuth);
  $('cloud-backAuth').addEventListener('click', closeAuth);
  $('cloud-switchAuth').addEventListener('click', () => {if (!busy) setMode(authMode === 'signin' ? 'signup' : 'signin');});
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeAuth(); });
  const aliasPattern = /^[a-z0-9_]{3,30}$/;
  let publicAlias = new URL(location.href).searchParams.get('perfil');
  let privacyLoaded = false, privacyLoading = null, privacySaving = false, savedVisibility = false;
  function privacyStatus(message) { $('cloud-privacyStatus').textContent = message; }
  function paintPrivacy(value) {
    $('cloud-publishProfile').checked = value;
    $('cloud-visibilityPublic').checked = value;
    $('cloud-visibilityPrivate').checked = !value;
    $('cloud-privacyTrack').setAttribute('data-public', String(value));
    $('cloud-privacyHelp').textContent = value ? 'Pública: otros usuarios pueden encontrarte y consultar tu alias y nombre públicos. Tu foto, hábitos y demás datos locales no se publican.' : 'Privada: tu perfil no aparece en las búsquedas públicas.';
  }
  for (const id of ['cloud-visibilityPublic','cloud-visibilityPrivate']) $(id).addEventListener('change', () => {
    paintPrivacy($('cloud-visibilityPublic').checked);
    privacyStatus('Cambio sin guardar. Pulsa Guardar cambios para confirmarlo.');
  });
  async function loadPrivacy() {
    if (privacySaving) return;
    privacyLoaded = false; $('cloud-privacy').disabled = true;
    if (!client || !user) {paintPrivacy(false);privacyStatus('Inicia sesión para gestionar tu visibilidad.');return;}
    const owner = user.id, accountEpoch=storage.epoch();
    privacyStatus('Consultando visibilidad en Supabase…');
    try {
      const {data,error} = await client.from('mpd_profiles').select('alias,display_name,is_public').eq('user_id',owner).maybeSingle();
      if (owner !== user?.id || accountEpoch!==storage.epoch()) return;
      if (error) throw error;
      savedVisibility = data?.is_public === true;paintPrivacy(savedVisibility);
      if (data) { $('cloud-profileAlias').value=data.alias; $('cloud-displayName').value=data.display_name || ''; }
      privacyLoaded = true; $('cloud-privacy').disabled = false;
      privacyStatus(data ? 'Visibilidad actual confirmada con Supabase.' : 'Perfil nuevo: Privada por defecto. Elige un alias público antes de guardarlo.');
    } catch {if(accountEpoch!==storage.epoch())return;privacyStatus('No se pudo consultar tu privacidad. No se cambiará. Vuelve a abrir Editar perfil con conexión.');}
  }
  $('profileEdit').addEventListener('click', () => {privacyLoading=loadPrivacy();});
  $('profileCancel').addEventListener('click', () => {if (!privacySaving) {paintPrivacy(savedVisibility);privacyStatus('Cambios de visibilidad descartados.');}});
  async function saveCloudProfile() {
    const accountEpoch=storage.epoch(), owner=user?.id;
    if (!user) return false;
    if (privacySaving) throw Error('Ya se está guardando la privacidad.');
    if (privacyLoading) await privacyLoading;
    if(accountEpoch!==storage.epoch() || owner!==user?.id)return false;
    if (privacySaving) throw Error('Ya se está guardando la privacidad.');
    if (!privacyLoaded) throw Error('No se ha podido verificar la privacidad actual. Vuelve a abrir el editor con conexión.');
    const alias=$('cloud-profileAlias').value.trim().toLowerCase();
    if (!aliasPattern.test(alias)) throw Error('Escribe un alias público de 3 a 30 letras minúsculas, números o guion bajo en el apartado Perfil público opcional.');
    privacySaving=true;$('cloud-privacy').disabled=true;
    privacyStatus('Guardando visibilidad…');
    const profile={user_id:user.id,alias,display_name:$('profile-alias').value.trim() || $('cloud-displayName').value.trim() || null,is_public:$('cloud-publishProfile').checked};
    try {
      const {data,error}=await client.from('mpd_profiles').upsert(profile,{onConflict:'user_id'}).select('alias,display_name,is_public').single();
      if(accountEpoch!==storage.epoch() || owner!==user?.id)return false;
      if (error) throw Error(error.code==='23505' ? 'Ese alias ya está ocupado. Elige otro.' : 'Supabase rechazó el guardado. Comprueba tu conexión y vuelve a intentarlo.');
      if (!data || data.is_public !== profile.is_public) throw Error('Supabase no confirmó la visibilidad. Vuelve a comprobarla antes de reintentar.');
      savedVisibility=data.is_public;paintPrivacy(savedVisibility);showLink(data);
      $('cloud-profileSummary').textContent='@'+data.alias+(savedVisibility?' · Público':' · Privado');
      privacyStatus(savedVisibility?'Guardado en Supabase: Pública.':'Guardado en Supabase: Privada.');
      return true;
    } catch(error) {if(accountEpoch!==storage.epoch())return false;privacyStatus('No se ha confirmado el cambio. '+error.message);throw error;}
    finally {if(accountEpoch===storage.epoch()){privacySaving=false;$('cloud-privacy').disabled=!privacyLoaded || !user;}}
  }
  window.MPDCloudPrivacy={save:saveCloudProfile,isSaving:()=>privacySaving};
  window.addEventListener('mpd-owner-lock',()=>{user=null;revision++;$('cloud-openAuth').hidden=false;$('cloud-signout').hidden=true;$('cloud-credentials').hidden=false;privacyLoaded=false;privacySaving=false;privacyLoading=null;paintPrivacy(false);$('cloud-privacy').disabled=true;clearProfile();$('cloud-profileForm').hidden=true;$('cloud-profileSummary').textContent='';$('cloud-sessionLabel').textContent='Comprobando sesión…';$('cloud-displayName').value='';$('cloud-profileAlias').value='';});
  function clearProfile() {
    $('cloud-profileForm').reset(); $('cloud-publicLink').hidden = true;
    $('cloud-publicLink').removeAttribute('href');
  }
  async function refresh(session) {
    const current = ++revision;
    const previousUser = user?.id;
    user = session?.user || null;
    if (previousUser !== user?.id) {privacyLoaded=false;savedVisibility=false;paintPrivacy(false);$('cloud-privacy').disabled=true;}
    if (previousUser === user?.id && user && !$('profileEditor').hidden && privacyLoaded) return;
    clearProfile();
    $('cloud-credentials').hidden = !!user;
    $('cloud-signout').hidden = !user;
    $('cloud-openAuth').hidden = !!user && !recovery;
    if (user && recovery) {
      if (typeof showView === 'function') showView('perfil');
      if (!dialog.open) dialog.showModal();
      $('cloud-authTitle').textContent = 'Nueva contraseña';
      $('cloud-authIntro').textContent = 'Elige una contraseña para volver a tu cuenta.';
    } else if (user && dialog.open) closeAuth();
    $('cloud-profileForm').hidden = !user || recovery;
    $('cloud-editorGuest').hidden = !!user;
    $('cloud-profileSummary').textContent = user ? 'Todavía no has guardado un alias público.' : 'Sin alias público vinculado.';
    $('cloud-recoveryForm').hidden = !user || !recovery;
    window.MPDWelcome?.session(user);
    $('cloud-sessionLabel').textContent = user ? 'Sesión iniciada' : 'Sin cuenta: puedes seguir usando tus hábitos.';
    if (!user || recovery) return;
    const {data, error} = await client.from('mpd_profiles').select('alias,display_name,is_public').eq('user_id', user.id).maybeSingle();
    if (current !== revision) return;
    if (error) { status('No se pudo cargar el perfil. Comprueba la conexión y la migración.'); return; }
    if (data) {
      $('cloud-profileAlias').value = data.alias;
      $('cloud-displayName').value = data.display_name || '';
      savedVisibility=data.is_public;paintPrivacy(savedVisibility);
      showLink(data);
      $('cloud-profileSummary').textContent = '@' + data.alias + (data.is_public ? ' · Público' : ' · Privado');
    }
  }
  function showLink(profile) {
    const link = $('cloud-publicLink');
    link.hidden = !profile.is_public;
    if (profile.is_public) {
      const url = new URL(callback); url.searchParams.set('perfil', profile.alias);
      link.href = url.href; link.textContent = 'Ver perfil público: @' + profile.alias;
    } else link.removeAttribute('href');
  }
  async function perform(task) {
    if (busy || !client) return;
    busy = true;
    const buttons = [...$('cloud-profileForm').querySelectorAll('button'), ...$('cloud-account').querySelectorAll('button'), ...dialog.querySelectorAll('button')].filter(button => !['cloud-closeAuth','cloud-backAuth'].includes(button.id));
    dialog.setAttribute('aria-busy','true');
    const label = $('cloud-authSubmit').textContent;
    $('cloud-authSubmit').textContent = 'Un momento…';
    buttons.forEach(button => {button.disabled = true;});
    try { await task(); } catch(error) { if(window.MPDWelcome?.state()==='checking')authFailure(error);status('No se pudo completar la operación. Comprueba tu conexión e inténtalo de nuevo.'); }
    finally { busy = false; dialog.setAttribute('aria-busy','false'); $('cloud-authSubmit').textContent = label; buttons.forEach(button => {button.disabled = !client;}); }
  }
  function report(error, success) {
    if (!error) {status(success); return true;}
    status(error.code === '23505' ? 'Ese alias ya está ocupado. Elige otro.' :
      error.code === 'invalid_credentials' ? 'Email o contraseña incorrectos.' :
      error.code === 'email_not_confirmed' ? 'Confirma tu email antes de entrar.' :
      error.code === 'over_email_send_rate_limit' || error.status === 429 ? 'Demasiados intentos. Espera unos minutos antes de volver a probar.' :
      error.code === 'weak_password' ? 'Usa una contraseña de al menos 8 caracteres.' :
      'No se pudo completar la operación. Revisa los datos y tu conexión.');
    return false;
  }
  $('cloud-credentials').addEventListener('submit', event => {
    event.preventDefault();
    if(!client){window.MPDWelcome?.fail();status('Cuenta no disponible. Comprueba la conexión y reintenta.');return;}
    authTimedOut=false;window.MPDWelcome?.checking();
    perform(async () => {
      const email = $('cloud-email').value.trim(), password = $('cloud-password').value;
      const signup = authMode === 'signup';
      const result = signup ? await client.auth.signUp({email,password,options:{emailRedirectTo:callback}}) :
        await client.auth.signInWithPassword({email,password});
      $('cloud-password').value = '';
      if(!result.error && result.data?.session){await storage.allowLogin();if(await bindSession(result.data.session))await refresh(result.data.session);}
      if(result.error || !result.data?.session)window.MPDWelcome?.session(null);
      report(result.error, signup ? 'Si el registro requiere confirmación, revisa tu email y abre el enlace. Si ya tienes cuenta, inicia sesión.' : 'Sesión iniciada.');
    });
  });
  $('cloud-forgot').addEventListener('click', () => perform(async () => {
    if (!$('cloud-email').reportValidity()) return;
    const {error} = await client.auth.resetPasswordForEmail($('cloud-email').value.trim(), {redirectTo:callback});
    report(error, 'Si existe una cuenta para ese email, recibirás un enlace de recuperación.');
  }));
  $('cloud-signout').addEventListener('click', async () => {
    ++sessionSequence;
    user=null;recovery=false;
    const closing=storage.logout(); // Oculta el propietario de forma síncrona.
    try {await closing;} catch {status('Datos ocultos. No se pudo confirmar el cierre local; vuelve a intentarlo.');return;}
    window.MPDWelcome?.session(null);
    if(!client){$('cloud-signout').hidden=true;status('Sesión local cerrada. Datos conservados y ocultos.');return;}
    perform(async()=>{const {error}=await client.auth.signOut({scope:'local'});
      if(report(error,'Sesión cerrada. Tus datos se conservan en este dispositivo.'))await refresh(null);
    });
  });
  $('cloud-recoveryForm').addEventListener('submit', event => {
    event.preventDefault(); perform(async () => {
      const {error} = await client.auth.updateUser({password:$('cloud-newPassword').value});
      if (report(error, 'Contraseña actualizada.')) {
        $('cloud-newPassword').value = ''; recovery = false;
        await refresh((await client.auth.getSession()).data.session);
      }
    });
  });
  $('cloud-profileForm').addEventListener('submit', event => {
    event.preventDefault(); perform(async () => {
      if (!user) return;
      try {await saveCloudProfile();status($('cloud-privacyStatus').textContent);} catch(error) {status(error.message);}
    });
  });
  async function loadPublic() {
    if (client && publicAlias) await window.MPDPublicPeople.open(publicAlias);
  }
  try {
    if(authTimedOut)return;
    const config = window.MPD_SUPABASE;
    if (!config?.url || !config?.publishableKey || config.url.includes('TU-PROYECTO')) throw Error('config');
    const url = new URL(config.url);
    if (url.protocol !== 'https:' && !(['localhost','127.0.0.1'].includes(url.hostname) && url.protocol === 'http:')) throw Error('config');
    if (!config.publishableKey.startsWith('sb_publishable_')) throw Error('config');
    // El SDK en caché no debe invalidar el marcador offline sin poder validar online.
    if(navigator.onLine===false)throw Error('offline');
    const {createClient} = await import('https://esm.sh/@supabase/supabase-js@2.49.1');
    if(authTimedOut)return;
    recovery = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
    client = createClient(config.url, config.publishableKey, {auth:{storageKey:'mpd-auth-v1',flowType:'implicit',detectSessionInUrl:true}});
    window.MPDPublicPeople.connect(client);
    window.MPDHabitSync.connect(client);
    client.auth.onAuthStateChange((event, session) => {
      if(authTimedOut)return;
      if (event === 'PASSWORD_RECOVERY') recovery = true;
      if (event === 'SIGNED_OUT') recovery = false;
      // No esperar llamadas de Auth dentro del callback del SDK.
      const token=++sessionSequence;
      if(event==='TOKEN_REFRESHED' && session?.user?.id===storage.owner()){
        const accountEpoch=storage.epoch();
        setTimeout(async()=>{try{
          const result=await client.auth.getUser();
          if(token!==sessionSequence || accountEpoch!==storage.epoch())return;
          if(result.error && result.error.status!==401 && result.error.status!==403){status('No se pudo renovar la validación online. Tus cambios siguen en este dispositivo.');return;}
          if(result.error || result.data?.user?.id!==storage.owner()){
            await storage.activate(null);await storage.remember(null);authFailure(result.error||{status:401});return;
          }
          await storage.remember(result.data.user.id);
        }catch{if(token===sessionSequence)status('No se pudo renovar la validación online. Los cambios siguen guardados en este dispositivo.');}},0);
        return;
      }
      storage.activate(null).catch(()=>{});
      setTimeout(async()=>{try{if(await bindSession(session,token))await refresh(session);}catch(error){if(token===sessionSequence){authFailure(error);status('No se ha validado la sesión. Datos personales ocultos.');}}},0);
    });
    const initialSequence=sessionSequence;
    const {data,error} = await client.auth.getSession();
    if (error) throw error;
    if(initialSequence===sessionSequence && await bindSession(data.session))await refresh(data.session);
    [...$('cloud-profileForm').querySelectorAll('button'), ...$('cloud-account').querySelectorAll('button'), ...dialog.querySelectorAll('button')].forEach(button => {button.disabled=false;});
    status('Cuenta validada. Tus hábitos permanecen en este dispositivo.');
    if (location.hash) history.replaceState(null,'',location.pathname+location.search);
    await loadPublic().catch(()=>status('No se pudo consultar el perfil público. Comprueba tu conexión.'));

  } catch (error) {
    if(authTimedOut)return;
    client = null;
    [...$('cloud-profileForm').querySelectorAll('button'), ...$('cloud-account').querySelectorAll('button'), ...dialog.querySelectorAll('button')].filter(button => !['cloud-openAuth','cloud-closeAuth','cloud-backAuth','cloud-switchAuth'].includes(button.id)).forEach(button => {button.disabled=true;});
    const restored=navigator.onLine===false && await storage.restoreOffline().catch(()=>false);
    if(authTimedOut){await storage.activate(null).catch(()=>{});return;}
    if(!restored)await storage.activate(null).catch(()=>{});
    $('cloud-signout').hidden=!restored;$('cloud-signout').disabled=!restored;
    status(restored?'Acceso local offline previamente validado (máximo 7 días). Sin sincronización Cloud.':'Sin cuenta validada disponible. Puedes explorar y probar hábitos temporales.');
    if(restored)window.MPDWelcome?.session(storage.owner());
    else if(navigator.onLine===false)window.MPDWelcome?.session(null);
    else authFailure(error);
    if (publicAlias) {$('cloud-publicProfile').hidden=false;$('cloud-publicProfileText').textContent='Para consultar un perfil necesitas conexión y configurar Supabase.';}
  }
})();
