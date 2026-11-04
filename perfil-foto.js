/* Fotografías privadas en IndexedDB. Nunca se envían a la red. */
(() => {
  let database;
  function open() {
    if (!database) database = new Promise((resolve,reject) => {
      if (!window.indexedDB) return reject(Error('Este navegador no permite guardar fotografías. Puedes usar un avatar.'));
      const request=window.indexedDB.open('mi-progreso-fotos-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('photos');
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
      request.onerror=()=>reject(Error('No se pudo abrir el almacenamiento de fotografías.'));
      request.onblocked=()=>reject(Error('Cierra otras ventanas para preparar las fotografías.'));
    }).catch(error=>{database=null;throw error;});
    return database;
  }
  async function transaction(mode,operation) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('photos',mode);const req=operation(tx.objectStore('photos'));
      tx.oncomplete=()=>resolve(req.result);tx.onerror=tx.onabort=()=>reject(Error('No se pudo guardar o recuperar la fotografía. Revisa el espacio disponible.'));
    });
  }
  async function compress(file) {
    if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('Selecciona una fotografía JPEG, PNG o WebP.');
    if (!file.size || file.size>10*1024*1024) throw Error('La fotografía debe ocupar menos de 10 MB.');
    const url=URL.createObjectURL(file);
    try {
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('No se pudo leer esta imagen. Prueba otra fotografía.'));img.src=url;});
      if(!image.naturalWidth || !image.naturalHeight || image.naturalWidth*image.naturalHeight>40000000) throw Error('La imagen tiene dimensiones demasiado grandes.');
      const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la fotografía.');
      ctx.fillStyle='#1c1e22';ctx.fillRect(0,0,512,512);
      const side=Math.min(image.naturalWidth,image.naturalHeight);
      ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,512,512);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.8));
      if(!blob || blob.size>512*1024)throw Error('No se pudo comprimir esta fotografía. Prueba otra.');
      return blob;
    } finally { URL.revokeObjectURL(url); }
  }
  window.MPDPhoto={compress,get:id=>transaction('readonly',store=>store.get(id)),put:blob=>{const id=crypto.randomUUID();return transaction('readwrite',store=>store.put(blob,id)).then(()=>id);},remove:id=>transaction('readwrite',store=>store.delete(id))};
})();
