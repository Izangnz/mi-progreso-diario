/* Preferencias de navegación independientes de respuestas, progreso y hábitos. */
(() => {
  const key = "mi-aprendizaje-modalidades-v1";
  const modes = Object.freeze({guided:"Desde cero",quick:"Ir al grano",free:"Explorar libremente"});
  function read() {
    const raw=localStorage.getItem(key);
    if(raw===null)return {version:1,routes:{}};
    const data=JSON.parse(raw);
    if(!data || data.version!==1 || !data.routes || typeof data.routes!=="object" || Array.isArray(data.routes) ||
      !Object.values(data.routes).every(mode=>Object.hasOwn(modes,mode))) {
      throw new Error("No se pudieron leer las modalidades guardadas. No se han sustituido.");
    }
    return data;
  }
  window.MPDLearningPreferences=Object.freeze({key,modes,read,
    async save(routeId,mode) {
      if(!/^[a-z0-9-]+$/.test(routeId) || !Object.hasOwn(modes,mode))throw new Error("Modalidad no válida.");
      if(!navigator.locks?.request)throw new Error("El navegador no permite guardar la modalidad de forma segura.");
      return navigator.locks.request(key,()=>{
        const next=read();next.routes[routeId]=mode;
        localStorage.setItem(key,JSON.stringify(next));return next;
      });
    }
  });
})();
