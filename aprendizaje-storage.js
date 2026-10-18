/* Almacenamiento educativo independiente. Nunca accede a la clave de hábitos. */
(() => {
  const KEY = "mi-progreso-aprendizaje-v1";
  const dictionary = value => value && typeof value === "object" && !Array.isArray(value);
  function read() {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return {version:1,answers:{},completed:{}};
    const data = JSON.parse(raw);
    if (!dictionary(data) || data.version !== 1 || !dictionary(data.answers) || !dictionary(data.completed) ||
        !Object.values(data.answers).every(answer => dictionary(answer) && typeof answer.text === "string" &&
          typeof answer.revision === "string" && typeof answer.updatedAt === "string") ||
        !Object.values(data.completed).every(value => typeof value === "boolean")) {
      throw new Error("No se pueden leer tus datos educativos. No se han sustituido ni borrado.");
    }
    return data;
  }
  function validId(id) {
    if (typeof id !== "string" || !/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(id)) {
      throw new Error("Identificador educativo no válido.");
    }
  }
  async function update(change) {
    if (!navigator.locks?.request) {
      throw new Error("No se puede guardar con seguridad entre ventanas. Usa una versión actual de Safari.");
    }
    return navigator.locks.request(KEY, () => {
      const next = read();
      change(next);
      // Una única escritura. Si falla, no se confirma el guardado en la interfaz.
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }
  window.MPDLearningStore = Object.freeze({
    key:KEY, read,
    saveAnswer(id,text,expectedRevision) {
      validId(id);
      if (typeof text !== "string" || !text.trim() || text.length > 4000) {
        return Promise.reject(new Error("Escribe una respuesta de entre 1 y 4000 caracteres."));
      }
      return update(next => {
        const current = next.answers[id];
        if ((current?.revision ?? null) !== expectedRevision) {
          throw new Error("Esta respuesta cambió en otra ventana. Tu borrador sigue aquí; consulta la versión guardada antes de editarla.");
        }
        next.answers[id] = {text,revision:crypto.randomUUID(),updatedAt:new Date().toISOString()};
      });
    },
    setCompleted(id,value) {
      validId(id);
      if (typeof value !== "boolean") return Promise.reject(new Error("Estado no válido."));
      return update(next => { next.completed[id] = value; });
    }
  });
})();
