var getRandomValues = require("get-random-values");

export const randomBytes = (bytes: number) => {
  const b = Buffer.allocUnsafe(bytes);
  const n = b.byteLength;
  // For browser or web worker enviroment, use window.crypto.getRandomValues()
  // https://paragonie.com/blog/2016/05/how-generate-secure-random-numbers-in-various-programming-languages#js-csprng

  // limit of getRandomValues()
  // The requested length exceeds 65536 bytes.
  // https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues#exceptions
  const MAX_BYTES = 65536;
  for (let i = 0; i < n; i += MAX_BYTES) {
    getRandomValues(
      new Uint8Array(b.buffer, i + b.byteOffset, Math.min(n - i, MAX_BYTES))
    );
  }
  const randBz = new Uint8Array(
    b.buffer,
    b.byteOffset,
    b.byteLength / Uint8Array.BYTES_PER_ELEMENT
  );

  let randStr = "";
  for (let i = 0; i < bytes; i++) {
    randStr += ("00" + randBz[i].toString(16)).slice(-2);
  }

  return randStr;
};
