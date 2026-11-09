/* Versión estable: no existe transporte de hábitos a Cloud. */
(() => {
 window.MPDHabitTransport=Object.freeze({async open(){throw Error('Cloud Sync desactivado en la versión estable.');}});
})();
