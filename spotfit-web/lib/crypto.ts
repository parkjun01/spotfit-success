import CryptoJS from 'crypto-js';

const KEY = process.env.ENCRYPTION_KEY || 'default_key_change_in_production!!';

export const hash = (text: string) => CryptoJS.SHA256(text + KEY).toString();
export const encrypt = (text: string) => CryptoJS.AES.encrypt(text, KEY).toString();
export const decrypt = (cipher: string) =>
  CryptoJS.AES.decrypt(cipher, KEY).toString(CryptoJS.enc.Utf8);
