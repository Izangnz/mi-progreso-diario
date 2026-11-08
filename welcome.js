/* Estado de arranque en memoria. Nunca lee/escribe hábitos ni sesiones. */
(() => {
 const $=id=>document.getElementById(id),storage=window.MPDUserStorage;
 let state='checking',guest=false,watchdog;
 function paint(){
  $('auth-boot').hidden=guest||!['checking','error'].includes(state);
  $('welcome-panel').hidden=guest||state!=='anonymous';
  $('application-shell').hidden=!(guest||state==='authenticated');
  $('auth-boot-spinner').hidden=state!=='checking';
  $('auth-boot-actions').hidden=state!=='error';
  $('auth-boot-status').textContent=state==='error'?'No se pudo comprobar la sesión. Puedes reintentar o continuar sin cuenta.':'Comprobando sesión…';
 }
 function cancel(){clearTimeout(watchdog);}
 function fail(){cancel();state='error';paint();}
 function checking(){cancel();guest=false;state='checking';paint();watchdog=setTimeout(()=>{fail();window.dispatchEvent(new Event('mpd-auth-timeout'));},10000);}
 function session(user){cancel();if(user)guest=false;state=user?'authenticated':'anonymous';paint();}
 function enterGuest(){cancel();guest=true;paint();}
 $('welcome-guest').addEventListener('click',enterGuest);
 $('auth-boot-guest').addEventListener('click',enterGuest);
 $('auth-boot-retry').addEventListener('click',()=>location.reload());
 $('auth-boot-legacy').addEventListener('click',()=>$('welcome-legacy').click());
 window.addEventListener('mpd-owner-lock',()=>{if(state!=='error')checking();});
 // Un propietario nulo puede ser solo el bloqueo transitorio previo a validar Auth.
 window.addEventListener('mpd-owner-ready',()=>{if(state!=='error'&&storage.owner())session(storage.owner());});
 window.MPDWelcome={session,checking,fail,state:()=>state};
 if(storage.owner())session(storage.owner());else checking();
})();
