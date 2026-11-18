/* Copias privadas entre orígenes. El archivo solo se lee y escribe en el dispositivo. */
(() => {
  const storage = window.MPDUserStorage;
  const $ = id => document.getElementById(id);
  const maximumSize = 64 * 1024 * 1024;
  const format = 'progressmate-local-transfer';
  const legacyKeys = ['mi-panel-habitos-v1', 'mi-progreso-perfil-v1', 'mi-progreso-aprendizaje-v1',
    'mi-aprendizaje-modalidades-v1', 'mi-progreso-misiones-v1'];
  const transferableLegacyKeys = legacyKeys.slice(2);
  const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const hashPattern = /^[a-f0-9]{64}$/;
  const recordName = /^(habits|profile|device-data|archive:[a-z0-9-]{1,100})$/;
  const photoName = /^(archive:)?[a-zA-Z0-9_-]{1,100}$/;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const fail = () => { throw Error('El archivo de ProgressMate no es válido o está incompleto.'); };
  const checksum = async text => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  };
  async function encodePhoto(blob) {
    if (!(blob instanceof Blob) || !photoTypes.includes(blob.type) || !blob.size || blob.size > 512 * 1024) fail();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let start = 0; start < bytes.length; start += 8192) {
      binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
    }
    return {type: blob.type, base64: btoa(binary)};
  }
  function decodePhoto(photo) {
    if (!object(photo) || !photoTypes.includes(photo.type) || typeof photo.base64 !== 'string' ||
        !photo.base64 || photo.base64.length > 699052) fail();
    const bytes = Uint8Array.from(atob(photo.base64), value => value.charCodeAt(0));
    if (!bytes.length || bytes.length > 512 * 1024) fail();
    return new Blob([bytes], {type: photo.type});
  }
  function validatePairs(pairs, pattern) {
    if (!Array.isArray(pairs)) fail();
    const seen = new Set();
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' ||
          !pattern.test(pair[0]) || seen.has(pair[0])) fail();
      seen.add(pair[0]);
    }
  }
  function validateDeviceData(entries) {
    if (!Array.isArray(entries)) fail();
    for (const entry of entries) {
      if (!object(entry) || !object(entry.values) ||
          Object.entries(entry.values).some(([name, value]) => !legacyKeys.includes(name) || typeof value !== 'string')) fail();
      if (entry.photo !== null) decodePhoto(entry.photo);
      if (entry.fingerprint !== null && (typeof entry.fingerprint !== 'string' || !hashPattern.test(entry.fingerprint))) fail();
    }
  }
  function validatePayload(data) {
    if (!object(data) || typeof data.uid !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.uid)) fail();
    validatePairs(data.records, recordName);
    validatePairs(data.photos, photoName);
    validatePairs(data.receipts, hashPattern);
    const photos = new Map(data.photos);
    if (data.receipts.some(([, at]) => at !== null && typeof at !== 'string')) fail();
    for (const [, photo] of photos) decodePhoto(photo);
    for (const [name, value] of data.records) {
      if (name === 'habits') storage.validateHabits(value, true);
      else if (name === 'profile') {
        if (typeof value !== 'string') fail();
        const profile = JSON.parse(value);
        if (!object(profile)) fail();
        storage.validateTransferProfile(profile);
        if (profile.photoId && !photos.has(profile.photoId)) fail();
      } else if (name === 'device-data') validateDeviceData(value);
      else if (!object(value) || (value.photoArchiveId != null && !photos.has(value.photoArchiveId))) fail();
    }
  }
  function restorePreviouslyUnassigned(data) {
    const records = new Map(data.records);
    const photos = new Map(data.photos);
    const receipts = new Map(data.receipts);
    const entries = records.get('device-data') ?? [];
    const candidates = entries.filter(entry => entry.fingerprint && !receipts.has(entry.fingerprint));
    // Con más de un original, preservar las copias sin elegir por el usuario.
    if (candidates.length !== 1) return data;
    const {values, photo, fingerprint} = candidates[0];
    const current = records.get('habits');
    const hasCurrent = current && (current.habits.length || current.weeklyGoal ||
      Object.entries(current.history).some(([day, entry]) => day !== current.day || entry.habits.length) ||
      ['deletedHabitIds', 'deletedHistoryDays', 'deletedHistoryEntries', 'importedLegacyHashes']
        .some(name => current[name]?.length));
    let incorporated = false;
    if (!hasCurrent && values[legacyKeys[0]]) {
      const habits = storage.validateHabits(JSON.parse(values[legacyKeys[0]]), true);
      records.set('habits', {...habits, importedLegacyHashes: [...new Set([...(habits.importedLegacyHashes ?? []), fingerprint])]});
      incorporated = true;
    }
    if (!records.has('profile') && values[legacyKeys[1]]) {
      const profile = JSON.parse(values[legacyKeys[1]]);
      if (!object(profile)) fail();
      storage.validateTransferProfile(profile);
      if (profile.photoId) {
        if (!photo) fail();
        let name = profile.photoId;
        while (photos.has(name)) name = crypto.randomUUID();
        photos.set(name, photo);
        profile.photoId = name;
      }
      records.set('profile', JSON.stringify(profile));
      incorporated = true;
    }
    // El original sigue accesible en futuras exportaciones de esta cuenta.
    if (incorporated) receipts.set(fingerprint, null);
    return {...data, records: [...records], photos: [...photos], receipts: [...receipts]};
  }
  function saveFile(text) {
    const file = new Blob([text], {type: 'application/json'});
    if (file.size > maximumSize) throw Error('La copia supera el tamaño admitido. Los datos siguen en este dispositivo.');
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ProgressMate-copia-local.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const download = $('transfer-download'), input = $('transfer-file'), apply = $('transfer-apply');
  const status = $('transfer-status'), includeDevice = $('transfer-device');
  const onward = $('transfer-onward'), code = $('transfer-import-code');
  const codePanel = $('transfer-code-panel'), exportedCode = $('transfer-export-code');
  const backupCrypto = window.MPDTransferCrypto;
  $('transfer-copy-code').addEventListener('click', async () => {
    try {
      if (!exportedCode.value) return;
      await navigator.clipboard.writeText(exportedCode.value);
      status.textContent = 'Código copiado. Guárdalo separado del archivo.';
    } catch {
      exportedCode.select();
      status.textContent = 'Copia el código seleccionado.';
    }
  });
  let pending = null, busy = false;
  const hasDeviceData = () => legacyKeys.some(name => localStorage.getItem(name) !== null);
  const render = () => {
    const signedIn = Boolean(storage.owner());
    download.disabled = input.disabled = code.disabled = busy || !signedIn;
    apply.hidden = !pending;
    apply.disabled = busy || !signedIn;
    includeDevice.disabled = busy || !signedIn;
    $('transfer-device-label').hidden = !signedIn || !hasDeviceData();
  };
  const reset = () => {
    pending = null;
    input.value = code.value = exportedCode.value = '';
    includeDevice.checked = false;
    onward.hidden = codePanel.hidden = true;
    status.textContent = '';
    render();
  };
  function verifyOwner(uid, epoch) {
    if (storage.owner() !== uid || storage.epoch() !== epoch) throw Error('La cuenta cambió. Vuelve a iniciar la operación.');
  }
  async function run(action, fallback) {
    if (busy || !storage.owner()) return;
    busy = true;
    const epoch = storage.epoch();
    render();
    try { await action(storage.owner(), epoch); }
    catch (error) { if (epoch === storage.epoch()) status.textContent = error instanceof SyntaxError || error instanceof DOMException ? fallback : (error.message || fallback); }
    finally { busy = false; render(); }
  }
  async function collectDeviceData(data) {
    if (!includeDevice.checked) return;
    const values = Object.fromEntries(transferableLegacyKeys.map(name => [name, localStorage.getItem(name)])
      .filter(([, value]) => value !== null));
    const legacy = await storage.legacy();
    let photo = null, fingerprint = null;
    if (legacy) {
      const result = await storage.legacyImportStatus(legacy);
      if (result.status === 'other') throw Error('Los hábitos anteriores pertenecen a otra cuenta de este navegador.');
      if (legacy.habitsRaw !== null) values[legacyKeys[0]] = legacy.habitsRaw;
      if (legacy.privateRaw !== null) values[legacyKeys[1]] = legacy.privateRaw;
      photo = legacy.blob ? await encodePhoto(legacy.blob) : null;
      fingerprint = legacy.fingerprint;
    }
    if (!Object.keys(values).length) return;
    let record = data.records.find(([name]) => name === 'device-data');
    if (!record) data.records.push(record = ['device-data', []]);
    const entry = {values, photo, fingerprint};
    if (!record[1].some(prior => JSON.stringify(prior) === JSON.stringify(entry))) record[1].push(entry);
  }
  download.addEventListener('click', () => run(async (uid, epoch) => {
    const data = await storage.exportAccount();
    await collectDeviceData(data);
    data.photos = await Promise.all(data.photos.map(async ([name, blob]) => [name, await encodePhoto(blob)]));
    validatePayload(data);
    const body = JSON.stringify(data);
    const digest = await checksum(body);
    const plain = JSON.stringify({format, version: 1, digest, data});
    if (new Blob([plain]).size > maximumSize * 0.74) throw Error('La copia supera el tamaño admitido. Los datos siguen en este dispositivo.');
    const backup = await backupCrypto.seal(plain);
    verifyOwner(uid, epoch);
    saveFile(backup.contents);
    exportedCode.value = backup.code;
    codePanel.hidden = false;
    status.textContent = 'Copia cifrada descargada. Guarda también su código para poder abrirla.';
    onward.hidden = location.origin !== 'https://izangnz.github.io';
  }, 'No se pudo descargar la copia.'));
  input.addEventListener('change', () => run(async (uid, epoch) => {
    const file = input.files[0];
    pending = null;
    input.value = '';
    if (!file) return;
    if (file.size > maximumSize) throw Error('La copia supera el tamaño admitido.');
    const unlock = code.value.trim();
    code.value = '';
    if (!unlock) throw Error('Introduce el código de apertura y vuelve a seleccionar el archivo.');
    const backup = JSON.parse(await backupCrypto.open(await file.text(), unlock));
    if (backup?.format !== format || backup.version !== 1 || typeof backup.digest !== 'string' ||
        !hashPattern.test(backup.digest) || await checksum(JSON.stringify(backup.data)) !== backup.digest) fail();
    validatePayload(backup.data);
    verifyOwner(uid, epoch);
    if (backup.data.uid !== uid) throw Error('Abre la misma cuenta con la que descargaste la copia.');
    const data = restorePreviouslyUnassigned(backup.data);
    validatePayload(data);
    const habits = data.records.find(([name]) => name === 'habits')?.[1];
    pending = {...backup, data};
    status.textContent = 'Copia lista: ' + (habits?.habits.length ?? 0) + ' hábitos y ' +
      Object.keys(habits?.history ?? {}).length + ' días de historial. Confirma para guardar en este navegador.';
  }, 'El archivo de ProgressMate no es válido o está incompleto.'));
  apply.addEventListener('click', () => run(async (uid, epoch) => {
    if (!pending) return;
    const {data, digest} = pending;
    await window.MPDVerifyTransferAccount(uid);
    verifyOwner(uid, epoch);
    const restored = {...data, photos: data.photos.map(([name, photo]) => [name, decodePhoto(photo)])};
    const result = await storage.importAccount(restored, digest);
    verifyOwner(uid, epoch);
    pending = null;
    status.textContent = result === 'imported' ? 'Copia importada en este navegador.' :
      result === 'already' ? 'Esta copia ya está importada.' :
      'Ya hay datos en este navegador. Se han conservado. Descarga una copia de ambos orígenes antes de decidir cuál usar.';
  }, 'No se pudo importar la copia.'));
  window.addEventListener('mpd-owner-lock', reset);
  window.addEventListener('mpd-owner-ready', render);
  render();
})();
