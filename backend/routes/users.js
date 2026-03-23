const express = require("express");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const config = require("../config");
const authJwt = require("../middleware/authJwt");
const User = require("../models/User");
const { sendVerificationEmail } = require("../services/emailService");
const { verifyFirebaseToken } = require("../config/firebase");
const { uploadFile, uploadBuffer } = require("../services/cloudinary");
const {
  normalizeImageUrl,
} = require("../utils/uploads");

const router = express.Router();

// Google OAuth Client IDs
const WEB_CLIENT_ID = "149350867139-r5q67endg3ip9k024imq8oj07gf2700e.apps.googleusercontent.com";

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + config.emailVerifyTtlHours * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

const PUSH_TOKEN_TTL_DAYS = 90;
const PUSH_TOKEN_MAX_PER_USER = 8;

// Fetch Google user info using an OAuth access token
function fetchGoogleUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.googleapis.com",
        path: "/oauth2/v3/userinfo",
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => { raw += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode !== 200) {
              reject(new Error(parsed.error_description || parsed.error || "Google userinfo request failed"));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function prunePushTokens(tokens) {
  const now = Date.now();
  const maxAgeMs = PUSH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

  const active = Array.isArray(tokens)
    ? tokens.filter((entry) => {
      if (!entry?.token) return false;
      if (entry?.invalidatedAt) return false;
      const lastSeenMs = new Date(entry.lastSeenAt || 0).getTime();
      return Number.isFinite(lastSeenMs) && now - lastSeenMs <= maxAgeMs;
    })
    : [];

  active.sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime());
  return active.slice(0, PUSH_TOKEN_MAX_PER_USER);
}

