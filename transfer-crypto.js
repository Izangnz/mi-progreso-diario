/* El código de apertura se genera y se mantiene separado del archivo. */
(() => {
  const format = 'progressmate-encrypted-transfer';
  const encoder = new TextEncoder();
  const context = encoder.encode(format + ':1');
  function base64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return btoa(binary);
  }
  const fromBase64 = text => Uint8Array.from(atob(text), char => char.charCodeAt(0));
  const importKey = (bytes, usage) => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [usage]);

  async function seal(text) {
    const rawKey = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await importKey(rawKey, 'encrypt');
    const encrypted = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:context}, key, encoder.encode(text));
    return {
      code: base64(rawKey).replaceAll('+', '-').replaceAll('/', '_').replace(/=$/, ''),
      contents: JSON.stringify({format, version:1, iv:base64(iv), ciphertext:base64(new Uint8Array(encrypted))})
    };
  }
  async function open(contents, code) {
    try {
      const file = JSON.parse(contents);
      const normalized = code.trim();
      if (file?.format !== format || file.version !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(normalized) ||
          typeof file.iv !== 'string' || file.iv.length !== 16 || typeof file.ciphertext !== 'string') throw Error();
      const rawKey = fromBase64(normalized.replaceAll('-', '+').replaceAll('_', '/') + '=');
      const iv = fromBase64(file.iv);
      if (iv.length !== 12) throw Error();
      const key = await importKey(rawKey, 'decrypt');
      const plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv, additionalData:context},
        key, fromBase64(file.ciphertext));
      return new TextDecoder('utf-8', {fatal:true}).decode(plaintext);
    } catch {
      throw Error('No se pudo abrir la copia. Comprueba el archivo y su código de apertura.');
    }
  }
  window.MPDTransferCrypto = Object.freeze({seal, open});
})();
