import * as crypto from 'crypto';

/**
 * AES-256-GCM encrypt/decrypt — kontrak lintas-service (Go ↔ iot-gtw).
 *
 * Format tersimpan (base64): base64( iv[12] || ciphertext || tag[16] )
 *  - Algoritma  : AES-256-GCM
 *  - Key        : 32 byte, dari env FORWARDING_ENC_KEY sebagai 64-char HEX
 *  - IV/nonce   : 12 byte acak per enkripsi (di depan)
 *  - Auth tag   : 16 byte (di belakang)
 *
 * Sisi Go WAJIB pakai format byte identik:
 *   nonce := 12 byte; ct := gcm.Seal(nil, nonce, plaintext, nil)  // ct sudah termasuk tag di belakang
 *   stored := base64( nonce || ct )
 * Dekripsi Go: buf; nonce=buf[:12]; gcm.Open(nil, nonce, buf[12:], nil)
 */

const IV_LEN = 12;
const TAG_LEN = 16;
const ALGO = 'aes-256-gcm';

function resolveKey(): Buffer {
  const raw = process.env.FORWARDING_ENC_KEY;
  if (!raw) {
    throw new Error('FORWARDING_ENC_KEY tidak diset (butuh 64-char hex = 32 byte)');
  }
  const key = Buffer.from(raw.trim(), 'hex');
  if (key.length !== 32) {
    throw new Error(
      `FORWARDING_ENC_KEY harus 32 byte (64 hex chars), dapat ${key.length} byte`,
    );
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString('base64');
}

export function decrypt(stored: string): string {
  if (!stored) return '';
  const key = resolveKey();
  const buf = Buffer.from(stored, 'base64');
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('Ciphertext terlalu pendek / rusak');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
