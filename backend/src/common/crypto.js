const crypto = require('crypto');
const config = require('./config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce standar untuk AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

function getKeyBuffer() {
  return Buffer.from(config.encryption.key, 'hex');
}

/**
 * Enkripsi data teks menggunakan algoritma AES-256-GCM.
 * Menghasilkan Buffer yang menggabungkan: [IV (12 byte) | Auth Tag (16 byte) | Ciphertext]
 * IV acak dibuat pada setiap pemanggilan sehingga ciphertext selalu berbeda meskipun input sama.
 *
 * @param {string} plaintext - Data teks yang akan dienkripsi (misal string JSON identitas)
 * @returns {Buffer} Buffer gabungan biner untuk disimpan pada kolom BYTEA PostgreSQL
 */
function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Plaintext harus berupa string');
  }

  const key = getKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Susun format paket: IV (12B) + Auth Tag (16B) + Ciphertext (sisa)
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Dekripsi data Buffer kembalian dari AES-256-GCM.
 * Memverifikasi keaslian ciphertext menggunakan Auth Tag dan mendekripsinya ke string utf8 asli.
 *
 * @param {Buffer|Uint8Array} cipherBuffer - Buffer yang memuat [IV | Auth Tag | Ciphertext]
 * @returns {string} Plaintext asli
 */
function decrypt(cipherBuffer) {
  if (!cipherBuffer) return null;

  const buffer = Buffer.isBuffer(cipherBuffer) ? cipherBuffer : Buffer.from(cipherBuffer);

  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Panjang cipher buffer tidak valid untuk AES-256-GCM');
  }

  const key = getKeyBuffer();
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encryptedText = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = {
  encrypt,
  decrypt,
};