router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const isAdmin = toBoolean(req.body.isAdmin);

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "name, email, password, and phone are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const image = req.file ? await uploadFile(req.file, "users") : "";
    const verification = config.requireEmailVerification ? createEmailVerificationToken() : null;

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      phone: String(phone).trim(),
      image,
      isAdmin,
      emailVerified: config.requireEmailVerification ? false : true,
      emailVerificationTokenHash: verification ? verification.tokenHash : "",
      emailVerificationExpiresAt: verification ? verification.expiresAt : null,
    });

    let emailSent = true;
    let emailErrorMessage = "";

    if (verification) {
      const verificationUrl = `${config.appBaseUrl}${config.apiPrefix}/users/verify-email?token=${verification.token}`;
      try {
        await sendVerificationEmail({
          to: user.email,
          name: user.name,
          verificationUrl,
        });
      } catch (emailError) {
        // Keep the account so the user can request a resend after DNS/SMTP issues are fixed.
        emailSent = false;
        emailErrorMessage = String(emailError?.message || "Failed to send verification email");
      }
    }

    const userJson = user.toJSON();
    userJson.image = normalizeImageUrl(req, userJson.image);

    return res.status(201).json({
      success: true,
      emailSent,
      message: verification
        ? (emailSent
          ? "Registration successful. Please verify your email before logging in."
          : "Registration successful, but we could not send the verification email yet. Use resend verification after Mailtrap DNS is ready.")
        : "Registration successful.",
      emailError: emailErrorMessage,
      user: userJson,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user" });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(200).json({ success: true, message: "Email is already verified" });
    }

    const verification = createEmailVerificationToken();
    user.emailVerificationTokenHash = verification.tokenHash;
    user.emailVerificationExpiresAt = verification.expiresAt;
    await user.save();

    const verificationUrl = `${config.appBaseUrl}${config.apiPrefix}/users/verify-email?token=${verification.token}`;
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl,
    });

    return res.status(200).json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to send verification email. ${error?.message || "Check Mailtrap configuration."}`,
    });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Verification link is invalid or expired" });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = "";
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to verify email" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (config.requireEmailVerification && !user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    return res.status(200).json({ token, user: payload });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to login" });
  }
});

// GET /users/wallet/me — current user's mock wallet balance
router.get("/wallet/me", authJwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      walletBalance: Number(user.walletBalance || 0),
      walletLastUpdatedAt: user.walletLastUpdatedAt || null,
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load wallet" });
  }
});

async function walletTopupHandler(req, res) {
  try {
    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    if (amount > 100000) {
      return res.status(400).json({ message: "amount is too large for mock top-up" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $inc: { walletBalance: amount },
        $set: { walletLastUpdatedAt: new Date() },
      },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      walletBalance: Number(updatedUser.walletBalance || 0),
      toppedUp: amount,
    });
  } catch (error) {
    console.error("[POST /users/wallet/topup] Error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to top up wallet" });
  }
}

// POST /users/wallet/topup — user-facing top-up endpoint (mock implementation)
router.post("/wallet/topup", authJwt, walletTopupHandler);

// POST /users/wallet/mock-topup — backward-compatible mock endpoint
router.post("/wallet/mock-topup", authJwt, walletTopupHandler);

// GET /users/search - search for users (excludes current user and banned/disabled users)
router.get("/search", authJwt, async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.userId;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Query must be at least 2 characters" });
    }

    const searchRegex = new RegExp(query, "i");

    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        { $or: [{ isBanned: false }, { isBanned: { $exists: false } }] },
        { $or: [{ isDisabled: false }, { isDisabled: { $exists: false } }] },
        {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
          ],
        },
      ],
    })
      .select("id name email image isAdmin")
      .limit(20);

    const usersWithNormalizedImage = users.map((user) => {
      const userJson = user.toJSON();
      userJson.image = normalizeImageUrl(req, userJson.image);
      return userJson;
    });

    return res.status(200).json({ users: usersWithNormalizedImage });
  } catch (error) {
    console.error("[GET /users/search] Error:", error.message);
    return res.status(500).json({ message: "Failed to search users" });
  }
});

router.get("/:id", authJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.userId;
    const requesterIsAdmin = req.user?.isAdmin === true;

    if (!requesterIsAdmin && requesterId !== id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userJson = user.toJSON();
    userJson.image = normalizeImageUrl(req, userJson.image);
    return res.status(200).json(userJson);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load user profile" });
  }
});

router.put("/profile", authJwt, async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "phone",
      "deliveryAddress1",
      "deliveryAddress2",
      "deliveryCity",
      "deliveryZip",
      "deliveryCountry",
      "deliveryLocation",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (typeof updates.name === "string") {
      updates.name = updates.name.trim();
    }
    if (typeof updates.phone === "string") {
      updates.phone = updates.phone.trim();
    }
    if (typeof updates.deliveryAddress1 === "string") {
      updates.deliveryAddress1 = updates.deliveryAddress1.trim();
    }
    if (typeof updates.deliveryAddress2 === "string") {
      updates.deliveryAddress2 = updates.deliveryAddress2.trim();
    }
    if (typeof updates.deliveryCity === "string") {
      updates.deliveryCity = updates.deliveryCity.trim();
    }
    if (typeof updates.deliveryZip === "string") {
      updates.deliveryZip = updates.deliveryZip.trim();
    }
    if (typeof updates.deliveryCountry === "string") {
      updates.deliveryCountry = updates.deliveryCountry.trim();
    }

    if (updates.deliveryLocation) {
      const { latitude, longitude } = updates.deliveryLocation;
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "deliveryLocation must include numeric latitude and longitude" });
      }

      updates.deliveryLocation = { latitude: lat, longitude: lng };
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userJson = user.toJSON();
    userJson.image = normalizeImageUrl(req, userJson.image);
    return res.status(200).json(userJson);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

// POST /users/profile/photo — update user profile photo (for better mobile compatibility)
router.post("/profile/photo", authJwt, upload.single("image"), async (req, res) => {
  try {
    console.log("[POST /profile/photo] Request received:", {
      userId: req.user?.userId,
      filePresent: !!req.file,
      fileName: req.file?.filename,
      uploadDir: config.uploadDir,
    });

    if (!req.file) {
      console.error("[POST /profile/photo] No image file provided");
      return res.status(400).json({ message: "No image file provided" });
    }

    console.log("[POST /profile/photo] Upload successful:", {
      userId: req.user.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
    });

    console.log("[POST /profile/photo] Uploading to Cloudinary...");

    const imageUrl = await uploadFile(req.file, "users");
    console.log("[POST /profile/photo] Cloudinary URL:", imageUrl);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { image: imageUrl },
      { new: true }
    );

    if (!user) {
      console.error("[POST /profile/photo] User not found:", req.user.userId);
      return res.status(404).json({ message: "User not found" });
    }

    const userJson = user.toJSON();
    userJson.image = normalizeImageUrl(req, userJson.image);
    console.log("[POST /profile/photo] User updated successfully:", {
      userId: userJson.id,
      email: userJson.email,
      image: userJson.image,
    });
    return res.status(200).json(userJson);
  } catch (error) {
    console.error("[POST /profile/photo] Error:", error.message, error.stack);
    return res.status(500).json({ 
      message: "Failed to update profile photo",
      error: error.message 
    });
  }
});

// POST /users/profile/photo-base64 — update user profile photo (base64 encoded for React Native)
router.post("/profile/photo-base64", authJwt, async (req, res) => {
  try {
    const { imageBase64, fileName } = req.body;
    
    console.log("[POST /profile/photo-base64] Request received:", {
      userId: req.user?.userId,
      hasImage: !!imageBase64,
      fileName: fileName || "photo.jpg",
    });

    if (!imageBase64) {
      console.error("[POST /profile/photo-base64] No image data provided");
      return res.status(400).json({ message: "No image data provided" });
    }

    // Convert base64 to buffer and upload to Cloudinary
    const imageBuffer = Buffer.from(imageBase64, "base64");
    
    console.log("[POST /profile/photo-base64] Uploading to Cloudinary...");

    const imageUrl = await uploadBuffer(imageBuffer, `${config.cloudinaryFolder}/users`);
    console.log("[POST /profile/photo-base64] Cloudinary URL:", imageUrl);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { image: imageUrl },
      { new: true }
    );

    if (!user) {
      console.error("[POST /profile/photo-base64] User not found:", req.user.userId);
      return res.status(404).json({ message: "User not found" });
    }

    const userJson = user.toJSON();
    userJson.image = normalizeImageUrl(req, userJson.image);
    console.log("[POST /profile/photo-base64] User updated successfully:", {
      userId: userJson.id,
      email: userJson.email,
      image: userJson.image,
    });
    return res.status(200).json(userJson);
  } catch (error) {
    console.error("[POST /profile/photo-base64] Error:", error.message, error.stack);
    return res.status(500).json({ 
      message: "Failed to update profile photo",
      error: error.message 
    });
  }
});

// POST /users/push-token — save device push token for the current user
router.post("/push-token", authJwt, async (req, res) => {
  try {
    const { token, type } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Push token is required" });
    }

    const rawToken = String(token).trim();
    const tokenType = User.normalizePushTokenType(rawToken, type);
    console.log(`[POST /push-token] Saving ${tokenType} push token for user ${req.user.userId}: ${rawToken.substring(0, 30)}...`);

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentTokens = Array.isArray(user.pushTokens) ? user.pushTokens : [];
    const now = new Date();
    const existingIndex = currentTokens.findIndex((entry) => String(entry?.token || "") === rawToken);

    if (existingIndex >= 0) {
      currentTokens[existingIndex] = {
        ...currentTokens[existingIndex].toObject?.(),
        token: rawToken,
        type: tokenType,
        lastSeenAt: now,
        invalidatedAt: null,
        invalidReason: "",
      };
    } else {
      currentTokens.push({
        token: rawToken,
        type: tokenType,
        lastSeenAt: now,
        invalidatedAt: null,
        invalidReason: "",
      });
    }

    user.pushTokens = prunePushTokens(currentTokens);
    // Keep legacy fields in sync for older code paths.
    user.pushToken = rawToken;
    user.pushTokenType = tokenType;
    await user.save();

    return res.status(200).json({
      success: true,
      activePushTokens: user.pushTokens.length,
    });
  } catch (error) {
    console.error('[POST /push-token] Error:', error.message);
    return res.status(500).json({ message: "Failed to save push token" });
  }
});

// POST /users/forgot-password — send password reset email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    // In a real implementation, you would:
    // 1. Generate a reset token
    // 2. Save it to database with expiry
    // 3. Send reset email with token
    // For now, we'll just return success
    
    console.log(`[POST /forgot-password] Password reset requested for: ${email}`);
    
    // TODO: Implement actual email sending with reset token
    // This would involve:
    // - Generating a unique reset token
    // - Saving it to user record in database
    // - Sending email with reset link containing token
    // - Setting token expiry (e.g., 1 hour)
    
    return res.status(200).json({ 
      message: "Password reset email sent successfully",
      // For development only, remove in production
      note: "Email sending not implemented yet. Add email service to complete."
    });

  } catch (error) {
    console.error('[POST /forgot-password] Error:', error.message);
    return res.status(500).json({ message: "Failed to send reset email" });
  }
});

// GET /users/notifications/test — test notification status and user tokens
router.get("/notifications/test", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        message: "userId query parameter is required",
        example: "/users/notifications/test?userId=USER_ID_HERE"
      });
    }

    const User = require("../models/User");
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const pushTokens = user.pushTokens || [];
    const activeTokens = pushTokens.filter(token => !token.invalidatedAt);
    const staleTokens = pushTokens.filter(token => token.invalidatedAt);

    return res.status(200).json({
      userId: userId,
      userName: user.name,
      email: user.email,
      pushTokenStatus: {
        totalTokens: pushTokens.length,
        activeTokens: activeTokens.length,
        staleTokens: staleTokens.length,
        tokens: pushTokens.map(token => ({
          type: token.type,
          lastSeenAt: token.lastSeenAt,
          createdAt: token.createdAt,
          isInvalidated: !!token.invalidatedAt,
          invalidReason: token.invalidReason || null,
          tokenPreview: token.token.substring(0, 20) + '...'
        }))
      },
      notificationEndpoints: {
        quiz: `${req.protocol}://${req.get('host')}/users/notifications/quiz`,
        product: `${req.protocol}://${req.get('host')}/users/notifications/details`,
        examplePayload: {
          quiz: {
            userId: userId,
            title: "Quiz Test",
            message: "Test quiz notification",
            discountCode: "TEST20"
          },
          product: {
            userId: userId,
            title: "Product Test", 
            message: "Test product notification",
            productId: "prod_test",
            discountAmount: "15%"
          }
        }
      },
      testInstructions: {
        backendTest: "Run: node test-push-notifications.js",
        frontendTest: "Check device for push notifications",
        logs: "Monitor backend console for push notification logs"
      }
    });

  } catch (error) {
    console.error('[GET /notifications/test] Error:', error.message);
    return res.status(500).json({ message: "Failed to check notification status" });
  }
});

