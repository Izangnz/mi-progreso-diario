/* Presentación opcional. Nunca lee/escribe hábitos ni sesiones. */
(() => {
 const $=id=>document.getElementById(id),storage=window.MPDUserStorage;
 let guest=false;
 function paint(visible){$('welcome-panel').hidden=!visible;$('application-shell').hidden=visible;}
 function session(user){if(user){guest=false;paint(false);}else paint(!guest);}
 $('welcome-guest').addEventListener('click',()=>{guest=true;paint(false);});
 window.addEventListener('mpd-owner-lock',()=>{guest=false;paint(true);});
 window.addEventListener('mpd-owner-ready',()=>session(storage.owner()));
 window.MPDWelcome={session};
 session(storage.owner());
})();
