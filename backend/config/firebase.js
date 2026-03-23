const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
async function verifyFirebaseToken(idToken) {
  return await auth.verifyIdToken(idToken);
}

module.exports = {
  auth,
  verifyFirebaseToken,
  admin,
};