// POST /users/notifications/quiz — send quiz promotion notifications
router.post("/notifications/quiz", async (req, res) => {
  try {
    const { userId, title, message, discountCode } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ message: "userId, title, and message are required" });
    }

    // Get user's push tokens
    const User = require("../models/User");
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const pushTokens = user.pushTokens || [];
    
    if (pushTokens.length === 0) {
      return res.status(200).json({ 
        message: "No push tokens found for this user",
        notificationSent: false
      });
    }

    // Create notification payload
    const notification = {
      to: pushTokens.map(token => token.token),
      sound: 'default',
      title: title || 'Quiz Promotion!',
      body: message || 'New quiz available with special discount!',
      data: {
        type: 'quiz_promotion',
        discountCode: discountCode || '',
        action: 'view_quiz',
        userId: userId
      },
      priority: 'high'
    };

    console.log(`[POST /notifications/quiz] Sending quiz notification to user ${userId}`);

    // In a real implementation, you would send via FCM/Expo push service
    // For now, we'll return success
    // TODO: Implement actual push notification sending via FCM/Expo

    return res.status(200).json({ 
      message: "Quiz notification sent successfully",
      notificationSent: true,
      tokensUsed: pushTokens.length,
      note: "Push notification service not implemented yet. Add FCM/Expo integration."
    });

  } catch (error) {
    console.error('[POST /notifications/quiz] Error:', error.message);
    return res.status(500).json({ message: "Failed to send notification" });
  }
});

