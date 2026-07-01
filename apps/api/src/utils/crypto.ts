import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.ENCRYPTION_KEY;

if (!SECRET_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

console.log('ENCRYPTION_KEY loaded:', SECRET_KEY.length, 'characters');

export function encrypt(text: string): string {
  if (!text) {
    console.log('WARNING: Attempting to encrypt empty text');
    return '';
  }
  const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  console.log('Encrypted text length:', text.length, '-> cipher length:', encrypted.length);
  return encrypted;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    console.log('WARNING: Attempting to decrypt empty ciphertext');
    return '';
  }
  console.log('Decrypting cipher length:', ciphertext.length);
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  console.log('Decrypted result length:', decrypted.length);
  return decrypted;
}
