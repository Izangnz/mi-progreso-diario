/* Una práctica de campo opcional, sin catálogo ficticio ni recompensas educativas. */
window.MPDMissionContent=Object.freeze({
  id:"detective-de-problemas",title:"Detective de problemas",
  lessonKey:"emprendimiento-desde-cero/fundamentos/problema-antes-idea",
  steps:["Tu misión","Observa","Investiga","Reflexiona","Tu resultado"],
  activities:[
    {id:"observation",step:1,label:"¿Qué problema has observado y a quién afecta?",hint:"Describe una persona o grupo, una situación y una dificultad. Distingue lo observado de lo que supones. No escribas nombres ni datos personales.",reference:"problema"},
    {id:"investigation",step:2,label:"¿Cómo resuelve actualmente ese problema?",hint:"Si es apropiado y la persona quiere conversar, pregunta: «¿Qué hiciste la última vez?». Escucha sin ofrecer tu solución. Si aún no lo sabes, puedes dejarlo pendiente.",reference:"alternativa"},
    {id:"reflection",step:3,label:"¿Qué has aprendido sobre ese problema y qué investigarías después?",hint:"Separa hechos y suposiciones. Elige una pregunta o una pequeña acción para después. No necesitas haber hablado con nadie para reconocer lo que falta comprobar."}
  ],
  statuses:[{id:"asked",label:"He preguntado a alguien"},{id:"observed",label:"Solo lo he observado"},{id:"pending",label:"Todavía necesito investigarlo"}]
});