// POST /users/notifications/details — send promotion detail notifications
router.post("/notifications/details", async (req, res) => {
  try {
    const { userId, title, message, productId, discountAmount } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ message: "userId, title, and message are required" });
    }

    // Get user's push tokens
    const User = require("../models/User");
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const pushTokens = user.pushTokens || [];
    
    if (pushTokens.length === 0) {
      return res.status(200).json({ 
        message: "No push tokens found for this user",
        notificationSent: false
      });
    }

    // Create notification payload
    const notification = {
      to: pushTokens.map(token => token.token),
      sound: 'default',
      title: title || 'Product Promotion!',
      body: message || 'Special discount on your favorite products!',
      data: {
        type: 'product_promotion',
        productId: productId || '',
        discountAmount: discountAmount || '',
        action: 'view_product',
        userId: userId
      },
      priority: 'high'
    };

    console.log(`[POST /notifications/details] Sending promotion notification to User ${userId}`);

    // TODO: Implement actual push notification sending via FCM/Expo

    return res.status(200).json({ 
      message: "Promotion notification sent successfully",
      notificationSent: true,
      tokensUsed: pushTokens.length,
      note: "Push notification service not implemented yet. Add FCM/Expo integration."
    });

  } catch (error) {
    console.error('[POST /notifications/details] Error:', error.message);
    return res.status(500).json({ message: "Failed to send notification" });
  }
});

