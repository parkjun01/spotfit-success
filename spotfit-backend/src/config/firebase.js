const admin = require('firebase-admin');

let initialized = false;

const initialize = () => {
  if (initialized) return;
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn('Firebase config missing — push notifications disabled');
    return;
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  initialized = true;
};

const sendPush = async (token, title, body, data = {}) => {
  if (!initialized) return null;
  try {
    const result = await admin.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      apns: { payload: { aps: { sound: 'default' } } },
      android: { notification: { sound: 'default' } },
    });
    return result;
  } catch (err) {
    console.error('FCM send error:', err.message);
    return null;
  }
};

const sendMulticast = async (tokens, title, body, data = {}) => {
  if (!initialized || !tokens.length) return null;
  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    tokens,
  };
  return admin.messaging().sendEachForMulticast(message);
};

module.exports = { initialize, sendPush, sendMulticast };
