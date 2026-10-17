/* Instalación y actualizaciones: no lee ni escribe localStorage. */
(() => {
  if (!("serviceWorker" in navigator) || !window.isSecureContext || location.protocol === "file:") return;
  const banner = document.getElementById("pwaUpdate");
  const message = document.getElementById("pwaUpdateMessage");
  const button = document.getElementById("pwaUpdateButton");
  let registration;
  let applying = false;
  let frozen = [];
  let timeout;

  function unfreeze() {
    clearTimeout(timeout);
    frozen.forEach(([element,disabled]) => { element.disabled = disabled; });
    frozen = [];
    applying = false;
    button.disabled = false;
  }
  function showUpdate() {
    if (!registration?.waiting) return;
    banner.hidden = false;
    message.textContent = "Nueva versión disponible. Puedes actualizar cuando termines.";
  }
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type !== "UPDATE_BLOCKED") return;
    unfreeze();
    message.textContent = "Cierra las otras ventanas de esta aplicación y vuelve a pulsar Actualizar.";
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // No recargar automáticamente durante la primera instalación.
    if (applying) location.reload();
  });
  button.addEventListener("click", async () => {
    if (applying || !registration?.waiting) return;
    applying = true;
    button.disabled = true;
    // Evitar nuevas ediciones mientras esperamos los guardados ya solicitados.
    frozen = Array.from(document.querySelectorAll("main input, main textarea, main button, nav button"))
      .filter(element => element !== button).map(element => [element, element.disabled]);
    frozen.forEach(([element]) => { element.disabled = true; });
    try {
      if (!navigator.locks?.request) throw new Error("No se puede comprobar el fin del guardado.");
      // Solo espera el mismo bloqueo que usa la aplicación; no modifica el almacenamiento.
      await navigator.locks.request("mi-panel-habitos-v1", () => {});
      if (document.getElementById("savedStatus").textContent.startsWith("Aviso:")) {
        throw new Error("Hay un aviso de guardado. Resuélvelo antes de actualizar.");
      }
      if (!registration.waiting) { unfreeze(); showUpdate(); return; }
      registration.waiting.postMessage({type:"APPLY_UPDATE"});
      timeout = setTimeout(() => {
        unfreeze();
        message.textContent = "No se pudo completar la actualización. Puedes volver a intentarlo.";
      }, 15000);
    } catch (error) {
      unfreeze();
      message.textContent = error.message;
    }
  });
  navigator.serviceWorker.register("./sw.js", {scope:"./",updateViaCache:"none"}).then(reg => {
    registration = reg;
    showUpdate();
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed") showUpdate();
      });
    });
    const check = () => { if (!document.hidden && navigator.onLine) reg.update().catch(console.warn); };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    check();
  }).catch(error => console.warn("No se pudo preparar el modo sin conexión:", error));
})();