// POST /users/push-token — save/update push tokens with stale token management
router.post("/push-token", async (req, res) => {
  try {
    const { token, type } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = jwt.decode(jwt);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get user
    const User = require("../models/User");
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Clean up stale tokens (remove tokens older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const validTokens = (user.pushTokens || []).filter(tokenEntry => {
      const tokenAge = new Date(tokenEntry.lastSeenAt || tokenEntry.createdAt);
      return tokenAge > thirtyDaysAgo && tokenEntry.invalidatedAt;
    });

    // Remove stale/invalidated tokens
    user.pushTokens = user.pushTokens.filter(tokenEntry => 
      !validTokens.includes(tokenEntry)
    );

    // Check if token already exists
    const existingToken = user.pushTokens.find(tokenEntry => 
      tokenEntry.token === token && 
      !tokenEntry.invalidatedAt
    );

    if (existingToken) {
      // Update last seen timestamp
      existingToken.lastSeenAt = new Date();
      console.log(`[POST /push-token] Updated existing token for user ${decoded.userId}`);
    } else {
      // Add new token
      user.pushTokens.push({
        token: token,
        type: type || 'expo',
        createdAt: new Date(),
        lastSeenAt: new Date(),
        invalidatedAt: null
      });
      console.log(`[POST /push-token] Added new token for user ${decoded.userId}`);
    }

    // Save updated user
    await user.save();

    console.log(`[POST /push-token] User ${decoded.userId} now has ${user.pushTokens.length} active tokens`);

    return res.status(200).json({
      success: true,
      message: "Push token saved successfully",
      activeTokens: user.pushTokens.length,
      staleTokensRemoved: validTokens.length
    });

  } catch (error) {
    console.error('[POST /push-token] Error:', error.message);
    return res.status(500).json({ message: "Failed to save push token" });
  }
});

// DELETE /users/push-token — remove one or all push tokens for the current user
router.delete("/push-token", authJwt, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const removeAll = req.body?.removeAll === true;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (removeAll) {
      user.pushTokens = [];
      user.pushToken = "";
      user.pushTokenType = "";
      await user.save();
      return res.status(200).json({ success: true, removed: "all" });
    }

    if (!token) {
      return res.status(400).json({ message: "token is required unless removeAll is true" });
    }

    user.pushTokens = (Array.isArray(user.pushTokens) ? user.pushTokens : [])
      .filter((entry) => String(entry?.token || "") !== token);

    if (String(user.pushToken || "") === token) {
      user.pushToken = "";
      user.pushTokenType = "";
    }

    await user.save();
    return res.status(200).json({ success: true, removed: token });
  } catch (error) {
    console.error('[DELETE /push-token] Error:', error.message);
    return res.status(500).json({ message: "Failed to remove push token" });
  }
});

