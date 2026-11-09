/* Controlador estable inerte. No consulta ni envía datos de hábitos a Cloud. */
(() => {
 const CLOUD_ENABLED = false;
 const $=id=>document.getElementById(id);
 async function run(){
  const panel=$('sync-panel');if(panel)panel.hidden=true;
  const status=$('sync-status'),summary=$('cloud-sync-summary');
  if(status)status.textContent='Guardado localmente. Sin sincronización entre dispositivos.';
  if(summary)summary.textContent='Guardado localmente. Sin sincronización entre dispositivos.';
  for(const id of ['sync-retry','sync-versions','sync-restore','sync-review-accept','sync-accept']){const button=$(id);if(button)button.disabled=true;}
  return CLOUD_ENABLED;
 }
 window.MPDHabitSync=Object.freeze({connect:()=>run(),run,isRunning:()=>false,enabled:()=>false});
 window.addEventListener('mpd-owner-ready',run);
 run();
})();
