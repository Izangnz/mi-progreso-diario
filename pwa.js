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
  const watchedWorkers = new WeakSet();

  function waitingUpdate() {
    const worker = registration?.waiting;
    return navigator.serviceWorker.controller && worker &&
      worker !== navigator.serviceWorker.controller && worker.state === "installed" ? worker : null;
  }

  function unfreeze() {
    clearTimeout(timeout);
    frozen.forEach(([element,disabled]) => { element.disabled = disabled; });
    frozen = [];
    applying = false;
    button.disabled = false;
  }
  function showUpdate() {
    const waiting = waitingUpdate();
    banner.hidden = !waiting;
    if (waiting && !applying) {
      message.textContent = "Nueva versión disponible. Puedes actualizar cuando termines.";
    }
  }
  function watchWorker(worker) {
    if (!worker || watchedWorkers.has(worker)) return;
    watchedWorkers.add(worker);
    // Esperar al siguiente turno para que registration.waiting refleje el estado nuevo.
    worker.addEventListener("statechange", () => setTimeout(showUpdate, 0));
  }
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type !== "UPDATE_BLOCKED") return;
    unfreeze();
    showUpdate();
    message.textContent = "Cierra las otras ventanas de esta aplicación y vuelve a pulsar Actualizar.";
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // No recargar automáticamente durante la primera instalación.
    const shouldReload = applying;
    unfreeze();
    banner.hidden = true;
    if (shouldReload) location.reload();
  });
  button.addEventListener("click", async () => {
    if (applying) return;
    if (!waitingUpdate()) { showUpdate(); return; }
    if (window.MPDLearning?.hasUnsavedChanges()) {
      message.textContent = "Tienes respuestas educativas sin guardar. Guárdalas antes de actualizar.";
      return;
    }
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
      await navigator.locks.request("mi-progreso-aprendizaje-v1", () => {});
      if (document.getElementById("savedStatus").textContent.startsWith("Aviso:")) {
        throw new Error("Hay un aviso de guardado. Resuélvelo antes de actualizar.");
      }
      const worker = waitingUpdate();
      if (!worker) { unfreeze(); showUpdate(); return; }
      worker.postMessage({type:"APPLY_UPDATE"});
      timeout = setTimeout(() => {
        unfreeze();
        showUpdate();
        message.textContent = "No se pudo completar la actualización. Puedes volver a intentarlo.";
      }, 15000);
    } catch (error) {
      unfreeze();
      showUpdate();
      message.textContent = error.message;
    }
  });
  navigator.serviceWorker.register("./sw.js", {scope:"./",updateViaCache:"none"}).then(reg => {
    registration = reg;
    watchWorker(reg.waiting);
    watchWorker(reg.installing);
    showUpdate();
    reg.addEventListener("updatefound", () => {
      watchWorker(reg.installing);
      showUpdate();
    });
    const check = () => {
      if (document.hidden) return;
      showUpdate();
      if (navigator.onLine) reg.update().then(showUpdate).catch(console.warn);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    check();
  }).catch(error => console.warn("No se pudo preparar el modo sin conexión:", error));
})();