// POST /users/login/google
router.post("/login/google", async (req, res) => {
  try {
    const rawToken = String(req.body?.accessToken || "").trim();
    if (!rawToken) {
      return res.status(400).json({ message: "accessToken is required" });
    }

    let googleUser;
    try {
      googleUser = await fetchGoogleUserInfo(rawToken);
    } catch (_err) {
      return res.status(401).json({ message: "Invalid or expired Google access token" });
    }

    const email = String(googleUser.email || "").trim().toLowerCase();
    if (!email || !googleUser.email_verified) {
      return res.status(400).json({ message: "Google account does not have a verified email" });
    }

    let user = await User.findOne({ email });

    if (user) {
      // Link to Google if not already done
      if (user.authProvider !== "google") {
        user.authProvider = "google";
        user.providerId = googleUser.sub || "";
        user.emailVerified = true;
        await user.save();
      }
    } else {
      // Create a new user — password is a random unusable hash
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      user = await User.create({
        name: String(googleUser.name || email.split("@")[0]).trim(),
        email,
        passwordHash,
        phone: "",
        authProvider: "google",
        providerId: googleUser.sub || "",
        emailVerified: true,
        image: googleUser.picture || "",
      });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    return res.status(200).json({ token, user: payload });
  } catch (err) {
    console.error("[POST /users/login/google] Error:", err.message);
    return res.status(500).json({ message: "Google login failed" });
  }
});

// GET /users/auth/google - Initiate Google OAuth for web
router.get("/auth/google", (req, res) => {
  const redirectUri = req.query.redirect_uri || req.headers.referer || "http://localhost:8081";
  
  // Store the frontend redirect URI in a state parameter
  const state = Buffer.from(JSON.stringify({ redirectUri })).toString("base64");
  
  // Detect if mobile (custom scheme) or web (http/https)
  const isMobile = !redirectUri.startsWith('http://') && !redirectUri.startsWith('https://');
  
  // Use appropriate redirect URI for Google
  // Mobile: use request host (IP address)
  // Web: use localhost (must match Google Cloud Console)
  let googleRedirectUri;
  if (isMobile) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `192.168.100.65:${config.port}`;
    googleRedirectUri = `${protocol}://${host}${config.apiPrefix}/users/auth/google/callback`;
  } else {
    googleRedirectUri = `http://localhost:4001${config.apiPrefix}/users/auth/google/callback`;
  }
  
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", WEB_CLIENT_ID || config.googleClientId);
  authUrl.searchParams.set("redirect_uri", googleRedirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  
  console.log("[GET /auth/google] Redirecting to Google OAuth");
  console.log("  - frontend redirect:", redirectUri);
  console.log("  - isMobile:", isMobile);
  console.log("  - google redirect_uri:", googleRedirectUri);
  console.log("  - client_id:", WEB_CLIENT_ID);
  console.log("  - FULL AUTH URL:", authUrl.toString());
  res.redirect(authUrl.toString());
});

// GET /users/auth/google/callback - Handle Google OAuth callback
router.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error("[GET /auth/google/callback] OAuth error:", error);
      return res.status(400).json({ message: "Google authentication failed", error });
    }
    
    if (!code) {
      return res.status(400).json({ message: "Authorization code not received" });
    }
    
    // Parse state to get the original redirect URI
    let frontendRedirectUri = "http://localhost:8081";
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      frontendRedirectUri = stateData.redirectUri || frontendRedirectUri;
    } catch (e) {
      console.error("[GET /auth/google/callback] Failed to parse state:", e.message);
    }
    
    // Detect if mobile and use appropriate redirect URI
    const isMobileCallback = !frontendRedirectUri.startsWith('http://') && !frontendRedirectUri.startsWith('https://');
    let googleRedirectUri;
    if (isMobileCallback) {
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host || `192.168.100.65:${config.port}`;
      googleRedirectUri = `${protocol}://${host}${config.apiPrefix}/users/auth/google/callback`;
    } else {
      googleRedirectUri = `http://localhost:4001${config.apiPrefix}/users/auth/google/callback`;
    }
    console.log("[GET /auth/google/callback] isMobile:", isMobileCallback, "using redirect_uri:", googleRedirectUri);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: WEB_CLIENT_ID || config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("[GET /auth/google/callback] Token exchange failed:", tokenData);
      return res.redirect(`${frontendRedirectUri}?error=${encodeURIComponent("Failed to exchange authorization code")}`);
    }
    
    // Get user info from Google
    const googleUser = await fetchGoogleUserInfo(tokenData.access_token);
    const email = String(googleUser.email || "").trim().toLowerCase();
    
    if (!email || !googleUser.email_verified) {
      return res.redirect(`${frontendRedirectUri}?error=${encodeURIComponent("Google account does not have a verified email")}`);
    }
    
    // Find or create user
    let user = await User.findOne({ email });
    
    if (user) {
      if (user.authProvider !== "google") {
        user.authProvider = "google";
        user.providerId = googleUser.sub || "";
        user.emailVerified = true;
        await user.save();
      }
    } else {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      user = await User.create({
        name: String(googleUser.name || email.split("@")[0]).trim(),
        email,
        passwordHash,
        phone: "",
        authProvider: "google",
        providerId: googleUser.sub || "",
        emailVerified: true,
        image: googleUser.picture || "",
      });
    }
    
    // Generate JWT
    const payload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };
    
    const jwtToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    
    console.log("[GET /auth/google/callback] Google login successful:", email);
    
    // Check if frontendRedirectUri is a custom scheme (mobile app)
    const isCustomScheme = !frontendRedirectUri.startsWith('http://') && !frontendRedirectUri.startsWith('https://');
    
    if (isCustomScheme) {
      // For mobile apps, return HTML that redirects to custom scheme
      const redirectUrl = `${frontendRedirectUri}?token=${jwtToken}`;
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting...</title>
  <script>
    window.location.href = "${redirectUrl}";
    setTimeout(() => {
      document.body.innerHTML = '<h2>Login successful!</h2><p>You can close this window and return to the app.</p>';
    }, 100);
  </script>
</head>
<body>
  <h2>Login successful!</h2>
  <p>Redirecting back to app...</p>
  <p>If you are not redirected, <a href="${redirectUrl}">click here</a></p>
</body>
</html>`);
    } else {
      // For web, redirect normally
      res.redirect(`${frontendRedirectUri}?token=${jwtToken}`);
    }
  } catch (err) {
    console.error("[GET /auth/google/callback] Error:", err.message);
    const fallbackUri = "http://localhost:8081";
    res.redirect(`${fallbackUri}?error=${encodeURIComponent("Google login failed")}`);
  }
});

// POST /users/auth/firebase - Mobile Google Sign-In via Firebase
router.post("/auth/firebase", async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token is required" });
    }
    
    // Verify Firebase ID token
    const decodedToken = await verifyFirebaseToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    
    if (!email) {
      return res.status(400).json({ message: "Google account does not have an email" });
    }
    
    const normalizedEmail = String(email).trim().toLowerCase();
    
    // Find or create user
    let user = await User.findOne({ email: normalizedEmail });
    
    if (user) {
      if (user.authProvider !== "google") {
        user.authProvider = "google";
        user.providerId = uid || "";
        user.emailVerified = true;
        await user.save();
      }
    } else {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      user = await User.create({
        name: String(name || email.split("@")[0]).trim(),
        email: normalizedEmail,
        passwordHash,
        phone: "",
        authProvider: "google",
        providerId: uid || "",
        emailVerified: true,
        image: picture || "",
      });
    }
    
    // Generate JWT
    const payload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };
    
    const jwtToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    
    console.log("[POST /auth/firebase] Firebase login successful:", normalizedEmail);
    
    return res.status(200).json({ 
      success: true,
      token: jwtToken, 
      user: payload 
    });
  } catch (err) {
    console.error("[POST /auth/firebase] Error:", err.message);
    return res.status(401).json({ message: "Firebase authentication failed", error: err.message });
  }
});

module.exports = router;
