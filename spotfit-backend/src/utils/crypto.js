const CryptoJS = require('crypto-js');

const KEY = process.env.ENCRYPTION_KEY || 'default_key_change_in_production!!';

const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, KEY).toString();
};

const decrypt = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

const hash = (text) => {
  return CryptoJS.SHA256(text + KEY).toString();
};

module.exports = { encrypt, decrypt, hash };
