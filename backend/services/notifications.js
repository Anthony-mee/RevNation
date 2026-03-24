const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const User = require("../models/User");

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;
  if (!config.fcmServiceAccountPath) {
    console.log("[notifications] Missing FCM_SERVICE_ACCOUNT_PATH, using Expo Push only");
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), config.fcmServiceAccountPath);
  if (!fs.existsSync(resolvedPath)) {
    console.log(`[notifications] Service account file not found: ${resolvedPath}, using Expo Push only`);
    return;
  }

  const serviceAccount = require(resolvedPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
  console.log("[notifications] Firebase Admin initialized successfully");
}

// Send via Firebase Cloud Messaging (for FCM device tokens from APK)
async function sendFCM(tokens, title, body, data) {
  initFirebase();
  if (!firebaseInitialized || tokens.length === 0) return [];

  const message = {
    tokens,
    notification: { title: title || "", body: body || "" },
    data: data || {},
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "default",
      },
    },
  };

  try {
    const result = await admin.messaging().sendEachForMulticast(message);
    console.log(`[notifications] FCM sent: ${result.successCount} success, ${result.failureCount} failed`);

    const staleCodes = new Set([
      "messaging/invalid-registration-token",
      "messaging/registration-token-not-registered",
      "messaging/mismatched-credential",
      "messaging/invalid-argument",
    ]);
    const staleTokens = [];

    for (let i = 0; i < result.responses.length; i += 1) {
      const response = result.responses[i];
      if (response?.success) continue;
      const code = response?.error?.code || "";
      if (staleCodes.has(code) && tokens[i]) {
        staleTokens.push(tokens[i]);
      }
    }

    return staleTokens;
  } catch (error) {
    console.warn("[notifications] FCM send error:", error.message);
    return [];
  }
}

// Send via Expo Push API (for Expo Push Tokens from Expo Go)
async function sendExpo(tokens, title, body, data) {
  if (tokens.length === 0) return [];

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: title || "",
    body: body || "",
    data: data || {},
    priority: 'high',
    channelId: 'default'
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    console.log(`[notifications] Expo push sent to ${tokens.length} token(s):`, JSON.stringify(result.data?.map(d => d.status) || result));
    console.log(`[notifications] Full Expo response:`, JSON.stringify(result, null, 2));

    const staleTokens = [];
    if (Array.isArray(result?.data)) {
      for (let i = 0; i < result.data.length; i += 1) {
        const item = result.data[i] || {};
        const detailsError = String(item?.details?.error || "");
        if (detailsError === "DeviceNotRegistered" && tokens[i]) {
          staleTokens.push(tokens[i]);
        }
      }
    }

    return staleTokens;
  } catch (error) {
    console.warn("[notifications] Expo push error:", error.message);
    return [];
  }
}

// Main function - routes tokens to the correct service
async function sendToTokens(tokens, payload) {
  if (!tokens || tokens.length === 0) return;

  const { title, body, data } = payload || {};

  // Separate tokens by type
  const fcmTokens = [];
  const expoTokens = [];

  for (const token of tokens) {
    if (typeof token === "object" && token.token) {
      // { token: "...", type: "fcm"|"expo" }
      if (token.type === "expo" || token.token.startsWith("ExponentPushToken")) {
        expoTokens.push(token.token);
      } else {
        fcmTokens.push(token.token);
      }
    } else if (typeof token === "string") {
      if (token.startsWith("ExponentPushToken")) {
        expoTokens.push(token);
      } else {
        fcmTokens.push(token);
      }
    }
  }

  console.log(`[notifications] Routing: ${fcmTokens.length} FCM, ${expoTokens.length} Expo`);

  const promises = [];
  if (fcmTokens.length > 0) promises.push(sendFCM(fcmTokens, title, body, data));
  if (expoTokens.length > 0) promises.push(sendExpo(expoTokens, title, body, data));

  const settled = await Promise.allSettled(promises);
  const staleTokens = [];

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    if (Array.isArray(result.value)) {
      staleTokens.push(...result.value);
    }
  }

  if (staleTokens.length > 0) {
    await User.removeInvalidPushTokens(staleTokens);
    console.log(`[notifications] Invalidated ${staleTokens.length} stale push token(s)`);
  }
}

module.exports = { sendToTokens };
