/* Piloto independiente: ninguna escritura en hábitos, ejercicios o preferencias. */
(() => {
  const key="mi-progreso-misiones-v1",id="detective-de-problemas";
  const fields=["observation","investigation","reflection"];
  const initial=()=>({version:1,id,answers:{observation:"",investigation:"",reflection:""},investigationStatus:"pending",step:0,completed:false,revision:null,updatedAt:null});
  function validate(data){
    if(!data || data.version!==1 || data.id!==id || !data.answers ||
      !fields.every(field=>typeof data.answers[field]==="string" && data.answers[field].length<=4000) ||
      !["pending","observed","asked"].includes(data.investigationStatus) ||
      !Number.isInteger(data.step) || data.step<0 || data.step>4 || typeof data.completed!=="boolean" ||
      !(data.revision===null || typeof data.revision==="string") || !(data.updatedAt===null || typeof data.updatedAt==="string"))throw Error("No se pueden leer los datos de la misión. No se han sustituido.");
    return data;
  }
  function read(){const raw=localStorage.getItem(key);return raw===null ? initial() : validate(JSON.parse(raw));}
  async function save(draft,expectedRevision){
    if(!navigator.locks?.request)throw Error("Usa una versión actual de Safari para guardar con seguridad entre ventanas.");
    validate(draft);
    return navigator.locks.request(key,()=>{
      const current=read();
      if(current.revision!==expectedRevision)throw Error("La misión cambió en otra ventana. Tu borrador sigue aquí. Consulta la versión guardada antes de continuar.");
      if(draft.completed && (!draft.answers.observation.trim() || !draft.answers.reflection.trim()))throw Error("Guarda una observación y una reflexión antes de finalizar. Puedes dejar la investigación pendiente.");
      const next={version:1,id,answers:{...draft.answers},investigationStatus:draft.investigationStatus,step:draft.step,completed:draft.completed,revision:crypto.randomUUID(),updatedAt:new Date().toISOString()};
      localStorage.setItem(key,JSON.stringify(next));return next;
    });
  }
  window.MPDMissionStore=Object.freeze({key,read,save});
})();
