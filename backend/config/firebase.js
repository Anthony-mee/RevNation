const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Try to load service account from file or environment variable
let serviceAccount = null;
const serviceAccountPath = path.join(__dirname, "../firebase-service-account.json");

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = require("../firebase-service-account.json");
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (e) {
    console.warn("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON env var");
  }
}

// Initialize Firebase Admin SDK only if credentials are available
if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[Firebase] Admin SDK initialized");
  } else {
    console.warn("[Firebase] No service account found. Firebase features will be disabled.");
    // Initialize without credentials for development
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
    });
  }
}

const auth = admin.auth();

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
async function verifyFirebaseToken(idToken) {
  if (!serviceAccount) {
    throw new Error("Firebase service account not configured");
  }
  return await auth.verifyIdToken(idToken);
}

module.exports = {
  auth,
  verifyFirebaseToken,
  admin,
  isFirebaseConfigured: () => !!serviceAccount,
};
